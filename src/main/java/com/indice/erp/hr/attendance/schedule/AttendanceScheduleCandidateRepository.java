package com.indice.erp.hr.attendance.schedule;

import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import com.indice.erp.hr.attendance.users.AttendanceUserLookupService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Repository
public class AttendanceScheduleCandidateRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AttendanceUserLookupService attendanceUserLookupService;

    public AttendanceScheduleCandidateRepository(
        JdbcTemplate jdbcTemplate,
        AttendanceUserLookupService attendanceUserLookupService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.attendanceUserLookupService = attendanceUserLookupService;
    }

    int countAvailable(
        long companyId,
        LocalDate startDate,
        LocalDate rangeEnd,
        String search,
        Long unitId,
        Long businessId
    ) {
        return count(AttendanceScheduleCandidateSql.available(companyId, startDate, rangeEnd, search, unitId, businessId));
    }

    int countAll(long companyId, String search, Long unitId, Long businessId) {
        return count(AttendanceScheduleCandidateSql.all(companyId, search, unitId, businessId));
    }

    List<AttendanceHrUser> listUsers(
        long companyId,
        LocalDate startDate,
        LocalDate rangeEnd,
        String search,
        Long unitId,
        Long businessId,
        boolean availableOnly,
        int limit,
        int offset
    ) {
        var candidateSql = availableOnly
            ? AttendanceScheduleCandidateSql.available(companyId, startDate, rangeEnd, search, unitId, businessId)
            : AttendanceScheduleCandidateSql.all(companyId, search, unitId, businessId);
        var params = new ArrayList<>(candidateSql.params());
        params.add(limit);
        params.add(offset);
        return jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       e.hire_date AS hire_date,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       u.id AS unit_id,
                       u.name AS unit_name,
                       b.id AS business_id,
                       b.name AS business_name
                FROM hr_users e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE %s
                ORDER BY full_name ASC, e.id ASC
                LIMIT ? OFFSET ?
                """.formatted(candidateSql.where()),
            (rs, rowNum) -> attendanceUserLookupService.mapAttendanceUser(rs),
            params.toArray()
        );
    }

    List<Map<String, Object>> listUnitOptions(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, name
                FROM units
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC
                """,
            (rs, rowNum) -> Map.<String, Object>of("id", rs.getLong("id"), "name", safe(rs.getString("name"))),
            companyId
        );
    }

    List<Map<String, Object>> listBusinessOptions(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT b.id, b.name, u.id AS unit_id, u.name AS unit_name
                FROM businesses b
                LEFT JOIN units u ON u.id = b.unit_id
                WHERE (b.company_id = ? OR b.company_id IS NULL)
                  AND (b.status = 'active' OR b.status IS NULL OR b.status = '')
                ORDER BY b.name ASC
                """,
            (rs, rowNum) -> {
                var option = new LinkedHashMap<String, Object>();
                option.put("id", rs.getLong("id"));
                option.put("name", safe(rs.getString("name")));
                option.put("unit_id", getNullableLong(rs, "unit_id"));
                option.put("unit_name", safe(rs.getString("unit_name")));
                return option;
            },
            companyId
        );
    }

    private int count(AttendanceScheduleCandidateSql.CandidateSql candidateSql) {
        Integer value = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_users e LEFT JOIN units u ON u.id = e.unit_id LEFT JOIN businesses b ON b.id = e.business_id WHERE "
                + candidateSql.where(),
            Integer.class,
            candidateSql.params().toArray()
        );
        return value == null ? 0 : value;
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
