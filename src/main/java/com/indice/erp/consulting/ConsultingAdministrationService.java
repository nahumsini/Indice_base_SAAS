package com.indice.erp.consulting;

import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConsultingAdministrationService {

    private static final Set<String> STATUSES = Set.of("REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW");
    private static final Set<String> PAYMENT_STATUSES = Set.of("INCLUDED", "QUOTE_PENDING", "PENDING", "PAID", "WAIVED", "REFUNDED");
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
        return response;
    }

    @Transactional
    public Map<String, Object> updateAppointment(long actorUserId, long appointmentId, AppointmentUpdateRequest request) {
        access.require(actorUserId, "PLATFORM_CONSULTING_WRITE");
        if (request == null) throw new IllegalArgumentException("Appointment changes are required.");
        var rows = jdbcTemplate.query(
            """
                SELECT appointment.id, appointment.company_id, company.name AS company_name,
                       appointment.attendee_name, appointment.attendee_email, appointment.status,
                       appointment.consultation_mode, appointment.service_location_name,
                       appointment.confirmed_start_at, appointment.meeting_url,
                       appointment.consultant_name, appointment.consultant_email,
                       appointment.consultant_phone, appointment.internal_notes,
                       appointment.payment_status, appointment.amount_cents, appointment.currency
                FROM consulting_appointments appointment
                JOIN companies company ON company.id = appointment.company_id
                WHERE appointment.id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new AppointmentRecord(
                rs.getLong("id"), rs.getLong("company_id"), rs.getString("company_name"),
                rs.getString("attendee_name"), rs.getString("attendee_email"), rs.getString("status"),
                rs.getString("consultation_mode"), rs.getString("service_location_name"),
                instant(rs.getTimestamp("confirmed_start_at")), rs.getString("meeting_url"),
                rs.getString("consultant_name"), rs.getString("consultant_email"),
                rs.getString("consultant_phone"), rs.getString("internal_notes"),
                rs.getString("payment_status"),
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
        var paymentStatus = normalized(request.paymentStatus(), current.paymentStatus(), 24);
        if (!PAYMENT_STATUSES.contains(paymentStatus)) throw new IllegalArgumentException("Choose a valid payment status.");
        var amountCents = request.amountCents() == null ? current.amountCents() : request.amountCents();
        if (amountCents != null && amountCents < 0) throw new IllegalArgumentException("Amount cannot be negative.");
        var currency = normalized(request.currency(), current.currency(), 3);
        if (currency.length() != 3) throw new IllegalArgumentException("Currency must use a three-letter code.");
        var cancellationReason = optional(request.cancellationReason(), 500);

        if ("CONFIRMED".equals(status)) {
            if (confirmedStart == null) throw new IllegalArgumentException("A confirmed time is required.");
            if (consultantName == null) throw new IllegalArgumentException("Assign a consultant before confirming.");
            if (consultantEmail != null && !EMAIL.matcher(consultantEmail).matches()) {
                throw new IllegalArgumentException("Enter a valid consultant email.");
            }
            if ("VIRTUAL".equals(current.consultationMode()) && (meetingUrl == null || !HTTPS_URL.matcher(meetingUrl).matches())) {
                throw new IllegalArgumentException("Add a secure meeting link before confirming a virtual session.");
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
                SET status = ?, confirmed_start_at = ?, meeting_url = ?, consultant_name = ?,
                    consultant_email = ?, consultant_phone = ?, internal_notes = ?, payment_status = ?,
                    amount_cents = ?, currency = ?, cancellation_reason = ?,
                    confirmed_at = CASE WHEN ? = 'CONFIRMED' THEN COALESCE(confirmed_at, CURRENT_TIMESTAMP(6)) ELSE confirmed_at END,
                    cancelled_at = CASE WHEN ? = 'CANCELLED' THEN COALESCE(cancelled_at, CURRENT_TIMESTAMP(6)) ELSE NULL END,
                    completed_at = CASE WHEN ? = 'COMPLETED' THEN COALESCE(completed_at, CURRENT_TIMESTAMP(6)) ELSE completed_at END,
                    admin_updated_by_user_id = ?
                WHERE id = ?
                """,
            status,
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

        var statusChanged = !status.equals(current.status());
        var timeChanged = !sameInstant(confirmedStart, current.confirmedStartAt());
        if (statusChanged || timeChanged) {
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
        }

        var detail = new LinkedHashMap<String, Object>();
        detail.put("previous_status", current.status());
        detail.put("status", status);
        detail.put("consultant", consultantName == null ? "" : consultantName);
        detail.put("confirmed_start_at", confirmedStart == null ? "" : confirmedStart.toString());
        audit.record(actorUserId, "CONSULTING_APPOINTMENT_UPDATED", "CONSULTING_APPOINTMENT",
            String.valueOf(appointmentId), current.companyId(), "SUCCESS", detail);
        return appointment(actorUserId, appointmentId);
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
        var appointments = jdbcTemplate.query(
            """
                SELECT appointment.id, appointment.company_id, company.name AS company_name,
                       appointment.booked_by_user_id, account.email AS booked_by_email,
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

    private Instant parseInstant(String value, String label, boolean allowBlank) {
        if (value == null || value.isBlank()) {
            if (allowBlank) return null;
            return null;
        }
        try { return Instant.parse(value); } catch (DateTimeParseException exception) { throw new IllegalArgumentException(label + " is invalid."); }
    }

    private boolean sameInstant(Instant instant, String current) {
        if (instant == null && (current == null || current.isBlank())) return true;
        if (instant == null || current == null || current.isBlank()) return false;
        return instant.equals(Instant.parse(current));
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

    private String firstNonNull(String value, String fallback) { return value == null ? fallback : value; }
    private String instant(Timestamp value) { return value == null ? null : value.toInstant().toString(); }

    private record AppointmentRecord(
        long id,
        long companyId,
        String companyName,
        String attendeeName,
        String attendeeEmail,
        String status,
        String consultationMode,
        String serviceLocationName,
        String confirmedStartAt,
        String meetingUrl,
        String consultantName,
        String consultantEmail,
        String consultantPhone,
        String internalNotes,
        String paymentStatus,
        Long amountCents,
        String currency
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
}
