package com.indice.erp.consulting;

import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConsultingAdministrationService {

    private static final Set<String> STATUSES = Set.of("REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW");
    private static final Set<String> PAYMENT_STATUSES = Set.of("INCLUDED", "QUOTE_PENDING", "PENDING", "PAID", "WAIVED", "REFUNDED");
    private static final Set<String> CHARGED_PAYMENT_STATUSES = Set.of("QUOTE_PENDING", "PENDING", "PAID", "REFUNDED");
    private static final long PAID_CONSULTATION_AMOUNT_CENTS = 7_900L;
    private static final String CONSULTATION_CURRENCY = "USD";
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern HTTPS_URL = Pattern.compile("^https://[^\\s]+$", Pattern.CASE_INSENSITIVE);

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService access;
    private final PlatformAuditService audit;
    private final ConsultingAppointmentEmailService emailService;
    private final Clock clock;

    public ConsultingAdministrationService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService access,
        PlatformAuditService audit,
        ConsultingAppointmentEmailService emailService,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.access = access;
        this.audit = audit;
        this.emailService = emailService;
        this.clock = clock;
    }

    public Map<String, Object> workspace(long actorUserId) {
        access.require(actorUserId, "PLATFORM_VIEW");
        var appointments = jdbcTemplate.query(
            """
                SELECT appointment.id, appointment.company_id, company.name AS company_name,
                       appointment.booked_by_user_id, account.email AS booked_by_email,
                       appointment.consultant_preference,
                       appointment.requested_distributor_company_id,
                       appointment.requested_distributor_name, appointment.request_source,
                       appointment.attendee_name, appointment.attendee_email, appointment.attendee_phone,
                       appointment.topic, appointment.notes, appointment.preferred_start_at,
                       appointment.alternative_start_at, appointment.timezone, appointment.duration_minutes,
                       appointment.consultation_mode, appointment.country_code,
                       appointment.service_location_code, appointment.service_location_name,
                       appointment.session_kind, appointment.status, appointment.payment_status,
                       appointment.amount_cents, appointment.currency, appointment.confirmed_start_at,
                       appointment.meeting_url, appointment.consultant_name, appointment.consultant_email,
                       appointment.consultant_phone, appointment.internal_notes, appointment.notification_status,
                       appointment.cancelled_at, appointment.cancellation_reason, appointment.completed_at,
                       appointment.created_at, appointment.updated_at
                FROM consulting_appointments appointment
                JOIN companies company ON company.id = appointment.company_id
                JOIN users account ON account.id = appointment.booked_by_user_id
                ORDER BY FIELD(appointment.status, 'REQUESTED', 'CONFIRMED', 'PAYMENT_REQUIRED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'),
                         COALESCE(appointment.confirmed_start_at, appointment.preferred_start_at), appointment.created_at DESC
                LIMIT 500
                """,
            (rs, rowNum) -> adminAppointmentRow(rs)
        );
        return workspaceResponse(appointments);
    }

    public Map<String, Object> workspaceForDistributorAfterAuthorization(long distributorCompanyId) {
        var appointments = jdbcTemplate.query(
            """
                SELECT appointment.id, appointment.company_id, company.name AS company_name,
                       appointment.booked_by_user_id, account.email AS booked_by_email,
                       appointment.consultant_preference,
                       appointment.requested_distributor_company_id,
                       appointment.requested_distributor_name, appointment.request_source,
                       appointment.attendee_name, appointment.attendee_email, appointment.attendee_phone,
                       appointment.topic, appointment.notes, appointment.preferred_start_at,
                       appointment.alternative_start_at, appointment.timezone, appointment.duration_minutes,
                       appointment.consultation_mode, appointment.country_code,
                       appointment.service_location_code, appointment.service_location_name,
                       appointment.session_kind, appointment.status, appointment.payment_status,
                       appointment.amount_cents, appointment.currency, appointment.confirmed_start_at,
                       appointment.meeting_url, appointment.consultant_name, appointment.consultant_email,
                       appointment.consultant_phone, appointment.internal_notes, appointment.notification_status,
                       appointment.cancelled_at, appointment.cancellation_reason, appointment.completed_at,
                       appointment.created_at, appointment.updated_at
                FROM consulting_appointments appointment
                JOIN companies company ON company.id = appointment.company_id
                JOIN users account ON account.id = appointment.booked_by_user_id
                WHERE company.id <> ?
                  AND UPPER(COALESCE(company.commercial_account_type, '')) = 'SUPER_ADMIN'
                  AND (
                      company.distributor_company_id = ?
                      OR (
                          company.distributor_company_id IS NULL
                          AND company.created_by_distributor_company_id = ?
                      )
                  )
                ORDER BY FIELD(appointment.status, 'REQUESTED', 'CONFIRMED', 'PAYMENT_REQUIRED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'),
                         COALESCE(appointment.confirmed_start_at, appointment.preferred_start_at), appointment.created_at DESC
                LIMIT 500
                """,
            (rs, rowNum) -> adminAppointmentRow(rs),
            distributorCompanyId,
            distributorCompanyId,
            distributorCompanyId
        );
        return workspaceResponse(appointments);
    }

    public Map<String, Object> consultantAvailability(long actorUserId, String consultantEmail) {
        access.require(actorUserId, "PLATFORM_VIEW");
        var consultant = requireAvailabilityConsultant(consultantEmail);
        return consultantAvailabilityAfterAuthorization(consultant);
    }

    @Transactional
    public Map<String, Object> updateConsultantAvailability(
        long actorUserId,
        AvailabilityUpdateRequest request
    ) {
        access.require(actorUserId, "PLATFORM_CONSULTING_WRITE");
        if (request == null) throw new IllegalArgumentException("Availability details are required.");
        var consultant = requireAvailabilityConsultant(request.consultantEmail());
        var timezone = required(request.timezone(), "Timezone", 80);
        try {
            ZoneId.of(timezone);
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Choose a valid timezone.");
        }
        if (request.days() == null || request.days().size() != 7) {
            throw new IllegalArgumentException("Configure all seven days of the week.");
        }

        var uniqueDays = new HashSet<Integer>();
        for (var day : request.days()) {
            if (day == null || day.dayOfWeek() < 1 || day.dayOfWeek() > 7 || !uniqueDays.add(day.dayOfWeek())) {
                throw new IllegalArgumentException("Each day of the week must be configured once.");
            }
            var enabled = Boolean.TRUE.equals(day.enabled());
            LocalTime start = null;
            LocalTime end = null;
            if (enabled) {
                start = parseAvailabilityTime(day.startTime(), "Start time");
                end = parseAvailabilityTime(day.endTime(), "End time");
                if (!start.isBefore(end)) {
                    throw new IllegalArgumentException("The end time must be later than the start time.");
                }
            }
            jdbcTemplate.update(
                """
                    INSERT INTO consulting_consultant_availability
                    (consultant_email, day_of_week, consultant_name, timezone, enabled,
                     start_time, end_time, updated_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                      consultant_name = VALUES(consultant_name),
                      timezone = VALUES(timezone),
                      enabled = VALUES(enabled),
                      start_time = VALUES(start_time),
                      end_time = VALUES(end_time),
                      updated_by_user_id = VALUES(updated_by_user_id),
                      updated_at = CURRENT_TIMESTAMP(6)
                    """,
                consultant.email(),
                day.dayOfWeek(),
                consultant.name(),
                timezone,
                enabled,
                start == null ? null : java.sql.Time.valueOf(start),
                end == null ? null : java.sql.Time.valueOf(end),
                actorUserId
            );
        }

        audit.record(
            actorUserId,
            "CONSULTING_AVAILABILITY_UPDATED",
            "CONSULTING_CONSULTANT",
            consultant.email(),
            null,
            "SUCCESS",
            Map.of("consultant", consultant.name(), "timezone", timezone)
        );
        return consultantAvailabilityAfterAuthorization(consultant);
    }

    private Map<String, Object> workspaceResponse(List<Map<String, Object>> appointments) {
        var locations = locations();
        var now = clock.instant();
        var requested = appointments.stream().filter(row -> "REQUESTED".equals(row.get("status"))).count();
        var confirmed = appointments.stream().filter(row -> "CONFIRMED".equals(row.get("status"))).count();
        var upcoming = appointments.stream().filter(row -> {
            if (!"CONFIRMED".equals(row.get("status"))) return false;
            var value = row.get("confirmed_start_at");
            return value instanceof String text && Instant.parse(text).isAfter(now);
        }).count();
        var response = new LinkedHashMap<String, Object>();
        response.put("totals", Map.of(
            "appointments", appointments.size(),
            "requested", requested,
            "confirmed", confirmed,
            "upcoming", upcoming
        ));
        response.put("appointments", appointments);
        response.put("locations", locations);
        response.put("consultants", consultants());
        return response;
    }

    @Transactional
    public Map<String, Object> createConsultant(long actorUserId, ConsultantCreateRequest request) {
        access.require(actorUserId, "PLATFORM_CONSULTING_WRITE");
        if (request == null) throw new IllegalArgumentException("Consultant details are required.");
        var firstName = required(request.firstName(), "First name", 100);
        var lastName = required(request.lastName(), "Last name", 100);
        var phone = required(request.phone(), "Phone", 40);
        var email = required(request.email(), "Email", 190).toLowerCase(Locale.ROOT);
        if (!EMAIL.matcher(email).matches()) throw new IllegalArgumentException("Enter a valid consultant email.");
        var duplicate = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM consulting_consultants WHERE LOWER(email) = LOWER(?)",
            Long.class,
            email
        );
        if (duplicate != null && duplicate > 0) throw new IllegalArgumentException("A consultant with this email already exists.");
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                "INSERT INTO consulting_consultants (first_name, last_name, phone, email, created_by_user_id) VALUES (?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setString(1, firstName);
            statement.setString(2, lastName);
            statement.setString(3, phone);
            statement.setString(4, email);
            statement.setLong(5, actorUserId);
            return statement;
        }, keyHolder);
        var consultantId = generatedId(keyHolder.getKey(), "The consultant could not be created.");
        audit.record(actorUserId, "CONSULTING_CONSULTANT_CREATED", "CONSULTING_CONSULTANT", String.valueOf(consultantId), null,
            "SUCCESS", Map.of("email", email));
        return consultant(consultantId);
    }

    @Transactional
    public Map<String, Object> createLocation(long actorUserId, LocationCreateRequest request) {
        access.require(actorUserId, "PLATFORM_CONSULTING_WRITE");
        if (request == null) throw new IllegalArgumentException("Coverage details are required.");
        var city = required(request.cityName(), "City", 120);
        var region = required(request.regionName(), "Region", 120);
        var country = required(request.countryName(), "Country", 80);
        var countryCode = required(request.countryCode(), "Country code", 2).toUpperCase(Locale.ROOT);
        var timezone = required(request.timezone(), "Timezone", 80);
        try { ZoneId.of(timezone); } catch (RuntimeException exception) { throw new IllegalArgumentException("Choose a valid timezone."); }
        var currency = required(request.currency(), "Currency", 3).toUpperCase(Locale.ROOT);
        var code = uniqueLocationCode(countryCode, city);
        var nextOrder = jdbcTemplate.queryForObject(
            "SELECT COALESCE(MAX(sort_order), 0) + 10 FROM consulting_service_locations",
            Integer.class
        );
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO consulting_service_locations
                    (location_code, country_code, country_name, region_name, city_name, timezone, active, currency, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setString(1, code);
            statement.setString(2, countryCode);
            statement.setString(3, country);
            statement.setString(4, region);
            statement.setString(5, city);
            statement.setString(6, timezone);
            statement.setString(7, currency);
            statement.setInt(8, nextOrder == null ? 100 : nextOrder);
            return statement;
        }, keyHolder);
        var locationId = generatedId(keyHolder.getKey(), "The coverage could not be created.");
        audit.record(actorUserId, "CONSULTING_LOCATION_CREATED", "CONSULTING_LOCATION", String.valueOf(locationId), null,
            "SUCCESS", Map.of("location_code", code));
        return location(locationId);
    }

    @Transactional
    public Map<String, Object> createAppointment(long actorUserId, AdminAppointmentCreateRequest request) {
        access.require(actorUserId, "PLATFORM_CONSULTING_WRITE");
        return createAppointmentAfterAuthorization(
            actorUserId, request, "INDICE_TEAM", "PLATFORM_ADMIN", null, null, null
        );
    }

    @Transactional
    public Map<String, Object> createDistributorAppointmentAfterAuthorization(
        long actorUserId,
        long distributorCompanyId,
        String distributorCompanyName,
        AdminAppointmentCreateRequest request
    ) {
        return createAppointmentAfterAuthorization(
            actorUserId,
            request,
            "DISTRIBUTOR",
            "DISTRIBUTOR_PORTAL",
            distributorCompanyId,
            distributorCompanyName,
            distributorConsultant(actorUserId)
        );
    }

    private Map<String, Object> createAppointmentAfterAuthorization(
        long actorUserId,
        AdminAppointmentCreateRequest request,
        String consultantPreference,
        String requestSource,
        Long requestedDistributorCompanyId,
        String requestedDistributorName,
        ConsultantAssignment assignedConsultant
    ) {
        if (request == null) throw new IllegalArgumentException("Session details are required.");
        var companyId = request.companyId();
        var companyName = jdbcTemplate.query(
            "SELECT name FROM companies WHERE id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("name"),
            companyId
        );
        if (companyName.isEmpty()) throw new NoSuchElementException("Client account not found.");
        var attendeeName = required(request.attendeeName(), "Attendee name", 160);
        var attendeeEmail = required(request.attendeeEmail(), "Attendee email", 190).toLowerCase(Locale.ROOT);
        if (!EMAIL.matcher(attendeeEmail).matches()) throw new IllegalArgumentException("Enter a valid attendee email.");
        var attendeePhone = optional(request.attendeePhone(), 40);
        var topic = required(request.topic(), "Topic", 60).toUpperCase(Locale.ROOT);
        var mode = required(request.consultationMode(), "Consultation mode", 24).toUpperCase(Locale.ROOT);
        if (!Set.of("VIRTUAL", "IN_PERSON").contains(mode)) throw new IllegalArgumentException("Choose a valid consultation mode.");
        var timezone = required(request.timezone(), "Timezone", 80);
        try { ZoneId.of(timezone); } catch (RuntimeException exception) { throw new IllegalArgumentException("Choose a valid timezone."); }
        var startAt = parseInstant(request.startAt(), "Session time", false);
        if (startAt == null || !startAt.isAfter(clock.instant())) throw new IllegalArgumentException("Choose a future session time.");
        var consultantName = assignedConsultant == null
            ? required(request.consultantName(), "Consultant", 160)
            : assignedConsultant.name();
        var consultantEmail = assignedConsultant == null
            ? required(request.consultantEmail(), "Consultant email", 190).toLowerCase(Locale.ROOT)
            : assignedConsultant.email();
        if (!EMAIL.matcher(consultantEmail).matches()) throw new IllegalArgumentException("Enter a valid consultant email.");
        var consultantPhone = assignedConsultant == null
            ? optional(request.consultantPhone(), 40)
            : assignedConsultant.phone();
        var meetingUrl = optional(request.meetingUrl(), 2000);
        if (meetingUrl != null && !HTTPS_URL.matcher(meetingUrl).matches()) {
            throw new IllegalArgumentException("Meeting link must use HTTPS.");
        }
        var locationCode = optional(request.serviceLocationCode(), 48);
        var locationName = optional(request.serviceLocationName(), 120);
        var countryCode = optional(request.countryCode(), 2);
        if ("IN_PERSON".equals(mode) && locationCode == null) throw new IllegalArgumentException("Choose an in-person coverage location.");
        var duration = request.durationMinutes() == null ? 60 : request.durationMinutes();
        if (!Set.of(30, 60, 90).contains(duration)) throw new IllegalArgumentException("Choose a valid session duration.");
        requireAvailableConsultingWindow(consultantEmail, startAt, duration);

        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO consulting_appointments
                    (company_id, booked_by_user_id, consultant_preference,
                     requested_distributor_company_id, requested_distributor_name, request_source,
                     attendee_name, attendee_email, attendee_phone, topic, preferred_start_at, timezone,
                     duration_minutes, consultation_mode, country_code, service_location_code, service_location_name,
                     session_kind, status, payment_status, currency, confirmed_start_at, meeting_url,
                     consultant_name, consultant_email, consultant_phone, admin_updated_by_user_id, confirmed_at,
                     notification_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                            'INCLUDED', 'CONFIRMED', 'INCLUDED', 'USD', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(6), 'PENDING')
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setLong(1, companyId);
            statement.setLong(2, actorUserId);
            statement.setString(3, consultantPreference);
            if (requestedDistributorCompanyId == null) statement.setObject(4, null);
            else statement.setLong(4, requestedDistributorCompanyId);
            statement.setString(5, requestedDistributorName);
            statement.setString(6, requestSource);
            statement.setString(7, attendeeName);
            statement.setString(8, attendeeEmail);
            statement.setString(9, attendeePhone);
            statement.setString(10, topic);
            statement.setTimestamp(11, Timestamp.from(startAt));
            statement.setString(12, timezone);
            statement.setInt(13, duration);
            statement.setString(14, mode);
            statement.setString(15, countryCode == null ? null : countryCode.toUpperCase(Locale.ROOT));
            statement.setString(16, locationCode);
            statement.setString(17, locationName);
            statement.setTimestamp(18, Timestamp.from(startAt));
            statement.setString(19, meetingUrl);
            statement.setString(20, consultantName);
            statement.setString(21, consultantEmail);
            statement.setString(22, consultantPhone);
            statement.setLong(23, actorUserId);
            return statement;
        }, keyHolder);
        var appointmentId = generatedId(keyHolder.getKey(), "The session could not be created.");
        var delivery = emailService.sendStatusUpdate(new ConsultingAppointmentEmailService.StatusEmail(
            appointmentId, companyName.getFirst(), attendeeName, attendeeEmail, "CONFIRMED", startAt.toString(),
            mode, locationName, consultantName
        ));
        jdbcTemplate.update("UPDATE consulting_appointments SET notification_status = ? WHERE id = ?", delivery.status(), appointmentId);
        audit.record(actorUserId, "CONSULTING_APPOINTMENT_CREATED", "CONSULTING_APPOINTMENT", String.valueOf(appointmentId), companyId,
            "SUCCESS", Map.of("request_source", requestSource, "consultant", consultantName));
        return appointmentAfterAuthorization(appointmentId);
    }

    private ConsultantAssignment distributorConsultant(long actorUserId) {
        return jdbcTemplate.query(
            """
                SELECT COALESCE(NULLIF(TRIM(profile.full_name), ''),
                                NULLIF(TRIM(account.full_name), ''),
                                account.email) AS consultant_name,
                       LOWER(account.email) AS consultant_email,
                       COALESCE(profile.phone, '') AS consultant_phone
                FROM users account
                LEFT JOIN user_profiles profile ON profile.user_id = account.id
                WHERE account.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new ConsultantAssignment(
                required(rs.getString("consultant_name"), "Consultant", 160),
                required(rs.getString("consultant_email"), "Consultant email", 190),
                optional(rs.getString("consultant_phone"), 40)
            ),
            actorUserId
        ).stream().findFirst().orElseThrow(() ->
            new NoSuchElementException("The distributor user could not be found.")
        );
    }

    @Transactional
    public Map<String, Object> updateAppointment(long actorUserId, long appointmentId, AppointmentUpdateRequest request) {
        access.require(actorUserId, "PLATFORM_CONSULTING_WRITE");
        return updateAppointmentAfterAuthorization(actorUserId, appointmentId, request, true);
    }

    @Transactional
    public Map<String, Object> updateDistributorAppointmentAfterAuthorization(
        long actorUserId,
        long appointmentId,
        AppointmentUpdateRequest request
    ) {
        return updateAppointmentAfterAuthorization(actorUserId, appointmentId, request, false);
    }

    private Map<String, Object> updateAppointmentAfterAuthorization(
        long actorUserId,
        long appointmentId,
        AppointmentUpdateRequest request,
        boolean canManagePayment
    ) {
        if (request == null) throw new IllegalArgumentException("Appointment changes are required.");
        var rows = jdbcTemplate.query(
            """
                SELECT appointment.id, appointment.company_id, company.name AS company_name,
                       appointment.attendee_name, appointment.attendee_email, appointment.status,
                       appointment.consultant_preference, appointment.requested_distributor_name,
                       appointment.consultation_mode, appointment.service_location_name,
                       appointment.confirmed_start_at, appointment.meeting_url,
                       appointment.consultant_name, appointment.consultant_email,
                       appointment.consultant_phone, appointment.internal_notes,
                       appointment.session_kind, appointment.payment_status,
                       appointment.amount_cents, appointment.currency
                FROM consulting_appointments appointment
                JOIN companies company ON company.id = appointment.company_id
                WHERE appointment.id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new AppointmentRecord(
                rs.getLong("id"), rs.getLong("company_id"), rs.getString("company_name"),
                rs.getString("attendee_name"), rs.getString("attendee_email"), rs.getString("status"),
                rs.getString("consultant_preference"), rs.getString("requested_distributor_name"),
                rs.getString("consultation_mode"), rs.getString("service_location_name"),
                instant(rs.getTimestamp("confirmed_start_at")), rs.getString("meeting_url"),
                rs.getString("consultant_name"), rs.getString("consultant_email"),
                rs.getString("consultant_phone"), rs.getString("internal_notes"),
                rs.getString("session_kind"), rs.getString("payment_status"),
                rs.getObject("amount_cents") == null ? null : rs.getLong("amount_cents"),
                rs.getString("currency")
            ),
            appointmentId
        );
        if (rows.isEmpty()) throw new NoSuchElementException("Consulting appointment not found.");
        var current = rows.getFirst();
        var status = normalized(request.status(), current.status(), 24);
        if (!STATUSES.contains(status)) throw new IllegalArgumentException("Choose a valid appointment status.");
        var confirmedStart = request.confirmedStartAt() == null
            ? parseInstant(current.confirmedStartAt(), "Confirmed time", false)
            : parseInstant(request.confirmedStartAt(), "Confirmed time", true);
        var meetingUrl = firstNonNull(optional(request.meetingUrl(), 2000), current.meetingUrl());
        var consultantName = firstNonNull(optional(request.consultantName(), 160), current.consultantName());
        var consultantEmail = firstNonNull(optional(request.consultantEmail(), 190), current.consultantEmail());
        var consultantPhone = firstNonNull(optional(request.consultantPhone(), 40), current.consultantPhone());
        var internalNotes = request.internalNotes() == null ? current.internalNotes() : optional(request.internalNotes(), 2000);
        var paymentStatus = canManagePayment
            ? normalized(request.paymentStatus(), current.paymentStatus(), 24)
            : current.paymentStatus();
        if (!PAYMENT_STATUSES.contains(paymentStatus)) throw new IllegalArgumentException("Choose a valid payment status.");
        var sessionKind = current.sessionKind();
        var amountCents = current.amountCents();
        var currency = current.currency() == null ? CONSULTATION_CURRENCY : current.currency();
        if (canManagePayment) {
            currency = CONSULTATION_CURRENCY;
            if ("INCLUDED".equals(paymentStatus)) {
                sessionKind = "INCLUDED";
                amountCents = 0L;
            } else if ("WAIVED".equals(paymentStatus)) {
                sessionKind = "ADDITIONAL";
                amountCents = 0L;
            } else if (CHARGED_PAYMENT_STATUSES.contains(paymentStatus)) {
                sessionKind = "ADDITIONAL";
                amountCents = PAID_CONSULTATION_AMOUNT_CENTS;
            }
        }
        if (currency.length() != 3) throw new IllegalArgumentException("Currency must use a three-letter code.");
        var cancellationReason = optional(request.cancellationReason(), 500);

        if ("CONFIRMED".equals(status)) {
            if (confirmedStart == null) throw new IllegalArgumentException("A confirmed time is required.");
            if (consultantName == null) throw new IllegalArgumentException("Assign a consultant before confirming.");
            if (consultantEmail != null && !EMAIL.matcher(consultantEmail).matches()) {
                throw new IllegalArgumentException("Enter a valid consultant email.");
            }
        }
        if (meetingUrl != null && !HTTPS_URL.matcher(meetingUrl).matches()) {
            throw new IllegalArgumentException("Meeting link must use HTTPS.");
        }
        if ("CANCELLED".equals(status) && cancellationReason == null) {
            throw new IllegalArgumentException("Add a cancellation reason.");
        }

        jdbcTemplate.update(
            """
                UPDATE consulting_appointments
                SET status = ?, session_kind = ?, confirmed_start_at = ?, meeting_url = ?, consultant_name = ?,
                    consultant_email = ?, consultant_phone = ?, internal_notes = ?, payment_status = ?,
                    amount_cents = ?, currency = ?, cancellation_reason = ?,
                    confirmed_at = CASE WHEN ? = 'CONFIRMED' THEN COALESCE(confirmed_at, CURRENT_TIMESTAMP(6)) ELSE confirmed_at END,
                    cancelled_at = CASE WHEN ? = 'CANCELLED' THEN COALESCE(cancelled_at, CURRENT_TIMESTAMP(6)) ELSE NULL END,
                    completed_at = CASE WHEN ? = 'COMPLETED' THEN COALESCE(completed_at, CURRENT_TIMESTAMP(6)) ELSE completed_at END,
                    admin_updated_by_user_id = ?
                WHERE id = ?
            """,
            status,
            sessionKind,
            confirmedStart == null ? null : Timestamp.from(confirmedStart),
            meetingUrl,
            consultantName,
            consultantEmail,
            consultantPhone,
            internalNotes,
            paymentStatus,
            amountCents,
            currency,
            cancellationReason,
            status,
            status,
            status,
            actorUserId,
            appointmentId
        );

        var delivery = emailService.sendStatusUpdate(new ConsultingAppointmentEmailService.StatusEmail(
            appointmentId,
            current.companyName(),
            current.attendeeName(),
            current.attendeeEmail(),
            status,
            confirmedStart == null ? null : confirmedStart.toString(),
            current.consultationMode(),
            current.serviceLocationName(),
            consultantName
        ));
        jdbcTemplate.update("UPDATE consulting_appointments SET notification_status = ? WHERE id = ?", delivery.status(), appointmentId);

        var detail = new LinkedHashMap<String, Object>();
        detail.put("previous_status", current.status());
        detail.put("status", status);
        detail.put("requested_preference", current.consultantPreference());
        detail.put("requested_distributor", current.requestedDistributorName() == null ? "" : current.requestedDistributorName());
        detail.put("previous_consultant", current.consultantName() == null ? "" : current.consultantName());
        detail.put("consultant", consultantName == null ? "" : consultantName);
        detail.put("confirmed_start_at", confirmedStart == null ? "" : confirmedStart.toString());
        detail.put("session_kind", sessionKind);
        detail.put("payment_status", paymentStatus);
        detail.put("amount_cents", amountCents == null ? 0L : amountCents);
        detail.put("currency", currency);
        audit.record(actorUserId, "CONSULTING_APPOINTMENT_UPDATED", "CONSULTING_APPOINTMENT",
            String.valueOf(appointmentId), current.companyId(), "SUCCESS", detail);
        return appointmentAfterAuthorization(appointmentId);
    }

    @Transactional
    public Map<String, Object> updateLocation(long actorUserId, long locationId, LocationUpdateRequest request) {
        access.require(actorUserId, "PLATFORM_CONSULTING_WRITE");
        if (request == null || request.active() == null) throw new IllegalArgumentException("Location availability is required.");
        var exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM consulting_service_locations WHERE id = ?", Long.class, locationId);
        if (exists == null || exists == 0) throw new NoSuchElementException("Consulting location not found.");
        if (request.inPersonFeeCents() != null && request.inPersonFeeCents() < 0) throw new IllegalArgumentException("Fee cannot be negative.");
        var currency = normalized(request.currency(), "USD", 3);
        jdbcTemplate.update(
            "UPDATE consulting_service_locations SET active = ?, in_person_fee_cents = ?, currency = ? WHERE id = ?",
            request.active(), request.inPersonFeeCents(), currency, locationId
        );
        audit.record(actorUserId, "CONSULTING_LOCATION_UPDATED", "CONSULTING_LOCATION", String.valueOf(locationId), null,
            "SUCCESS", Map.of("active", request.active(), "currency", currency));
        return location(locationId);
    }

    private Map<String, Object> appointment(long actorUserId, long appointmentId) {
        access.require(actorUserId, "PLATFORM_VIEW");
        return appointmentAfterAuthorization(appointmentId);
    }

    private Map<String, Object> appointmentAfterAuthorization(long appointmentId) {
        var appointments = jdbcTemplate.query(
            """
                SELECT appointment.id, appointment.company_id, company.name AS company_name,
                       appointment.booked_by_user_id, account.email AS booked_by_email,
                       appointment.consultant_preference,
                       appointment.requested_distributor_company_id,
                       appointment.requested_distributor_name, appointment.request_source,
                       appointment.attendee_name, appointment.attendee_email, appointment.attendee_phone,
                       appointment.topic, appointment.notes, appointment.preferred_start_at,
                       appointment.alternative_start_at, appointment.timezone, appointment.duration_minutes,
                       appointment.consultation_mode, appointment.country_code,
                       appointment.service_location_code, appointment.service_location_name,
                       appointment.session_kind, appointment.status, appointment.payment_status,
                       appointment.amount_cents, appointment.currency, appointment.confirmed_start_at,
                       appointment.meeting_url, appointment.consultant_name, appointment.consultant_email,
                       appointment.consultant_phone, appointment.internal_notes, appointment.notification_status,
                       appointment.cancelled_at, appointment.cancellation_reason, appointment.completed_at,
                       appointment.created_at, appointment.updated_at
                FROM consulting_appointments appointment
                JOIN companies company ON company.id = appointment.company_id
                JOIN users account ON account.id = appointment.booked_by_user_id
                WHERE appointment.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> adminAppointmentRow(rs), appointmentId
        );
        if (appointments.isEmpty()) throw new NoSuchElementException("Consulting appointment not found.");
        return appointments.getFirst();
    }

    private Map<String, Object> adminAppointmentRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("company_id", rs.getLong("company_id"));
        row.put("company_name", rs.getString("company_name"));
        row.put("booked_by_user_id", rs.getLong("booked_by_user_id"));
        row.put("booked_by_email", rs.getString("booked_by_email"));
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
        row.put("status", rs.getString("status"));
        row.put("payment_status", rs.getString("payment_status"));
        var amount = rs.getObject("amount_cents");
        row.put("amount_cents", amount == null ? null : ((Number) amount).longValue());
        row.put("currency", rs.getString("currency"));
        row.put("confirmed_start_at", instant(rs.getTimestamp("confirmed_start_at")));
        row.put("meeting_url", rs.getString("meeting_url"));
        row.put("consultant_name", rs.getString("consultant_name"));
        row.put("consultant_email", rs.getString("consultant_email"));
        row.put("consultant_phone", rs.getString("consultant_phone"));
        row.put("internal_notes", rs.getString("internal_notes"));
        row.put("notification_status", rs.getString("notification_status"));
        row.put("cancelled_at", instant(rs.getTimestamp("cancelled_at")));
        row.put("cancellation_reason", rs.getString("cancellation_reason"));
        row.put("completed_at", instant(rs.getTimestamp("completed_at")));
        row.put("created_at", instant(rs.getTimestamp("created_at")));
        row.put("updated_at", instant(rs.getTimestamp("updated_at")));
        return row;
    }

    private List<Map<String, Object>> locations() {
        return jdbcTemplate.query(
            """
                SELECT id, location_code, country_code, country_name, region_name, city_name, timezone,
                       active, in_person_fee_cents, currency, updated_at
                FROM consulting_service_locations
                ORDER BY sort_order, country_name, city_name
                """,
            (rs, rowNum) -> locationRow(rs)
        );
    }

    private List<Map<String, Object>> consultants() {
        var distributors = jdbcTemplate.query(
            """
                SELECT company.id AS company_id, company.name AS company_name,
                       TRIM(COALESCE(NULLIF(profile.full_name, ''), NULLIF(account.full_name, ''), account.email)) AS full_name,
                       COALESCE(profile.phone, '') AS phone, LOWER(account.email) AS email,
                       company.created_at, company.updated_at
                FROM companies company
                LEFT JOIN company_ownerships ownership
                  ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
                LEFT JOIN user_companies owner_membership
                  ON owner_membership.id = ownership.owner_user_company_id
                 AND LOWER(COALESCE(owner_membership.status, 'active')) = 'active'
                LEFT JOIN user_companies fallback_membership
                  ON fallback_membership.id = (
                      SELECT member.id
                      FROM user_companies member
                      WHERE member.company_id = company.id
                        AND LOWER(COALESCE(member.status, 'active')) = 'active'
                      ORDER BY FIELD(LOWER(COALESCE(member.role, 'user')),
                          'root', 'superadmin', 'owner', 'admin', 'manager', 'user'), member.id
                      LIMIT 1
                  )
                JOIN users account
                  ON account.id = COALESCE(owner_membership.user_id, fallback_membership.user_id)
                LEFT JOIN user_profiles profile ON profile.user_id = account.id
                WHERE company.commercial_account_type = 'DISTRIBUTOR'
                  AND company.platform_status = 'ACTIVE'
                ORDER BY company.name, company.id
                """,
            (rs, rowNum) -> distributorConsultantRow(rs)
        );
        var knownEmails = new HashSet<String>();
        var result = new ArrayList<Map<String, Object>>(distributors);
        distributors.forEach(row -> knownEmails.add(String.valueOf(row.get("email")).toLowerCase(Locale.ROOT)));

        var corporateConsultants = jdbcTemplate.query(
            """
                SELECT id, first_name, last_name, phone, email, active, created_at, updated_at
                FROM consulting_consultants
                WHERE active = 1
                ORDER BY last_name, first_name, id
                """,
            (rs, rowNum) -> corporateConsultantCatalogRow(rs)
        );
        corporateConsultants.stream()
            .filter(row -> knownEmails.add(String.valueOf(row.get("email")).toLowerCase(Locale.ROOT)))
            .forEach(result::add);
        return result;
    }

    private Map<String, Object> consultant(long consultantId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, first_name, last_name, phone, email, active, created_at, updated_at
                FROM consulting_consultants WHERE id = ? LIMIT 1
                """,
            (rs, rowNum) -> consultantRow(rs), consultantId
        );
        if (rows.isEmpty()) throw new NoSuchElementException("Consultant not found.");
        return rows.getFirst();
    }

    private Map<String, Object> consultantRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("firstName", rs.getString("first_name"));
        row.put("lastName", rs.getString("last_name"));
        row.put("phone", rs.getString("phone"));
        row.put("email", rs.getString("email"));
        row.put("active", rs.getBoolean("active"));
        row.put("createdAt", instant(rs.getTimestamp("created_at")));
        row.put("updatedAt", instant(rs.getTimestamp("updated_at")));
        row.put("sourceType", "CORPORATE");
        row.put("companyId", null);
        row.put("companyName", "Equipo Índice");
        return row;
    }

    private Map<String, Object> corporateConsultantCatalogRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        var row = consultantRow(rs);
        row.put("id", -rs.getLong("id"));
        return row;
    }

    private Map<String, Object> distributorConsultantRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        var fullName = rs.getString("full_name").trim();
        var separator = fullName.indexOf(' ');
        var firstName = separator < 0 ? fullName : fullName.substring(0, separator).trim();
        var lastName = separator < 0 ? "" : fullName.substring(separator + 1).trim();
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("company_id"));
        row.put("firstName", firstName);
        row.put("lastName", lastName);
        row.put("phone", rs.getString("phone"));
        row.put("email", rs.getString("email"));
        row.put("active", true);
        row.put("createdAt", instant(rs.getTimestamp("created_at")));
        row.put("updatedAt", instant(rs.getTimestamp("updated_at")));
        row.put("sourceType", "DISTRIBUTOR");
        row.put("companyId", rs.getLong("company_id"));
        row.put("companyName", rs.getString("company_name"));
        return row;
    }

    private Map<String, Object> location(long locationId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, location_code, country_code, country_name, region_name, city_name, timezone,
                       active, in_person_fee_cents, currency, updated_at
                FROM consulting_service_locations WHERE id = ? LIMIT 1
                """,
            (rs, rowNum) -> locationRow(rs), locationId
        );
        if (rows.isEmpty()) throw new NoSuchElementException("Consulting location not found.");
        return rows.getFirst();
    }

    private Map<String, Object> locationRow(java.sql.ResultSet rs) throws java.sql.SQLException {
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
        row.put("updated_at", instant(rs.getTimestamp("updated_at")));
        return row;
    }

    private ConsultantIdentity requireAvailabilityConsultant(String rawEmail) {
        var email = required(rawEmail, "Consultant email", 190).toLowerCase(Locale.ROOT);
        return consultants().stream()
            .filter(row -> email.equals(String.valueOf(row.get("email")).toLowerCase(Locale.ROOT)))
            .findFirst()
            .map(row -> {
                var firstName = String.valueOf(row.getOrDefault("firstName", "")).trim();
                var lastName = String.valueOf(row.getOrDefault("lastName", "")).trim();
                var name = (firstName + " " + lastName).trim();
                return new ConsultantIdentity(name.isBlank() ? email : name, email);
            })
            .orElseThrow(() -> new NoSuchElementException("Consultant not found."));
    }

    private Map<String, Object> consultantAvailabilityAfterAuthorization(ConsultantIdentity consultant) {
        var configuredRows = jdbcTemplate.query(
            """
                SELECT consultant_name, timezone, day_of_week, enabled, start_time, end_time, updated_at
                FROM consulting_consultant_availability
                WHERE consultant_email = ?
                ORDER BY day_of_week
                """,
            (rs, rowNum) -> new AvailabilityRow(
                rs.getString("consultant_name"),
                rs.getString("timezone"),
                rs.getInt("day_of_week"),
                rs.getBoolean("enabled"),
                rs.getTime("start_time") == null ? null : rs.getTime("start_time").toLocalTime().toString(),
                rs.getTime("end_time") == null ? null : rs.getTime("end_time").toLocalTime().toString(),
                instant(rs.getTimestamp("updated_at"))
            ),
            consultant.email()
        );
        var configured = !configuredRows.isEmpty();
        var timezone = configured ? configuredRows.getFirst().timezone() : "America/Mexico_City";
        var days = new ArrayList<Map<String, Object>>();
        for (var dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
            var requestedDay = dayOfWeek;
            var configuredDay = configuredRows.stream()
                .filter(row -> row.dayOfWeek() == requestedDay)
                .findFirst()
                .orElse(null);
            var enabled = configuredDay == null ? dayOfWeek <= 5 : configuredDay.enabled();
            var day = new LinkedHashMap<String, Object>();
            day.put("dayOfWeek", dayOfWeek);
            day.put("enabled", enabled);
            day.put("startTime", configuredDay == null ? (enabled ? "09:00" : "") : firstNonNull(configuredDay.startTime(), ""));
            day.put("endTime", configuredDay == null ? (enabled ? "17:00" : "") : firstNonNull(configuredDay.endTime(), ""));
            days.add(day);
        }
        var response = new LinkedHashMap<String, Object>();
        response.put("consultantEmail", consultant.email());
        response.put("consultantName", consultant.name());
        response.put("timezone", timezone);
        response.put("configured", configured);
        response.put("updatedAt", configured ? configuredRows.getFirst().updatedAt() : null);
        response.put("days", days);
        return response;
    }

    private LocalTime parseAvailabilityTime(String value, String label) {
        var normalized = required(value, label, 5);
        try {
            return LocalTime.parse(normalized);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(label + " is invalid.");
        }
    }

    private void requireAvailableConsultingWindow(
        String consultantEmail,
        Instant startAt,
        int durationMinutes
    ) {
        var availabilityTimezones = jdbcTemplate.query(
            """
                SELECT timezone
                FROM consulting_consultant_availability
                WHERE consultant_email = ?
                ORDER BY day_of_week
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("timezone"),
            consultantEmail.toLowerCase(Locale.ROOT)
        );
        if (availabilityTimezones.isEmpty()) return;

        var availabilityZone = ZoneId.of(availabilityTimezones.getFirst());
        var localStart = startAt.atZone(availabilityZone).toLocalDateTime();
        var localEnd = localStart.plusMinutes(durationMinutes);
        var windows = jdbcTemplate.query(
            """
                SELECT enabled, start_time, end_time
                FROM consulting_consultant_availability
                WHERE consultant_email = ? AND day_of_week = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new AvailabilityWindow(
                rs.getBoolean("enabled"),
                rs.getTime("start_time") == null ? null : rs.getTime("start_time").toLocalTime(),
                rs.getTime("end_time") == null ? null : rs.getTime("end_time").toLocalTime()
            ),
            consultantEmail.toLowerCase(Locale.ROOT),
            localStart.getDayOfWeek().getValue()
        );
        var window = windows.isEmpty() ? null : windows.getFirst();
        if (
            window == null
                || !window.enabled()
                || window.startTime() == null
                || window.endTime() == null
                || localStart.toLocalTime().isBefore(window.startTime())
                || !localEnd.toLocalDate().equals(localStart.toLocalDate())
                || localEnd.toLocalTime().isAfter(window.endTime())
        ) {
            throw new IllegalStateException(
                "El distribuidor no está disponible en ese horario. Elige un espacio dentro de su disponibilidad."
            );
        }

        var endAt = startAt.plusSeconds(durationMinutes * 60L);
        var overlaps = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM consulting_appointments
                WHERE LOWER(consultant_email) = ?
                  AND status = 'CONFIRMED'
                  AND COALESCE(confirmed_start_at, preferred_start_at) < ?
                  AND DATE_ADD(
                        COALESCE(confirmed_start_at, preferred_start_at),
                        INTERVAL duration_minutes MINUTE
                      ) > ?
                """,
            Integer.class,
            consultantEmail.toLowerCase(Locale.ROOT),
            Timestamp.from(endAt),
            Timestamp.from(startAt)
        );
        if (overlaps != null && overlaps > 0) {
            throw new IllegalStateException(
                "El distribuidor ya tiene una consultoría en ese horario. Selecciona otro espacio."
            );
        }
    }

    private Instant parseInstant(String value, String label, boolean allowBlank) {
        if (value == null || value.isBlank()) {
            if (allowBlank) return null;
            return null;
        }
        try { return Instant.parse(value); } catch (DateTimeParseException exception) { throw new IllegalArgumentException(label + " is invalid."); }
    }

    private String normalized(String value, String fallback, int maxLength) {
        var candidate = value == null || value.isBlank() ? fallback : value;
        if (candidate == null) candidate = "";
        candidate = candidate.trim().toUpperCase(Locale.ROOT);
        if (candidate.length() > maxLength) throw new IllegalArgumentException("The provided value is too long.");
        return candidate;
    }

    private String optional(String value, int maxLength) {
        if (value == null) return null;
        var normalized = value.trim();
        if (normalized.length() > maxLength) throw new IllegalArgumentException("The provided value is too long.");
        return normalized.isBlank() ? null : normalized;
    }

    private String required(String value, String label, int maxLength) {
        var normalized = optional(value, maxLength);
        if (normalized == null) throw new IllegalArgumentException(label + " is required.");
        return normalized;
    }

    private String uniqueLocationCode(String countryCode, String city) {
        var cityCode = city.toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
        if (cityCode.length() > 32) cityCode = cityCode.substring(0, 32);
        var base = countryCode + "-" + cityCode;
        var candidate = base;
        var suffix = 2;
        while (Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "SELECT COUNT(*) > 0 FROM consulting_service_locations WHERE location_code = ?",
            Boolean.class,
            candidate
        ))) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private long generatedId(Number key, String message) {
        if (key == null) throw new IllegalStateException(message);
        return key.longValue();
    }

    private String firstNonNull(String value, String fallback) { return value == null ? fallback : value; }
    private String instant(Timestamp value) { return value == null ? null : value.toInstant().toString(); }

    private record AppointmentRecord(
        long id,
        long companyId,
        String companyName,
        String attendeeName,
        String attendeeEmail,
        String status,
        String consultantPreference,
        String requestedDistributorName,
        String consultationMode,
        String serviceLocationName,
        String confirmedStartAt,
        String meetingUrl,
        String consultantName,
        String consultantEmail,
        String consultantPhone,
        String internalNotes,
        String sessionKind,
        String paymentStatus,
        Long amountCents,
        String currency
    ) {
    }

    private record ConsultantAssignment(String name, String email, String phone) {
    }

    private record ConsultantIdentity(String name, String email) {
    }

    private record AvailabilityRow(
        String consultantName,
        String timezone,
        int dayOfWeek,
        boolean enabled,
        String startTime,
        String endTime,
        String updatedAt
    ) {
    }

    private record AvailabilityWindow(
        boolean enabled,
        LocalTime startTime,
        LocalTime endTime
    ) {
    }

    public record AppointmentUpdateRequest(
        String status,
        String confirmedStartAt,
        String meetingUrl,
        String consultantName,
        String consultantEmail,
        String consultantPhone,
        String internalNotes,
        String paymentStatus,
        Long amountCents,
        String currency,
        String cancellationReason
    ) {
    }

    public record LocationUpdateRequest(Boolean active, Long inPersonFeeCents, String currency) {
    }

    public record ConsultantCreateRequest(String firstName, String lastName, String phone, String email) {
    }

    public record LocationCreateRequest(
        String cityName,
        String regionName,
        String countryName,
        String countryCode,
        String timezone,
        String currency
    ) {
    }

    public record AvailabilityDayRequest(
        int dayOfWeek,
        Boolean enabled,
        String startTime,
        String endTime
    ) {
    }

    public record AvailabilityUpdateRequest(
        String consultantEmail,
        String timezone,
        List<AvailabilityDayRequest> days
    ) {
    }

    public record AdminAppointmentCreateRequest(
        long companyId,
        String attendeeName,
        String attendeeEmail,
        String attendeePhone,
        String topic,
        String consultationMode,
        String startAt,
        String timezone,
        Integer durationMinutes,
        String consultantName,
        String consultantEmail,
        String consultantPhone,
        String meetingUrl,
        String serviceLocationCode,
        String serviceLocationName,
        String countryCode
    ) {
    }
}
