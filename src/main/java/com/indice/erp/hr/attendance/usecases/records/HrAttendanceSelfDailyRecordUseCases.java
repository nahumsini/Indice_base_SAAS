package com.indice.erp.hr.attendance.usecases.records;

import com.indice.erp.hr.attendance.models.AttendanceUser;
import com.indice.erp.hr.attendance.policy.AttendanceEditPolicy;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeAttendanceStatus;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendanceSelfDailyRecordUseCases extends HrAttendanceAdminDailyRecordUseCases {

    protected HrAttendanceSelfDailyRecordUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Transactional
    public Map<String, Object> updateSelfDailyRecord(long companyId, long userId, LocalDate date, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        return updateUserDailyRecord(companyId, attendanceUserLookupService.loadAttendanceSessionUser(companyId, userId), date, payload);
    }

    protected Map<String, Object> updateUserDailyRecord(long companyId, AttendanceUser user, LocalDate date, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        AttendanceEditPolicy.requireEditable(null, date);
        var targetStatusRaw = stringValue(payload, "status", "corrected_status");
        var correctedStatus = targetStatusRaw.isBlank() ? null : normalizeAttendanceStatus(targetStatusRaw);
        var notes = nullable(stringValue(payload, "notes"));
        var correctionMetadata = new LinkedHashMap<String, Object>();
        correctionMetadata.put("subject_type", "user");
        correctionMetadata.put("user_id", user.userId());
        correctionMetadata.put("corrected_status", correctedStatus);
        correctionMetadata.put("notes", notes);
        correctionMetadata.put("clear_correction", correctedStatus == null);
        appendUserAttendanceEvent(
            companyId,
            user,
            "correction",
            date.atTime(23, 59, 59),
            date,
            null,
            null,
            null,
            null,
            null,
            "self",
            "session",
            "overridden",
            "correction",
            toJson(correctionMetadata),
            notes,
            null,
            user.userId()
        );

        var refreshed = rebuildUserDailyRecordProjection(companyId, user, date);
        var body = new LinkedHashMap<String, Object>();
        body.put("subject_type", "user");
        body.put("user_id", user.userId());
        body.put("user_company_id", user.userCompanyId());
        body.put("date", date.toString());
        body.put("attendance_editable", true);
        body.put("edit_lock_reason", null);
        body.put("system_status", resolveSystemStatus(refreshed, null, date));
        body.put("corrected_status", refreshed != null ? refreshed.correctedStatus() : null);
        body.put("effective_status", resolveEffectiveStatus(refreshed, null, date));
        body.put("notes", refreshed != null ? refreshed.notes() : null);
        return body;
    }
}
