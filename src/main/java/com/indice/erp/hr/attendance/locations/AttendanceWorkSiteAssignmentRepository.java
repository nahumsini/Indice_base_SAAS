package com.indice.erp.hr.attendance.locations;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.models.WorkSiteAssignmentRow;
import com.indice.erp.hr.attendance.users.AttendanceUserLookupService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Repository
public class AttendanceWorkSiteAssignmentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AttendanceUserLookupService attendanceUserLookupService;

    public AttendanceWorkSiteAssignmentRepository(
        JdbcTemplate jdbcTemplate,
        AttendanceUserLookupService attendanceUserLookupService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.attendanceUserLookupService = attendanceUserLookupService;
    }

    public long insertWorkSiteAssignment(
        long companyId,
        long userId,
        long userCompanyId,
        long locationId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                INSERT INTO user_work_site_assignments
                (company_id, user_company_id, user_id, location_id, effective_start_date, effective_end_date, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
                """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, userCompanyId);
            statement.setLong(3, attendanceUserLookupService.loadUserIdForCompanyUser(companyId, userCompanyId));
            statement.setLong(4, locationId);
            statement.setObject(5, effectiveStartDate);
            statement.setObject(6, effectiveEndDate);
            statement.setLong(7, userId);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    public Map<Long, WorkSiteAssignmentRow> loadActiveWorkSiteAssignments(long companyId, LocalDate date) {
        return loadActiveWorkSiteAssignments(companyId, date, HrOperationalScope.corporateOffice());
    }

    public Map<Long, WorkSiteAssignmentRow> loadActiveWorkSiteAssignments(long companyId, LocalDate date, HrOperationalScope scope) {
        var normalizedScope = scope == null ? HrOperationalScope.corporateOffice() : scope;
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        parameters.add(date);
        parameters.add(date);
        var sql = assignmentSelect()
            + """
            WHERE a.company_id = ?
              AND LOWER(COALESCE(a.status, 'active')) = 'active'
              AND LOWER(COALESCE(l.status, 'active')) = 'active'
              AND a.effective_start_date <= ?
              AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
            """;
        if (!normalizedScope.isCorporateOffice()) {
            sql += normalizedScope.assignmentPredicate("l.unit_id", "l.business_id", "l.company_id");
            parameters.addAll(normalizedScope.assignmentParameters());
        }
        sql += " ORDER BY a.user_company_id ASC, a.effective_start_date DESC, a.id DESC";

        var rows = jdbcTemplate.query(
            sql,
            (rs, rowNum) -> mapWorkSiteAssignment(rs),
            parameters.toArray()
        );

        var result = new HashMap<Long, WorkSiteAssignmentRow>();
        for (var row : rows) {
            result.putIfAbsent(row.userCompanyId(), row);
        }
        return result;
    }

    public WorkSiteAssignmentRow loadActiveWorkSiteAssignment(long companyId, long userCompanyId, LocalDate date) {
        return loadActiveWorkSiteAssignments(companyId, date).get(userCompanyId);
    }

    public Map<LocalDate, WorkSiteAssignmentRow> loadActiveWorkSiteAssignments(
        long companyId,
        long userCompanyId,
        LocalDate startDate,
        LocalDate endDate
    ) {
        var rows = jdbcTemplate.query(
            assignmentSelect()
                + """
                WHERE a.company_id = ?
                  AND a.user_company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> mapWorkSiteAssignment(rs),
            companyId,
            userCompanyId,
            endDate,
            startDate
        );

        var result = new HashMap<LocalDate, WorkSiteAssignmentRow>();
        for (var currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
            for (var row : rows) {
                if (!currentDate.isBefore(row.effectiveStartDate())
                    && (row.effectiveEndDate() == null || !currentDate.isAfter(row.effectiveEndDate()))) {
                    result.put(currentDate, row);
                    break;
                }
            }
        }
        return result;
    }

    private String assignmentSelect() {
        return """
            SELECT a.id,
                   a.user_company_id,
                   a.effective_start_date,
                   a.effective_end_date,
                   COALESCE(LOWER(a.status), 'active') AS assignment_status,
                   l.id AS location_id,
                   l.unit_id AS location_unit_id,
                   COALESCE(u.name, '') AS location_unit_name,
                   l.business_id AS location_business_id,
                   COALESCE(b.name, '') AS location_business_name,
                   l.contract_start_date AS location_contract_start_date,
                   l.contract_end_date AS location_contract_end_date,
                   l.name AS location_name,
                   l.latitude AS location_latitude,
                   l.longitude AS location_longitude,
                   l.radius_meters AS location_radius_meters,
                   COALESCE(l.required_hours_per_day, 8.00) AS location_required_hours_per_day,
                   COALESCE(l.required_start_time, TIME('08:00:00')) AS location_required_start_time,
                   COALESCE(l.required_end_time, TIME('16:00:00')) AS location_required_end_time,
                   COALESCE(l.required_days_per_week, 5) AS location_required_days_per_week,
                   COALESCE(LOWER(l.status), 'active') AS location_status
            FROM user_work_site_assignments a
            JOIN attendance_locations l ON l.id = a.location_id
            LEFT JOIN units u ON u.id = l.unit_id
            LEFT JOIN businesses b ON b.id = l.business_id
            """;
    }

    private WorkSiteAssignmentRow mapWorkSiteAssignment(ResultSet rs) throws SQLException {
        var location = new LocationRow(
            rs.getLong("location_id"),
            getNullableLong(rs, "location_unit_id"),
            safe(rs.getString("location_unit_name")),
            getNullableLong(rs, "location_business_id"),
            safe(rs.getString("location_business_name")),
            rs.getObject("location_contract_start_date", LocalDate.class),
            rs.getObject("location_contract_end_date", LocalDate.class),
            safe(rs.getString("location_name")),
            rs.getBigDecimal("location_latitude"),
            rs.getBigDecimal("location_longitude"),
            rs.getInt("location_radius_meters"),
            rs.getBigDecimal("location_required_hours_per_day"),
            rs.getObject("location_required_start_time", LocalTime.class),
            rs.getObject("location_required_end_time", LocalTime.class),
            rs.getInt("location_required_days_per_week"),
            safe(rs.getString("location_status")),
            0,
            ""
        );
        return new WorkSiteAssignmentRow(
            rs.getLong("id"),
            rs.getLong("user_company_id"),
            location,
            rs.getObject("effective_start_date", LocalDate.class),
            rs.getObject("effective_end_date", LocalDate.class),
            safe(rs.getString("assignment_status"))
        );
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
