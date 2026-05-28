package com.indice.erp.hr.attendance.usecases.dashboard;

import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.support.AttendanceLocationPresentation;
import com.indice.erp.hr.attendance.usecases.kiosk.HrAttendancePublicKioskDaySupport;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.calculateMinutesLate;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.dateString;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;


public abstract class HrAttendanceDashboardUseCases extends HrAttendancePublicKioskDaySupport {

    protected HrAttendanceDashboardUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> listDashboard(long companyId, LocalDate date) {
        return buildDashboard(
            companyId,
            date,
            attendanceUserLookupService.listAttendanceUsers(companyId),
            listLocations(companyId)
        );
    }

    protected Map<String, Object> buildDashboard(long companyId, LocalDate date, List<AttendanceHrUser> users) {
        return buildDashboard(companyId, date, users, listLocations(companyId));
    }

    protected Map<String, Object> buildDashboard(
        long companyId,
        LocalDate date,
        List<AttendanceHrUser> users,
        List<LocationRow> locations
    ) {
        var dailyRecordsByUser = attendanceDailyRecordRepository.loadDailyRecords(companyId, date);
        var scheduleRulesByUser = loadScheduleRules(companyId, date);

        var items = new ArrayList<Map<String, Object>>();
        var usersPayload = new ArrayList<Map<String, Object>>();
        int onTimeCount = 0;
        int lateCount = 0;
        int leaveCount = 0;
        int restCount = 0;
        int absenceCount = 0;

        for (var user : users) {
            var dailyRecord = dailyRecordsByUser.get(user.id());
            var scheduleRule = scheduleRulesByUser.get(user.id());
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule, date);
            var editLockReason = attendanceEditLockReason(user, date);

            switch (effectiveStatus) {
                case "on_time" -> onTimeCount++;
                case "late" -> lateCount++;
                case "leave" -> leaveCount++;
                case "rest" -> restCount++;
                case "pending", "not_scheduled" -> {
                }
                default -> absenceCount++;
            }

            var item = new LinkedHashMap<String, Object>();
            item.put("user_company_id", user.id());
            item.put("user_code", user.userCode());
            item.put("user_name", user.fullName());
            item.put("position_title", user.positionTitle());
            item.put("department", user.department());
            item.put("unit_id", user.unitId());
            item.put("unit_name", user.unitName());
            item.put("business_id", user.businessId());
            item.put("business_name", user.businessName());
            item.put("hire_date", dateString(user.hireDate()));
            item.put("attendance_editable", editLockReason == null);
            item.put("edit_lock_reason", editLockReason);
            item.put("status", effectiveStatus);
            item.put("system_status", resolveSystemStatus(dailyRecord, scheduleRule, date));
            item.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            item.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            item.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            item.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            item.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
            item.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : calculateMinutesLate(scheduleRule, null));
            item.put("first_photo_url", dailyRecord != null ? attendancePhotoService.signedAttendancePhotoUrl(dailyRecord.firstPhotoObjectKey()) : null);
            item.put("last_photo_url", dailyRecord != null ? attendancePhotoService.signedAttendancePhotoUrl(dailyRecord.lastPhotoObjectKey()) : null);
            items.add(item);

            var userPayload = new LinkedHashMap<String, Object>();
            userPayload.put("id", user.id());
            userPayload.put("user_code", user.userCode());
            userPayload.put("full_name", user.fullName());
            userPayload.put("position_title", user.positionTitle());
            userPayload.put("department", user.department());
            userPayload.put("unit_id", user.unitId());
            userPayload.put("unit_name", user.unitName());
            userPayload.put("hire_date", dateString(user.hireDate()));
            userPayload.put("status", user.status());
            usersPayload.add(userPayload);
        }

        var summary = new LinkedHashMap<String, Object>();
        summary.put("total_users", users.size());
        summary.put("on_time_count", onTimeCount);
        summary.put("late_count", lateCount);
        summary.put("leave_count", leaveCount);
        summary.put("rest_count", restCount);
        summary.put("absence_count", absenceCount);
        summary.put("locations_count", locations.size());
        summary.put("kiosk_enabled", !locations.isEmpty());

        var body = new LinkedHashMap<String, Object>();
        body.put("date", date.toString());
        body.put("summary", summary);
        body.put("items", items);
        body.put("users", usersPayload);
        body.put("locations", locations.stream().map(AttendanceLocationPresentation::toLocationMap).toList());
        return body;
    }
}
