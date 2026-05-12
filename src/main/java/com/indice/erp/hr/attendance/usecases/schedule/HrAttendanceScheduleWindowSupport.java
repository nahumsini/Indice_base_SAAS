package com.indice.erp.hr.attendance.usecases.schedule;

import com.indice.erp.hr.attendance.models.ScheduleRule;
import com.indice.erp.hr.attendance.models.ScheduleWindow;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


public abstract class HrAttendanceScheduleWindowSupport extends HrAttendanceScheduleTemplateRepositorySupport {

    protected HrAttendanceScheduleWindowSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected List<ScheduleWindow> loadScheduleWindows(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.query(
            """
                SELECT a.template_id,
                       a.effective_start_date,
                       a.effective_end_date,
                       t.schedule_mode,
                       t.block_after_grace_period,
                       t.enforce_location,
                       t.location_id,
                       l.name AS location_name,
                       d.day_of_week,
                       d.start_time,
                       d.end_time,
                       d.meal_minutes,
                       d.rest_minutes,
                       d.late_after_minutes,
                       d.is_rest_day
                FROM user_schedule_assignments a
                JOIN attendance_schedule_templates t ON t.id = a.template_id
                JOIN attendance_schedule_template_days d ON d.template_id = a.template_id
                LEFT JOIN attendance_locations l ON l.id = t.location_id
                WHERE a.company_id = ?
                  AND a.user_company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(t.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> new ScheduleWindow(
                rs.getLong("template_id"),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class),
                safe(rs.getString("schedule_mode")),
                rs.getBoolean("block_after_grace_period"),
                rs.getBoolean("enforce_location"),
                getNullableLong(rs, "location_id"),
                safe(rs.getString("location_name")),
                rs.getInt("day_of_week"),
                rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class),
                rs.getInt("meal_minutes"),
                rs.getInt("rest_minutes"),
                rs.getInt("late_after_minutes"),
                rs.getBoolean("is_rest_day")
            ),
            companyId,
            userCompanyId,
            endDate,
            startDate
        );
    }

    protected ScheduleRule resolveScheduleRule(List<ScheduleWindow> windows, LocalDate date) {
        return windows.stream()
            .filter(window -> window.dayOfWeek() == date.getDayOfWeek().getValue())
            .filter(window -> !date.isBefore(window.effectiveStartDate()))
            .filter(window -> window.effectiveEndDate() == null || !date.isAfter(window.effectiveEndDate()))
            .map(window -> new ScheduleRule(
                0L,
                window.templateId(),
                window.scheduleMode(),
                window.blockAfterGracePeriod(),
                window.enforceLocation(),
                window.locationId(),
                window.locationName(),
                window.startTime(),
                window.endTime(),
                window.mealMinutes(),
                window.restMinutes(),
                window.lateAfterMinutes(),
                window.isRestDay()
            ))
            .findFirst()
            .orElse(null);
    }

}
