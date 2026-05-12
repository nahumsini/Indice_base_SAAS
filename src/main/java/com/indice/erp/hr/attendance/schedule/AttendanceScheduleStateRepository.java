package com.indice.erp.hr.attendance.schedule;

import com.indice.erp.hr.attendance.models.ScheduleRule;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Repository
public class AttendanceScheduleStateRepository {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceScheduleStateRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    Map<Long, ScheduleRule> loadScheduleRules(long companyId, LocalDate date) {
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
            (rs, rowNum) -> mapScheduleRule(rs),
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

    Map<Long, ScheduleCandidateAssignment> loadCurrentAssignments(long companyId, LocalDate date) {
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
            (rs, rowNum) -> new ScheduleCandidateAssignment(
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

        var result = new HashMap<Long, ScheduleCandidateAssignment>();
        for (var row : rows) {
            result.putIfAbsent(row.userCompanyId(), row);
        }
        return result;
    }

    private ScheduleRule mapScheduleRule(ResultSet rs) throws SQLException {
        return new ScheduleRule(
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
        );
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
