package com.indice.erp.hr.attendance.usecases.records;

import com.indice.erp.hr.attendance.usecases.jobs.HrAttendanceAutoCheckoutUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.ArrayList;
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
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
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
    public Map<String, Object> bulkUpdateDailyRecords(long companyId, long userId, long userCompanyId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var dates = parseBulkDates(payload);
        var correctionPayload = new LinkedHashMap<String, Object>();
        correctionPayload.put("status", payload.get("status"));
        correctionPayload.put("corrected_status", payload.get("corrected_status"));
        correctionPayload.put("notes", payload.get("notes"));

        var items = new ArrayList<Map<String, Object>>();
        for (var date : dates) {
            items.add(updateDailyRecord(companyId, userId, userCompanyId, date, correctionPayload));
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("items", items);
        body.put("updated_count", items.size());
        return body;
    }

    @Transactional
    public Map<String, Object> bulkAssignRestDays(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var assignments = parseRestPlanAssignments(payload);
        var notes = nullable(stringValue(payload, "notes"));
        var correctionPayload = new LinkedHashMap<String, Object>();
        correctionPayload.put("status", "rest");
        correctionPayload.put("notes", notes);

        var items = new ArrayList<Map<String, Object>>();
        for (var assignment : assignments) {
            for (var date : assignment.dates()) {
                items.add(updateDailyRecord(companyId, userId, assignment.userCompanyId(), date, correctionPayload));
            }
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("items", items);
        body.put("updated_count", items.size());
        body.put("employee_count", assignments.size());
        return body;
    }

    private List<RestPlanAssignment> parseRestPlanAssignments(Map<String, Object> payload) {
        var rawAssignments = payload.get("assignments");
        if (!(rawAssignments instanceof List<?> assignmentsInput) || assignmentsInput.isEmpty()) {
            throw new IllegalArgumentException("At least one rest assignment is required.");
        }
        if (assignmentsInput.size() > 100) {
            throw new IllegalArgumentException("Rest plan is limited to 100 collaborator assignments.");
        }

        var assignments = new ArrayList<RestPlanAssignment>();
        var operationCount = 0;
        for (var rawAssignment : assignmentsInput) {
            if (!(rawAssignment instanceof Map<?, ?> assignmentInput)) {
                throw new IllegalArgumentException("Rest assignments must be valid objects.");
            }
            var assignmentPayload = new LinkedHashMap<String, Object>();
            assignmentInput.forEach((key, value) -> {
                if (key instanceof String stringKey) {
                    assignmentPayload.put(stringKey, value);
                }
            });
            var userCompanyId = parseLong(assignmentPayload, "user_company_id");
            var dates = parseBulkDates(assignmentPayload);
            operationCount += dates.size();
            if (operationCount > 250) {
                throw new IllegalArgumentException("Rest plan is limited to 250 day assignments.");
            }
            assignments.add(new RestPlanAssignment(userCompanyId, dates));
        }
        return assignments;
    }

    private List<LocalDate> parseBulkDates(Map<String, Object> payload) {
        var rawDates = payload.get("dates");
        if (!(rawDates instanceof List<?> datesInput) || datesInput.isEmpty()) {
            throw new IllegalArgumentException("At least one attendance date is required.");
        }
        if (datesInput.size() > 62) {
            throw new IllegalArgumentException("Bulk attendance updates are limited to 62 dates.");
        }

        var dates = new ArrayList<LocalDate>();
        for (var rawDate : datesInput) {
            if (!(rawDate instanceof String dateText) || isBlank(dateText)) {
                throw new IllegalArgumentException("Attendance dates must be valid ISO dates.");
            }
            var parsedDate = com.indice.erp.hr.attendance.HrAttendanceService.parseDate(dateText);
            if (!dates.contains(parsedDate)) {
                dates.add(parsedDate);
            }
        }
        return dates;
    }

    private record RestPlanAssignment(long userCompanyId, List<LocalDate> dates) {}

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
