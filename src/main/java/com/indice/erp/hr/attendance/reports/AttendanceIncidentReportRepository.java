package com.indice.erp.hr.attendance.reports;

import com.indice.erp.hr.HrOperationalScope;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.hr.attendance.reports.AttendanceIncidentReportContracts.Person;

@Repository
public class AttendanceIncidentReportRepository {
    private final JdbcTemplate jdbc;

    public AttendanceIncidentReportRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Includes former employees whose retained employment dates overlap the requested period. */
    public List<Person> people(long companyId, HrOperationalScope scope, LocalDate from, LocalDate to,
                               Long unitId, Long businessId, Long employeeId) {
        var sql = """
            SELECT e.id, COALESCE(e.user_code, '') AS code,
                   TRIM(CONCAT_WS(' ', e.first_name, e.last_name)) AS name,
                   COALESCE(e.position, '') AS position, COALESCE(e.department, '') AS department,
                   e.unit_id, COALESCE(u.name, '') AS unit_name,
                   e.business_id, COALESCE(b.name, '') AS business_name,
                   e.hire_date, COALESCE(e.last_working_day, e.termination_date) AS last_working_day,
                   COALESCE(e.status, 'active') AS employment_status
            FROM hr_users e
            LEFT JOIN units u ON u.id = e.unit_id AND u.company_id = e.company_id
            LEFT JOIN businesses b ON b.id = e.business_id AND b.company_id = e.company_id
            WHERE e.company_id = ?
              AND e.work_profile_id IS NOT NULL
              AND (e.hire_date IS NULL OR e.hire_date <= ?)
              AND (COALESCE(e.last_working_day, e.termination_date) IS NULL
                   OR COALESCE(e.last_working_day, e.termination_date) >= ?)
            """ + scope.hrUserPredicate("e");
        var args = new ArrayList<Object>(List.of(companyId, to, from));
        args.addAll(scope.hrUserParameters());
        if (unitId != null) { sql += " AND e.unit_id = ?"; args.add(unitId); }
        if (businessId != null) { sql += " AND e.business_id = ?"; args.add(businessId); }
        if (employeeId != null) { sql += " AND e.id = ?"; args.add(employeeId); }
        sql += " ORDER BY name, e.id LIMIT 201";
        return jdbc.query(sql, (rs, n) -> new Person(rs.getLong("id"), rs.getString("code"),
            rs.getString("name"), rs.getString("position"), rs.getString("department"),
            rs.getObject("unit_id", Long.class), rs.getString("unit_name"),
            rs.getObject("business_id", Long.class), rs.getString("business_name"),
            rs.getObject("hire_date", LocalDate.class), rs.getObject("last_working_day", LocalDate.class),
            rs.getString("employment_status")), args.toArray());
    }
}
