package com.indice.erp.hr.attendance.usecases.records;

import com.indice.erp.hr.attendance.models.DailyRecordRow;
import com.indice.erp.hr.attendance.usecases.control.HrAttendanceControlActivitySupport;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.calculateMinutesLate;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.calculateSystemStatus;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeNullableAttendanceStatus;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


public abstract class HrAttendanceDailyProjectionSupport extends HrAttendanceControlActivitySupport {

    protected HrAttendanceDailyProjectionSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected DailyRecordRow rebuildDailyRecordProjection(long companyId, long userCompanyId, LocalDate date) {
        var events = loadAttendanceEventRows(companyId, userCompanyId, date);
        var scheduleRule = loadScheduleRule(companyId, userCompanyId, date);
        var existing = attendanceDailyRecordRepository.loadDailyRecord(companyId, userCompanyId, date);

        LocalDateTime firstCheckIn = null;
        LocalDateTime lastCheckOut = null;
        Long firstLocationId = null;
        Long lastLocationId = null;
        String correctedStatus = null;
        String notes = null;
        Long correctedByUserId = null;
        boolean correctionStateTouched = false;
        long latestOperationalEventId = 0L;
        long latestCorrectionEventId = 0L;

        for (var event : events) {
            if (!"success".equals(event.resultStatus()) && !"overridden".equals(event.resultStatus())) {
                continue;
            }

            if ("check_in".equals(event.eventKind()) && firstCheckIn == null) {
                firstCheckIn = event.eventTimestamp();
                firstLocationId = event.locationId();
            }
            if ("check_out".equals(event.eventKind())) {
                lastCheckOut = event.eventTimestamp();
                lastLocationId = event.locationId();
            }
            if (isOperationalAttendanceEvent(event.eventKind())) {
                latestOperationalEventId = Math.max(latestOperationalEventId, event.id());
            }
            if ("correction".equals(event.eventKind()) || "manual_override".equals(event.eventKind())) {
                latestCorrectionEventId = Math.max(latestCorrectionEventId, event.id());
                var metadata = parseJsonMap(event.metadataJson());
                if (metadata.containsKey("corrected_status")) {
                    correctionStateTouched = true;
                    correctedStatus = normalizeNullableAttendanceStatus(metadataTextValue(metadata.get("corrected_status")));
                    correctedByUserId = correctedStatus == null ? null : event.createdBy();
                }
                if (metadata.containsKey("notes")) {
                    correctionStateTouched = true;
                    notes = metadataTextValue(metadata.get("notes"));
                } else if (!HrPayloadUtils.isBlank(event.notes())) {
                    notes = event.notes();
                }
            }
        }

        if (latestCorrectionEventId > 0L && latestOperationalEventId > latestCorrectionEventId) {
            correctionStateTouched = true;
            correctedStatus = null;
            correctedByUserId = null;
            notes = null;
        }

        if (!correctionStateTouched && correctedStatus == null && existing != null) {
            correctedStatus = existing.correctedStatus();
            correctedByUserId = null;
            if (notes == null) {
                notes = existing.notes();
            }
        }

        var systemStatus = calculateSystemStatus(scheduleRule, firstCheckIn, date);
        var minutesLate = calculateMinutesLate(scheduleRule, firstCheckIn, date);

        if (existing == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO user_attendance_daily_records
                    (company_id, user_id, user_company_id, attendance_date, system_status, corrected_status, corrected_by, corrected_at, first_check_in_at, last_check_out_at, first_location_id, last_location_id, minutes_late, source_schedule_template_id, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                companyId,
                attendanceUserLookupService.loadUserIdForCompanyUser(companyId, userCompanyId),
                userCompanyId,
                date,
                systemStatus,
                correctedStatus,
                correctedByUserId,
                correctedStatus == null ? null : Timestamp.valueOf(LocalDateTime.now()),
                firstCheckIn == null ? null : Timestamp.valueOf(firstCheckIn),
                lastCheckOut == null ? null : Timestamp.valueOf(lastCheckOut),
                firstLocationId,
                lastLocationId,
                minutesLate,
                scheduleRule == null ? null : scheduleRule.templateId(),
                notes
            );
        } else {
            jdbcTemplate.update(
                """
                    UPDATE user_attendance_daily_records
                    SET system_status = ?,
                        corrected_status = ?,
                        corrected_by = ?,
                        corrected_at = ?,
                        first_check_in_at = ?,
                        last_check_out_at = ?,
                        first_location_id = ?,
                        last_location_id = ?,
                        minutes_late = ?,
                        source_schedule_template_id = ?,
                        notes = ?
                    WHERE id = ?
                    """,
                systemStatus,
                correctedStatus,
                correctedByUserId,
                correctedStatus == null ? null : Timestamp.valueOf(LocalDateTime.now()),
                firstCheckIn == null ? null : Timestamp.valueOf(firstCheckIn),
                lastCheckOut == null ? null : Timestamp.valueOf(lastCheckOut),
                firstLocationId,
                lastLocationId,
                minutesLate,
                scheduleRule == null ? null : scheduleRule.templateId(),
                notes,
                existing.id()
            );
        }

        return Objects.requireNonNull(attendanceDailyRecordRepository.loadDailyRecord(companyId, userCompanyId, date));
    }
}
