package com.indice.erp.hr.attendance;

import com.indice.erp.hr.attendance.locations.AttendanceLocationValidationException;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import com.indice.erp.storage.StoredObjectMetadata;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/** Real owner persistence and projection; only the object store uses synthetic media. */
@SpringBootTest
@Transactional
class AttendancePersonalPunchIntegrationTest {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private HrAttendanceService attendance;
    @MockBean private ObjectStorageService storage;
    private final Set<String> uploaded = new HashSet<>();
    private long companyId;
    private long userId;
    private long membershipId;

    @BeforeEach
    void setUp() {
        var unique = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "Attendance test " + unique);
        companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'test-only', 'Synthetic Employee')",
            unique + "@example.invalid");
        userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'user', 'active', 'all')",
            userId, companyId);
        membershipId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        when(storage.isEnabled()).thenReturn(true);
        when(storage.presignUpload(anyString(), anyString(), anyString(), eq(4L), anyInt()))
            .thenAnswer(call -> new PresignedUpload(call.getArgument(1),
                "https://example.invalid/synthetic-upload", Instant.now().plusSeconds(60), Map.of()));
        when(storage.objectExists(anyString(), anyString()))
            .thenAnswer(call -> uploaded.contains(call.getArgument(1)));
        when(storage.objectMetadata(anyString(), anyString()))
            .thenAnswer(call -> {
                if (!uploaded.contains(call.getArgument(1))) throw new IllegalArgumentException("Missing synthetic upload");
                return new StoredObjectMetadata(4, "image/jpeg");
            });
    }

    @Test
    void configuredOpenScheduleWithoutLocationRestrictionAllowsPersonalEntryAndExitOutsideSiteRadius() {
        site("0.1", 50, "active");
        schedule("open", null, false);
        var entry = attendance.recordSelfKioskEvent(companyId, userId, payload("check_in", 8, true, "0"));
        var exit = attendance.recordSelfKioskEvent(companyId, userId, payload("check_out", 17, true, "0"));
        assertThat(entry).containsEntry("event_kind", "check_in");
        assertThat(exit).containsEntry("event_kind", "check_out");
        assertThat(eventCount()).isEqualTo(2);
        assertThat(attendance.employeeDay(companyId, userId, LocalDate.now()).lastCheckOut()).isNotNull();
    }

    @Test
    void openScheduleWithExplicitLocationStillRejectsAnotherNearbySite() {
        var restricted = site("0.1", 50, "active");
        site("0.001", 300, "active");
        schedule("open", restricted, true);
        var request = payload("check_in", 8, true, "0");
        assertThatThrownBy(() -> attendance.recordSelfKioskEvent(companyId, userId, request))
            .isInstanceOf(AttendanceLocationValidationException.class);
        assertThat(eventCount()).isZero();
    }

    @Test
    void activeWorkSiteRestrictionTakesPrecedenceOverOpenSchedule() {
        var assigned = site("0.1", 50, "active");
        site("0.001", 300, "active");
        schedule("open", null, false);
        jdbc.update("""
            INSERT INTO user_work_site_assignments
              (company_id, user_company_id, user_id, location_id, effective_start_date, status)
            VALUES (?, ?, ?, ?, CURRENT_DATE, 'active')
            """, companyId, membershipId, userId, assigned);
        var request = payload("check_in", 8, true, "0");
        assertThatThrownBy(() -> attendance.recordSelfKioskEvent(companyId, userId, request))
            .isInstanceOf(AttendanceLocationValidationException.class);
        assertThat(eventCount()).isZero();
    }

    @Test
    void expiredOpenScheduleAndClientPolicyFieldsCannotRelaxLocationRules() {
        site("0.1", 50, "active");
        schedule("open", null, false);
        jdbc.update("UPDATE user_schedule_assignments SET effective_start_date = DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), effective_end_date = DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) WHERE company_id = ? AND user_company_id = ?",
            companyId, membershipId);
        var request = new java.util.LinkedHashMap<>(payload("check_in", 8, true, "0"));
        request.put("schedule_mode", "open");
        request.put("enforce_location", false);
        assertThatThrownBy(() -> attendance.recordSelfKioskEvent(companyId, userId, request))
            .isInstanceOf(AttendanceLocationValidationException.class);
        assertThat(eventCount()).isZero();
    }

    @Test
    void storedPhotoAndGpsCanRecordEntryAndExitInsideAnAllowedRadiusAndRefreshTheDay() {
        site("0.001", 50, "active");
        var covering = site("0.002", 300, "active");
        var entry = attendance.recordSelfKioskEvent(companyId, userId, payload("check_in", 8, true, "0"));
        assertThat(entry).containsEntry("result_status", "success").containsEntry("event_kind", "check_in");
        assertThat(jdbc.queryForObject("SELECT location_id FROM user_attendance_events WHERE id = ? AND company_id = ?",
            Long.class, entry.get("event_id"), companyId)).isEqualTo(covering);
        assertThat(attendance.employeeDay(companyId, userId, LocalDate.now()).firstCheckIn()).isNotNull();

        var exit = attendance.recordSelfKioskEvent(companyId, userId, payload("check_out", 17, true, "0"));
        assertThat(exit).containsEntry("event_kind", "check_out");
        var day = attendance.employeeDay(companyId, userId, LocalDate.now());
        assertThat(day.firstCheckIn()).isNotNull();
        assertThat(day.lastCheckOut()).isNotNull();
        assertThat(eventCount()).isEqualTo(2);
    }

    @Test
    void outsideTheAllowedRadiusDoesNotCreateAttendance() {
        site("0.001", 50, "active");
        var request = payload("check_in", 8, true, "0");
        assertThatThrownBy(() -> attendance.recordSelfKioskEvent(companyId, userId, request))
            .isInstanceOf(AttendanceLocationValidationException.class)
            .extracting(e -> ((AttendanceLocationValidationException) e).reason())
            .isEqualTo(AttendanceLocationValidationException.Reason.OUTSIDE_RADIUS);
        assertThat(eventCount()).isZero();
    }

    @Test
    void inactiveLocationIsNotAnAttendanceAlternative() {
        site("0.001", 300, "inactive");
        var request = payload("check_in", 8, true, "0");
        assertThatThrownBy(() -> attendance.recordSelfKioskEvent(companyId, userId, request))
            .isInstanceOf(AttendanceLocationValidationException.class)
            .extracting(e -> ((AttendanceLocationValidationException) e).reason())
            .isEqualTo(AttendanceLocationValidationException.Reason.NOT_CONFIGURED);
        assertThat(eventCount()).isZero();
    }

    @Test
    void capturedButNotUploadedPhotoCannotCreateAttendance() {
        site("0.001", 300, "active");
        var request = payload("check_in", 8, false, "0");
        assertThatThrownBy(() -> attendance.recordSelfKioskEvent(companyId, userId, request))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("existing uploaded object");
        assertThat(eventCount()).isZero();
    }

    private Map<String, Object> payload(String type, int hour, boolean stored, String latitude) {
        var timestamp = LocalDateTime.of(LocalDate.now(), java.time.LocalTime.of(hour, 0)).toString();
        var presigned = attendance.createSelfPhotoUpload(companyId, userId,
            Map.of("content_type", "image/jpeg", "event_type", type, "event_timestamp", timestamp, "size_bytes", 4));
        var key = (String) presigned.get("object_key");
        if (stored) uploaded.add(key);
        return Map.of("event_type", type, "event_timestamp", timestamp, "photo_url", key,
            "latitude", latitude, "longitude", "0");
    }

    private long site(String latitude, int radius, String status) {
        jdbc.update("""
            INSERT INTO attendance_locations (company_id, name, contract_start_date, contract_end_date,
                latitude, longitude, radius_meters, required_hours_per_day, required_start_time,
                required_end_time, required_days_per_week, status)
            VALUES (?, 'Synthetic site', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 1 YEAR),
                ?, 0, ?, 8, '08:00', '17:00', 5, ?)
            """, companyId, latitude, radius, status);
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private int eventCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM user_attendance_events WHERE company_id = ? AND user_id = ?",
            Integer.class, companyId, userId);
    }

    private void schedule(String mode, Long locationId, boolean enforced) {
        jdbc.update("""
            INSERT INTO attendance_schedule_templates (company_id, name, schedule_mode, enforce_location, location_id, status)
            VALUES (?, 'Synthetic schedule', ?, ?, ?, 'active')
            """, companyId, mode, enforced, locationId);
        var templateId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("""
            INSERT INTO attendance_schedule_template_days (template_id, day_of_week, start_time, end_time, is_rest_day)
            VALUES (?, ?, '08:00', '17:00', 0)
            """, templateId, LocalDate.now().getDayOfWeek().getValue());
        jdbc.update("""
            INSERT INTO user_schedule_assignments
              (company_id, user_company_id, user_id, template_id, effective_start_date, status)
            VALUES (?, ?, ?, ?, CURRENT_DATE, 'active')
            """, companyId, membershipId, userId, templateId);
    }
}
