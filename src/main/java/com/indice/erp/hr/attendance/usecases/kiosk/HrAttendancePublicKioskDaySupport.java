package com.indice.erp.hr.attendance.usecases.kiosk;

import com.indice.erp.hr.attendance.models.DailyRecordRow;
import com.indice.erp.hr.attendance.models.ScheduleRule;
import com.indice.erp.hr.attendance.usecases.records.HrAttendanceUserDailyProjectionSupport;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;


public abstract class HrAttendancePublicKioskDaySupport extends HrAttendanceUserDailyProjectionSupport {

    protected HrAttendancePublicKioskDaySupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected Map<String, Object> toPublicKioskDayActivity(LocalDate attendanceDate, DailyRecordRow dailyRecord, ScheduleRule scheduleRule) {
        var body = new LinkedHashMap<String, Object>();
        body.put("attendance_date", attendanceDate.toString());
        body.put("status", resolveEffectiveStatus(dailyRecord, scheduleRule, attendanceDate));
        body.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
        body.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
        body.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
        body.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : 0);
        body.put("has_check_in", dailyRecord != null && dailyRecord.firstCheckInAt() != null);
        body.put("has_check_out", dailyRecord != null && dailyRecord.lastCheckOutAt() != null);
        body.put("has_active_check_in", dailyRecord != null && dailyRecord.firstCheckInAt() != null && dailyRecord.lastCheckOutAt() == null);
        body.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
        body.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
        return body;
    }
}
