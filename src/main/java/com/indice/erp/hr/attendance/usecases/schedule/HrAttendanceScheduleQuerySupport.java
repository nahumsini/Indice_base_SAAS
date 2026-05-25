package com.indice.erp.hr.attendance.usecases.schedule;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.attendance.models.CurrentScheduleAssignment;
import com.indice.erp.hr.attendance.models.ScheduleRule;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


public abstract class HrAttendanceScheduleQuerySupport extends HrAttendanceScheduleMappingSupport {

    protected HrAttendanceScheduleQuerySupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected Map<Long, ScheduleRule> loadScheduleRules(long companyId, LocalDate date) {
        var rules = jdbcTemplate.query(
            """
                SELECT a.user_company_id,
                       a.template_id,
                       a.effective_start_date,
                       a.effective_end_date,
                       t.schedule_mode,
                       t.block_after_grace_period,
                       t.enforce_location,
                       t.location_id,
                       l.name AS location_name,
                       d.start_time,
                       d.end_time,
                       d.meal_minutes,
                       d.rest_minutes,
                       d.late_after_minutes,
                       d.is_rest_day
                FROM user_schedule_assignments a
                JOIN attendance_schedule_templates t ON t.id = a.template_id
                JOIN attendance_schedule_template_days d
                  ON d.template_id = a.template_id
                 AND d.day_of_week = ?
                LEFT JOIN attendance_locations l ON l.id = t.location_id
                WHERE a.company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(t.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.user_company_id ASC, a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> new ScheduleRule(
                rs.getLong("user_company_id"),
                rs.getLong("template_id"),
                safe(rs.getString("schedule_mode")),
                rs.getBoolean("block_after_grace_period"),
                rs.getBoolean("enforce_location"),
                getNullableLong(rs, "location_id"),
                safe(rs.getString("location_name")),
                rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class),
                rs.getInt("meal_minutes"),
                rs.getInt("rest_minutes"),
                rs.getInt("late_after_minutes"),
                rs.getBoolean("is_rest_day")
            ),
            date.getDayOfWeek().getValue(),
            companyId,
            date,
            date
        );

        var result = new HashMap<Long, ScheduleRule>();
        for (var rule : rules) {
            result.putIfAbsent(rule.userCompanyId(), rule);
        }
        return result;
    }

    protected ScheduleRule loadScheduleRule(long companyId, long userCompanyId, LocalDate date) {
        return loadScheduleRules(companyId, date).get(userCompanyId);
    }

    protected Map<Long, CurrentScheduleAssignment> loadCurrentAssignments(long companyId, LocalDate date) {
        var rows = jdbcTemplate.query(
            """
                SELECT a.user_company_id,
                       a.template_id,
                       t.name AS template_name,
                       a.effective_start_date,
                       a.effective_end_date
                FROM user_schedule_assignments a
                JOIN attendance_schedule_templates t ON t.id = a.template_id
                WHERE a.company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(t.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.user_company_id ASC, a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> new CurrentScheduleAssignment(
                rs.getLong("user_company_id"),
                rs.getLong("template_id"),
                safe(rs.getString("template_name")),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class)
            ),
            companyId,
            date,
            date
        );

        var result = new HashMap<Long, CurrentScheduleAssignment>();
        for (var row : rows) {
            result.putIfAbsent(row.userCompanyId(), row);
        }
        return result;
    }

    protected Map<Long, Integer> loadActiveAssignmentCountsByTemplate(long companyId) {
        return loadActiveAssignmentCountsByTemplate(companyId, HrOperationalScope.corporateOffice());
    }

    protected Map<Long, Integer> loadActiveAssignmentCountsByTemplate(long companyId, HrOperationalScope scope) {
        var normalizedScope = scope == null ? HrOperationalScope.corporateOffice() : scope;
        var sql = new StringBuilder(
            """
                SELECT a.template_id, COUNT(*) AS total_count
                FROM user_schedule_assignments a
                JOIN attendance_schedule_templates t ON t.id = a.template_id
                JOIN hr_users e ON e.id = a.user_company_id
                WHERE a.company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(t.status, 'active')) = 'active'
                """
        );
        var parameters = new java.util.ArrayList<Object>();
        parameters.add(companyId);
        if (!normalizedScope.isCorporateOffice()) {
            sql.append(normalizedScope.hrUserPredicate("e"));
            parameters.addAll(normalizedScope.hrUserParameters());
        }
        sql.append(" GROUP BY a.template_id");
        var rows = jdbcTemplate.query(
            sql.toString(),
            (rs, rowNum) -> Map.entry(rs.getLong("template_id"), rs.getInt("total_count")),
            parameters.toArray()
        );

        var result = new HashMap<Long, Integer>();
        for (var row : rows) {
            result.put(row.getKey(), row.getValue());
        }
        return result;
    }
}
