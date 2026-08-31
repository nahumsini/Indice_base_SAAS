package com.indice.erp.consulting;

import com.indice.erp.auth.AuthSessionUser;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConsultingAppointmentService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Set<String> ALLOWED_ROLES = Set.of("root", "superadmin", "admin", "owner", "dueno");
    private static final Set<String> BASE_TOPICS = Set.of(
        "ONBOARDING", "BUSINESS_CONSULTING", "OPERATIONS", "PEOPLE", "SALES", "FINANCE", "OTHER"
    );
    private static final Set<String> MODES = Set.of("VIRTUAL", "IN_PERSON");
    private static final Set<String> CONSULTANT_PREFERENCES = Set.of("DISTRIBUTOR", "INDICE_TEAM");
    private static final Set<String> CANCELLABLE_STATUSES = Set.of("REQUESTED", "CONFIRMED", "PAYMENT_REQUIRED");
    private static final Duration JOIN_WINDOW_BEFORE = Duration.ofMinutes(15);
    private static final Duration JOIN_WINDOW_AFTER = Duration.ofMinutes(90);
    private static final int SESSION_DURATION_MINUTES = 60;

    private final JdbcTemplate jdbcTemplate;
    private final ConsultingAppointmentEmailService emailService;
    private final Clock clock;
    private final long additionalSessionAmountCents;

    public ConsultingAppointmentService(
        JdbcTemplate jdbcTemplate,
        ConsultingAppointmentEmailService emailService,
        Clock clock,
        @Value("${app.consulting.additional-session-amount-cents:7900}") long additionalSessionAmountCents
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.emailService = emailService;
        this.clock = clock;
        this.additionalSessionAmountCents = additionalSessionAmountCents;
    }

    public Map<String, Object> workspace(AuthSessionUser user) {
        requireAccess(user);
        var distributor = distributorRelationship(user.companyId());
        var response = new LinkedHashMap<String, Object>();
        response.put("duration_minutes", SESSION_DURATION_MINUTES);
        response.put("join_window_minutes", JOIN_WINDOW_BEFORE.toMinutes());
        response.put("included_session_available", includedSessionAvailable(
            user.companyId(), clock.instant(), ZoneId.of("UTC")
        ));
        response.put("additional_session_amount_cents", additionalSessionAmountCents);
        response.put("currency", "USD");
        response.put("contact", contact(user));
        response.put("distributor", distributor == null ? null : Map.of(
            "company_id", distributor.companyId(),
            "company_name", distributor.companyName()
        ));
        response.put("topics", topics());
        response.put("in_person_locations", serviceLocations(true));
        response.put("appointments", appointments(user.companyId()));
        return response;
    }

    @Transactional
    public Map<String, Object> create(AuthSessionUser user, BookingRequest request) {
        requireAccess(user);
        if (request == null) {
            throw new IllegalArgumentException("Booking details are required.");
        }
        var attendeeName = required(request.attendeeName(), "Attendee name", 160);
        var attendeeEmail = required(request.attendeeEmail(), "Attendee email", 190).toLowerCase(Locale.ROOT);
        if (!EMAIL.matcher(attendeeEmail).matches()) {
            throw new IllegalArgumentException("Enter a valid attendee email.");
        }
        var attendeePhone = required(request.attendeePhone(), "Attendee phone", 40);
        var distributor = distributorRelationship(user.companyId());
        var consultantPreference = validConsultantPreference(request.consultantPreference(), distributor);
        var topic = validTopic(request.topic());
        var notes = optional(request.notes(), 2000);
        var mode = required(request.consultationMode(), "Consultation mode", 24).toUpperCase(Locale.ROOT);
        if (!MODES.contains(mode)) {
            throw new IllegalArgumentException("Choose a valid consultation mode.");
        }

        var countryCode = optional(request.countryCode(), 2);
        countryCode = countryCode == null ? null : countryCode.toUpperCase(Locale.ROOT);
        ServiceLocation location = null;
        if ("IN_PERSON".equals(mode)) {
            location = requireActiveLocation(request.serviceLocationCode(), countryCode);
            countryCode = location.countryCode();
        }

        var timezone = location == null ? validTimezone(request.timezone()) : location.timezone();
        var preferred = validAppointmentTime(request.preferredStartAt(), timezone, "Preferred time");
        var alternative = request.alternativeStartAt() == null || request.alternativeStartAt().isBlank()
            ? null
            : validAppointmentTime(request.alternativeStartAt(), timezone, "Alternative time");
        if (alternative != null && alternative.equals(preferred)) {
            throw new IllegalArgumentException("Alternative time must be different from the preferred time.");
        }

        jdbcTemplate.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, user.companyId());
        var included = includedSessionAvailable(user.companyId(), preferred, ZoneId.of(timezone));
        var sessionKind = included ? "INCLUDED" : "ADDITIONAL";
        var status = "REQUESTED";
        var paymentStatus = included ? "INCLUDED" : "PENDING";
        Long amount = included ? null : additionalSessionAmountCents;
        var currency = "USD";
        var companyName = companyName(user.companyId());
        var serviceLocationCode = location == null ? null : location.code();
        var serviceLocationName = location == null ? null : location.displayName();

        var keyHolder = new GeneratedKeyHolder();
        var finalCountryCode = countryCode;
        var finalLocation = location;
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO consulting_appointments
                    (company_id, booked_by_user_id, consultant_preference,
                     requested_distributor_company_id, requested_distributor_name, request_source,
                     attendee_name, attendee_email, attendee_phone,
                     topic, notes, preferred_start_at, alternative_start_at, timezone, duration_minutes,
                     consultation_mode, country_code, service_location_code, service_location_name,
                     session_kind, status, payment_status, amount_cents, currency)
                    VALUES (?, ?, ?, ?, ?, 'CLIENT_PORTAL', ?, ?, ?, ?, ?, ?, ?, ?, 60, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setLong(1, user.companyId());
            statement.setLong(2, user.userId());
            statement.setString(3, consultantPreference);
            if (distributor == null) statement.setNull(4, java.sql.Types.BIGINT); else statement.setLong(4, distributor.companyId());
            statement.setString(5, distributor == null ? null : distributor.companyName());
            statement.setString(6, attendeeName);
            statement.setString(7, attendeeEmail);
            statement.setString(8, attendeePhone);
            statement.setString(9, topic);
            statement.setString(10, notes);
            statement.setTimestamp(11, Timestamp.from(preferred));
            setTimestamp(statement, 12, alternative);
            statement.setString(13, timezone);
            statement.setString(14, mode);
            statement.setString(15, finalCountryCode);
            statement.setString(16, serviceLocationCode);
            statement.setString(17, serviceLocationName);
            statement.setString(18, sessionKind);
            statement.setString(19, status);
            statement.setString(20, paymentStatus);
            if (amount == null) statement.setNull(21, java.sql.Types.BIGINT); else statement.setLong(21, amount);
            statement.setString(22, currency);
            return statement;
        }, keyHolder);
        var appointmentId = generatedId(keyHolder.getKey());

        var delivery = emailService.sendBookingRequest(new ConsultingAppointmentEmailService.BookingEmail(
            appointmentId,
            companyName,
            attendeeName,
            attendeeEmail,
            attendeePhone,
            topic,
            notes,
            preferred.toString(),
            alternative == null ? null : alternative.toString(),
            timezone,
            sessionKind,
            amount,
            currency,
            mode,
            finalLocation == null ? null : finalLocation.displayName(),
            finalLocation == null ? finalCountryCode : finalLocation.countryName()
        ));
        jdbcTemplate.update(
            "UPDATE consulting_appointments SET notification_status = ? WHERE id = ? AND company_id = ?",
            delivery.status(), appointmentId, user.companyId()
        );
        return appointment(user.companyId(), appointmentId);
    }

    static long generatedId(Number key) {
        if (key == null) {
            throw new IllegalStateException("The consulting request could not be created.");
        }
        return key.longValue();
    }

    @Transactional
    public Map<String, Object> cancel(AuthSessionUser user, long appointmentId, CancelRequest request) {
        requireAccess(user);
        var rows = jdbcTemplate.query(
            "SELECT status FROM consulting_appointments WHERE id = ? AND company_id = ? FOR UPDATE",
            (rs, rowNum) -> rs.getString("status"),
            appointmentId, user.companyId()
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Consulting appointment not found.");
        }
        if (!CANCELLABLE_STATUSES.contains(rows.getFirst())) {
            throw new IllegalStateException("This consulting appointment can no longer be cancelled.");
        }
        var reason = request == null ? null : optional(request.reason(), 500);
        jdbcTemplate.update(
            """
                UPDATE consulting_appointments
                SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP(6), cancellation_reason = ?
                WHERE id = ? AND company_id = ?
                """,
            reason, appointmentId, user.companyId()
        );
        return appointment(user.companyId(), appointmentId);
    }

    private Map<String, Object> contact(AuthSessionUser user) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(NULLIF(TRIM(profile.full_name), ''), NULLIF(TRIM(account.full_name), ''), account.email) AS full_name,
                       account.email,
                       COALESCE(profile.phone, '') AS phone
                FROM users account
                LEFT JOIN user_profiles profile ON profile.user_id = account.id
                WHERE account.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "name", rs.getString("full_name"),
                "email", rs.getString("email"),
                "phone", rs.getString("phone")
            ),
            user.userId()
        );
        return rows.isEmpty()
            ? Map.of("name", user.userName(), "email", "", "phone", "")
            : rows.getFirst();
    }

    private List<Map<String, Object>> topics() {
        var result = new ArrayList<Map<String, Object>>();
        result.add(topic("ONBOARDING", "Implementación inicial de Índice", "🚀", "service"));
        result.add(topic("BUSINESS_CONSULTING", "Consultoría de negocios", "🧭", "service"));
        result.addAll(jdbcTemplate.query(
            """
                SELECT slug, name, icon
                FROM modules
                WHERE is_active = 1 AND CHAR_LENGTH(slug) <= 52
                ORDER BY FIELD(module_category, 'basic', 'complementary', 'ai'), sort_order, name
                """,
            (rs, rowNum) -> topic(
                "MODULE:" + rs.getString("slug"),
                rs.getString("name"),
                rs.getString("icon"),
                "module"
            )
        ));
        result.add(topic("OTHER", "Otro reto de tu empresa", "💬", "service"));
        return result;
    }

    private Map<String, Object> topic(String value, String label, String emoji, String category) {
        var row = new LinkedHashMap<String, Object>();
        row.put("value", value);
        row.put("label", label);
        row.put("emoji", emoji == null || emoji.isBlank() ? "🧩" : emoji);
        row.put("category", category);
        return row;
    }

    private String validTopic(String value) {
        var topic = required(value, "Topic", 60).toUpperCase(Locale.ROOT);
        if (BASE_TOPICS.contains(topic)) return topic;
        if (!topic.startsWith("MODULE:")) {
            throw new IllegalArgumentException("Choose a valid consulting topic.");
        }
        var slug = topic.substring("MODULE:".length()).toLowerCase(Locale.ROOT);
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM modules WHERE LOWER(slug) = ? AND is_active = 1",
            Long.class,
            slug
        );
        if (count == null || count == 0) {
            throw new IllegalArgumentException("Choose a valid consulting module.");
        }
        return "MODULE:" + slug;
    }

    private List<Map<String, Object>> serviceLocations(boolean activeOnly) {
        var condition = activeOnly ? "WHERE active = 1" : "";
        return jdbcTemplate.query(
            """
                SELECT id, location_code, country_code, country_name, region_name, city_name, timezone,
                       active, in_person_fee_cents, currency
                FROM consulting_service_locations
                %s
                ORDER BY sort_order, country_name, city_name
                """.formatted(condition),
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("location_code", rs.getString("location_code"));
                row.put("country_code", rs.getString("country_code"));
                row.put("country_name", rs.getString("country_name"));
                row.put("region_name", rs.getString("region_name"));
                row.put("city_name", rs.getString("city_name"));
                row.put("timezone", rs.getString("timezone"));
                row.put("active", rs.getBoolean("active"));
                var fee = rs.getObject("in_person_fee_cents");
                row.put("in_person_fee_cents", fee == null ? null : ((Number) fee).longValue());
                row.put("currency", rs.getString("currency"));
                return row;
            }
        );
    }

    private ServiceLocation requireActiveLocation(String rawCode, String countryCode) {
        var code = required(rawCode, "In-person city", 48).toUpperCase(Locale.ROOT);
        var rows = jdbcTemplate.query(
            """
                SELECT location_code, country_code, country_name, region_name, city_name, timezone,
                       in_person_fee_cents, currency
                FROM consulting_service_locations
                WHERE UPPER(location_code) = ? AND active = 1
                LIMIT 1
                """,
            (rs, rowNum) -> new ServiceLocation(
                rs.getString("location_code"),
                rs.getString("country_code"),
                rs.getString("country_name"),
                rs.getString("region_name"),
                rs.getString("city_name"),
                rs.getString("timezone"),
                rs.getObject("in_person_fee_cents") == null ? null : rs.getLong("in_person_fee_cents"),
                rs.getString("currency")
            ),
            code
        );
        if (rows.isEmpty() || (countryCode != null && !countryCode.equalsIgnoreCase(rows.getFirst().countryCode()))) {
            throw new IllegalArgumentException("In-person consulting is not available in that city yet.");
        }
        return rows.getFirst();
    }

    private List<Map<String, Object>> appointments(long companyId) {
        return jdbcTemplate.query(appointmentSelect() + " WHERE company_id = ? ORDER BY created_at DESC, id DESC LIMIT 50",
            (rs, rowNum) -> appointmentRow(rs), companyId);
    }

    private Map<String, Object> appointment(long companyId, long appointmentId) {
        var rows = jdbcTemplate.query(
            appointmentSelect() + " WHERE company_id = ? AND id = ? LIMIT 1",
            (rs, rowNum) -> appointmentRow(rs), companyId, appointmentId
        );
        if (rows.isEmpty()) throw new NoSuchElementException("Consulting appointment not found.");
        return rows.getFirst();
    }

    private String appointmentSelect() {
        return """
            SELECT id, consultant_preference, requested_distributor_company_id,
                   requested_distributor_name, request_source,
                   attendee_name, attendee_email, attendee_phone, topic, notes,
                   preferred_start_at, alternative_start_at, timezone, duration_minutes,
                   consultation_mode, country_code, service_location_code, service_location_name,
                   session_kind, status, payment_status, amount_cents, currency,
                   confirmed_start_at, meeting_url, consultant_name, consultant_email,
                   consultant_phone, notification_status, cancelled_at, completed_at, created_at
            FROM consulting_appointments
            """;
    }

    private Map<String, Object> appointmentRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        var row = new LinkedHashMap<String, Object>();
        var status = rs.getString("status");
        var confirmedStart = rs.getTimestamp("confirmed_start_at");
        var meetingUrl = rs.getString("meeting_url");
        var joinAvailable = isJoinAvailable(status, confirmedStart, meetingUrl);
        row.put("id", rs.getLong("id"));
        row.put("consultant_preference", rs.getString("consultant_preference"));
        var distributorCompanyId = rs.getObject("requested_distributor_company_id");
        row.put("requested_distributor_company_id", distributorCompanyId == null ? null : ((Number) distributorCompanyId).longValue());
        row.put("requested_distributor_name", rs.getString("requested_distributor_name"));
        row.put("request_source", rs.getString("request_source"));
        row.put("attendee_name", rs.getString("attendee_name"));
        row.put("attendee_email", rs.getString("attendee_email"));
        row.put("attendee_phone", rs.getString("attendee_phone"));
        row.put("topic", rs.getString("topic"));
        row.put("notes", rs.getString("notes"));
        row.put("preferred_start_at", instant(rs.getTimestamp("preferred_start_at")));
        row.put("alternative_start_at", instant(rs.getTimestamp("alternative_start_at")));
        row.put("timezone", rs.getString("timezone"));
        row.put("duration_minutes", rs.getInt("duration_minutes"));
        row.put("consultation_mode", rs.getString("consultation_mode"));
        row.put("country_code", rs.getString("country_code"));
        row.put("service_location_code", rs.getString("service_location_code"));
        row.put("service_location_name", rs.getString("service_location_name"));
        row.put("session_kind", rs.getString("session_kind"));
        row.put("status", status);
        row.put("payment_status", rs.getString("payment_status"));
        var amount = rs.getObject("amount_cents");
        row.put("amount_cents", amount == null ? null : ((Number) amount).longValue());
        row.put("currency", rs.getString("currency"));
        row.put("confirmed_start_at", instant(confirmedStart));
        row.put("meeting_url", joinAvailable ? meetingUrl : null);
        row.put("meeting_url_configured", meetingUrl != null && !meetingUrl.isBlank());
        row.put("meeting_link_available", joinAvailable);
        row.put("join_available_at", confirmedStart == null ? null : confirmedStart.toInstant().minus(JOIN_WINDOW_BEFORE).toString());
        row.put("consultant_name", rs.getString("consultant_name"));
        row.put("consultant_email", rs.getString("consultant_email"));
        row.put("consultant_phone", rs.getString("consultant_phone"));
        row.put("notification_status", rs.getString("notification_status"));
        row.put("cancelled_at", instant(rs.getTimestamp("cancelled_at")));
        row.put("completed_at", instant(rs.getTimestamp("completed_at")));
        row.put("created_at", instant(rs.getTimestamp("created_at")));
        return row;
    }

    private boolean isJoinAvailable(String status, Timestamp confirmedStart, String meetingUrl) {
        if (!"CONFIRMED".equals(status) || confirmedStart == null || meetingUrl == null || meetingUrl.isBlank()) return false;
        var now = clock.instant();
        var start = confirmedStart.toInstant();
        return !now.isBefore(start.minus(JOIN_WINDOW_BEFORE)) && !now.isAfter(start.plus(JOIN_WINDOW_AFTER));
    }

    private boolean includedSessionAvailable(long companyId, Instant appointmentTime, ZoneId timezone) {
        if (!hasIncludedConsultingBenefit(companyId)) return false;
        var period = consultationMonth(appointmentTime, timezone);
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM consulting_appointments
                WHERE company_id = ? AND session_kind = 'INCLUDED' AND status <> 'CANCELLED'
                  AND COALESCE(confirmed_start_at, preferred_start_at) >= ?
                  AND COALESCE(confirmed_start_at, preferred_start_at) < ?
                """,
            Long.class, companyId, Timestamp.from(period.startsAt()), Timestamp.from(period.endsAt())
        );
        return count == null || count == 0;
    }

    private boolean hasIncludedConsultingBenefit(long companyId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            """
                SELECT EXISTS (
                    SELECT 1
                    FROM company_billing_subscriptions subscription
                    WHERE subscription.company_id = ?
                      AND LOWER(subscription.status) IN ('trialing', 'active', 'past_due')
                    UNION ALL
                    SELECT 1
                    FROM company_trial_product_grants trial
                    WHERE trial.company_id = ? AND trial.status = 'ACTIVE'
                      AND trial.starts_at <= CURRENT_TIMESTAMP(6)
                      AND trial.ends_at > CURRENT_TIMESTAMP(6)
                    UNION ALL
                    SELECT 1
                    FROM company_benefit_grants benefit
                    WHERE benefit.company_id = ? AND benefit.benefit_type = 'PRODUCT'
                      AND benefit.status = 'ACTIVE'
                      AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                      AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
                )
                """,
            Boolean.class,
            companyId,
            companyId,
            companyId
        ));
    }

    static ConsultationMonth consultationMonth(Instant appointmentTime, ZoneId timezone) {
        var localMonth = ZonedDateTime.ofInstant(appointmentTime, timezone)
            .withDayOfMonth(1)
            .toLocalDate()
            .atStartOfDay(timezone);
        return new ConsultationMonth(localMonth.toInstant(), localMonth.plusMonths(1).toInstant());
    }

    private DistributorRelationship distributorRelationship(long clientCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT distributor.id, distributor.name
                FROM companies client
                JOIN companies distributor ON distributor.id = client.distributor_company_id
                WHERE client.id = ?
                  AND distributor.id <> client.id
                  AND distributor.commercial_account_type = 'DISTRIBUTOR'
                LIMIT 1
                """,
            (rs, rowNum) -> new DistributorRelationship(rs.getLong("id"), rs.getString("name")),
            clientCompanyId
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private String validConsultantPreference(String value, DistributorRelationship distributor) {
        var preference = value == null || value.isBlank()
            ? "INDICE_TEAM"
            : value.trim().toUpperCase(Locale.ROOT);
        if (!CONSULTANT_PREFERENCES.contains(preference)) {
            throw new IllegalArgumentException("Choose a valid consultant preference.");
        }
        if ("DISTRIBUTOR".equals(preference) && distributor == null) {
            throw new IllegalArgumentException("Your company does not have an active distributor assigned.");
        }
        return preference;
    }

    private String companyName(long companyId) {
        var rows = jdbcTemplate.query("SELECT name FROM companies WHERE id = ? LIMIT 1", (rs, rowNum) -> rs.getString("name"), companyId);
        return rows.isEmpty() ? "Company #" + companyId : rows.getFirst();
    }

    private Instant validAppointmentTime(String value, String timezone, String label) {
        final Instant instant;
        try {
            instant = Instant.parse(required(value, label, 80));
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(label + " is invalid.");
        }
        var now = clock.instant();
        if (instant.isBefore(now.plus(Duration.ofHours(24)))) throw new IllegalArgumentException(label + " must be at least 24 hours from now.");
        if (instant.isAfter(now.plus(Duration.ofDays(90)))) throw new IllegalArgumentException(label + " must be within the next 90 days.");
        var local = instant.atZone(ZoneId.of(timezone));
        if (local.getDayOfWeek() == DayOfWeek.SATURDAY || local.getDayOfWeek() == DayOfWeek.SUNDAY) {
            throw new IllegalArgumentException(label + " must be Monday through Friday.");
        }
        var time = local.toLocalTime();
        if (time.isBefore(LocalTime.of(9, 0)) || time.isAfter(LocalTime.of(16, 0)) || time.getMinute() != 0) {
            throw new IllegalArgumentException(label + " must start on the hour from 9:00 to 16:00.");
        }
        return instant;
    }

    private String validTimezone(String value) {
        var timezone = required(value, "Timezone", 80);
        try { ZoneId.of(timezone); } catch (RuntimeException exception) { throw new IllegalArgumentException("Choose a valid timezone."); }
        return timezone;
    }

    private void requireAccess(AuthSessionUser user) {
        var role = user.role() == null ? "" : user.role().trim().toLowerCase(Locale.ROOT);
        role = switch (role) { case "super admin" -> "superadmin"; case "dueño" -> "dueno"; default -> role; };
        if (!ALLOWED_ROLES.contains(role)) throw new SecurityException("Only company management can schedule consulting sessions.");
    }

    private String required(String value, String label, int maxLength) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) throw new IllegalArgumentException(label + " is required.");
        if (normalized.length() > maxLength) throw new IllegalArgumentException(label + " is too long.");
        return normalized;
    }

    private String optional(String value, int maxLength) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.length() > maxLength) throw new IllegalArgumentException("The provided value is too long.");
        return normalized.isBlank() ? null : normalized;
    }

    private void setTimestamp(java.sql.PreparedStatement statement, int index, Instant value) throws java.sql.SQLException {
        if (value == null) statement.setNull(index, java.sql.Types.TIMESTAMP); else statement.setTimestamp(index, Timestamp.from(value));
    }

    private String instant(Timestamp timestamp) { return timestamp == null ? null : timestamp.toInstant().toString(); }

    private record ServiceLocation(
        String code,
        String countryCode,
        String countryName,
        String regionName,
        String cityName,
        String timezone,
        Long feeCents,
        String currency
    ) {
        String displayName() {
            return regionName == null || regionName.isBlank() ? cityName : cityName + ", " + regionName;
        }
    }

    private record DistributorRelationship(long companyId, String companyName) {
    }

    record ConsultationMonth(Instant startsAt, Instant endsAt) {
    }

    public record BookingRequest(
        String attendeeName,
        String attendeeEmail,
        String attendeePhone,
        String consultantPreference,
        String topic,
        String notes,
        String preferredStartAt,
        String alternativeStartAt,
        String timezone,
        String consultationMode,
        String countryCode,
        String serviceLocationCode
    ) {
    }

    public record CancelRequest(String reason) {
    }
}
