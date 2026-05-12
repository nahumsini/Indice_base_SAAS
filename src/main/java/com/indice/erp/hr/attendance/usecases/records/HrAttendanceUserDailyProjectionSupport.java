package com.indice.erp.hr.attendance.usecases.records;

import com.indice.erp.hr.attendance.models.AttendanceUser;
import com.indice.erp.hr.attendance.models.DailyRecordRow;
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


public abstract class HrAttendanceUserDailyProjectionSupport extends HrAttendanceDailyProjectionSupport {

    protected HrAttendanceUserDailyProjectionSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected DailyRecordRow rebuildUserDailyRecordProjection(long companyId, AttendanceUser user, LocalDate date) {
        var events = loadUserAttendanceEventRows(companyId, user.userId(), date);
        var existing = attendanceDailyRecordRepository.loadUserDailyRecord(companyId, user.userId(), date);

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

        var systemStatus = calculateSystemStatus(null, firstCheckIn, date);
        var minutesLate = calculateMinutesLate(null, firstCheckIn, date);

        if (existing == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO user_attendance_daily_records
                    (company_id, user_id, user_company_id, attendance_date, system_status, corrected_status, corrected_by, corrected_at, first_check_in_at, last_check_out_at, first_location_id, last_location_id, minutes_late, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                companyId,
                user.userId(),
                user.userCompanyId(),
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
                notes
            );
        } else {
            jdbcTemplate.update(
                """
                    UPDATE user_attendance_daily_records
                    SET user_company_id = ?,
                        system_status = ?,
                        corrected_status = ?,
                        corrected_by = ?,
                        corrected_at = ?,
                        first_check_in_at = ?,
                        last_check_out_at = ?,
                        first_location_id = ?,
                        last_location_id = ?,
                        minutes_late = ?,
                        notes = ?
                    WHERE id = ?
                    """,
                user.userCompanyId(),
                systemStatus,
                correctedStatus,
                correctedByUserId,
                correctedStatus == null ? null : Timestamp.valueOf(LocalDateTime.now()),
                firstCheckIn == null ? null : Timestamp.valueOf(firstCheckIn),
                lastCheckOut == null ? null : Timestamp.valueOf(lastCheckOut),
                firstLocationId,
                lastLocationId,
                minutesLate,
                notes,
                existing.id()
            );
        }

        return Objects.requireNonNull(attendanceDailyRecordRepository.loadUserDailyRecord(companyId, user.userId(), date));
    }
}
