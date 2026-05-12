package com.indice.erp.hr.attendance.usecases.records;

import com.indice.erp.hr.attendance.usecases.jobs.HrAttendanceAutoCheckoutUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeAttendanceStatus;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendanceAdminDailyRecordUseCases extends HrAttendanceAutoCheckoutUseCases {

    protected HrAttendanceAdminDailyRecordUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> updateDailyRecord(long companyId, long userId, long userCompanyId, LocalDate date, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        ensureAttendanceDateEditable(user, date);
        var targetStatusRaw = stringValue(payload, "status", "corrected_status");
        var correctedStatus = targetStatusRaw.isBlank() ? null : normalizeAttendanceStatus(targetStatusRaw);
        var scheduleRule = loadScheduleRule(companyId, userCompanyId, date);
        var notes = nullable(stringValue(payload, "notes"));
        var correctionMetadata = new LinkedHashMap<String, Object>();
        correctionMetadata.put("corrected_status", correctedStatus);
        correctionMetadata.put("notes", notes);
        correctionMetadata.put("clear_correction", correctedStatus == null);
        var metadataJson = toJson(correctionMetadata);
        appendAttendanceEvent(
            companyId,
            userCompanyId,
            "correction",
            date.atTime(23, 59, 59),
            date,
            null,
            null,
            null,
            null,
            null,
            "admin",
            "manual_override",
            "overridden",
            "correction",
            metadataJson,
            notes,
            null,
            userId
        );

        var refreshed = rebuildDailyRecordProjection(companyId, userCompanyId, date);

        var body = new LinkedHashMap<String, Object>();
        body.put("user_company_id", userCompanyId);
        body.put("date", date.toString());
        body.put("attendance_editable", true);
        body.put("edit_lock_reason", null);
        body.put("system_status", resolveSystemStatus(refreshed, scheduleRule, date));
        body.put("corrected_status", refreshed != null ? refreshed.correctedStatus() : null);
        body.put("effective_status", resolveEffectiveStatus(refreshed, scheduleRule, date));
        body.put("notes", refreshed != null ? refreshed.notes() : null);
        return body;
    }

    @Transactional
    public Map<String, Object> recordManualAttendanceEvent(
        long companyId,
        long userId,
        long userCompanyId,
        LocalDate attendanceDate,
        Map<String, Object> payload
    ) {
        payload = normalizePayload(payload);
        var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        if ("terminated".equals(user.status())) {
            throw new IllegalArgumentException("This user is terminated and cannot record attendance.");
        }
        ensureAttendanceDateEditable(user, attendanceDate);
        if (attendanceDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Manual attendance cannot be recorded for a future date.");
        }

        var eventKind = normalizeEventKind(stringValue(payload, "event_kind", "event_type"));
        if (!List.of("check_in", "check_out").contains(eventKind)) {
            throw new IllegalArgumentException("Manual attendance can only record check_in or check_out.");
        }

        var eventTimestamp = resolveManualAttendanceTimestamp(attendanceDate, eventKind, payload);
        validateOperationalEventTransition(companyId, userCompanyId, attendanceDate, eventTimestamp, eventKind);

        var notes = nullable(stringValue(payload, "notes"));
        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("manual_attendance_event", true);
        metadata.put("attendance_date", attendanceDate.toString());
        metadata.put("event_kind", eventKind);
        metadata.put("event_timestamp", eventTimestamp.toString());
        metadata.put("entered_by_user_id", userId);

        var eventId = appendAttendanceEvent(
            companyId,
            userCompanyId,
            normalizeEventTypeForStorage(eventKind),
            eventTimestamp,
            attendanceDate,
            null,
            null,
            null,
            null,
            null,
            "admin",
            "manual_override",
            "overridden",
            eventKind,
            toJson(metadata),
            notes,
            null,
            userId
        );

        var scheduleRule = loadScheduleRule(companyId, userCompanyId, attendanceDate);
        var refreshed = rebuildDailyRecordProjection(companyId, userCompanyId, attendanceDate);

        var body = new LinkedHashMap<String, Object>();
        body.put("event_id", eventId);
        body.put("event_kind", eventKind);
        body.put("result_status", "overridden");
        body.put("user_company_id", userCompanyId);
        body.put("date", attendanceDate.toString());
        body.put("attendance_editable", true);
        body.put("edit_lock_reason", null);
        body.put("system_status", resolveSystemStatus(refreshed, scheduleRule, attendanceDate));
        body.put("corrected_status", refreshed != null ? refreshed.correctedStatus() : null);
        body.put("effective_status", resolveEffectiveStatus(refreshed, scheduleRule, attendanceDate));
        body.put("notes", refreshed != null ? refreshed.notes() : null);
        body.put("entry_registered", refreshed != null && refreshed.firstCheckInAt() != null);
        body.put("exit_registered", refreshed != null && refreshed.lastCheckOutAt() != null);
        body.put("first_check_in_at", refreshed != null ? toIsoString(refreshed.firstCheckInAt()) : null);
        body.put("last_check_out_at", refreshed != null ? toIsoString(refreshed.lastCheckOutAt()) : null);
        body.put("minutes_late", refreshed != null ? refreshed.minutesLate() : 0);
        body.put("first_location", refreshed != null ? toLocationMap(refreshed.firstLocation()) : null);
        body.put("last_location", refreshed != null ? toLocationMap(refreshed.lastLocation()) : null);
        return body;
    }
}
