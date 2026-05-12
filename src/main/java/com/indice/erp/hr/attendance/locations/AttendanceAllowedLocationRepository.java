package com.indice.erp.hr.attendance.locations;

import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.users.AttendanceUserLookupService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;


@Repository
public class AttendanceAllowedLocationRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AttendanceLocationMapper mapper;
    private final AttendanceUserLookupService attendanceUserLookupService;

    public AttendanceAllowedLocationRepository(
        JdbcTemplate jdbcTemplate,
        AttendanceLocationMapper mapper,
        AttendanceUserLookupService attendanceUserLookupService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
        this.attendanceUserLookupService = attendanceUserLookupService;
    }

    public List<LocationRow> loadAllowedLocations(long companyId, long userCompanyId) {
        return jdbcTemplate.query(
            allowedLocationSql()
                + """
                WHERE al.company_id = ?
                  AND al.user_company_id = ?
                  AND LOWER(COALESCE(al.status, 'active')) = 'active'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                ORDER BY l.name ASC
                """,
            (rs, rowNum) -> mapper.mapAllowed(rs),
            companyId,
            userCompanyId
        );
    }

    public Map<Long, List<LocationRow>> loadAllowedLocationsByUser(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT al.user_company_id,
                       l.id,
                       l.unit_id,
                       COALESCE(u.name, '') AS unit_name,
                       l.business_id,
                       COALESCE(b.name, '') AS business_name,
                       l.contract_start_date,
                       l.contract_end_date,
                       l.name,
                       l.latitude,
                       l.longitude,
                       l.radius_meters,
                       COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
                       COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
                       COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
                       COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
                       COALESCE(LOWER(l.status), 'active') AS status
                FROM user_allowed_locations al
                JOIN attendance_locations l ON l.id = al.location_id
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE al.company_id = ?
                  AND LOWER(COALESCE(al.status, 'active')) = 'active'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                ORDER BY al.user_company_id ASC, l.name ASC
                """,
            (rs, rowNum) -> Map.entry(rs.getLong("user_company_id"), mapper.mapAllowed(rs)),
            companyId
        );

        var grouped = new HashMap<Long, List<LocationRow>>();
        for (var row : rows) {
            grouped.computeIfAbsent(row.getKey(), ignored -> new ArrayList<>()).add(row.getValue());
        }
        return grouped;
    }

    public void ensureHrUserAllowedLocation(long companyId, long userId, long userCompanyId, long locationId) {
        jdbcTemplate.update(
            """
            INSERT INTO user_allowed_locations
            (company_id, user_company_id, user_id, location_id, status, created_by)
            VALUES (?, ?, ?, ?, 'active', ?)
            ON DUPLICATE KEY UPDATE
              status = 'active',
              updated_at = CURRENT_TIMESTAMP
            """,
            companyId,
            userCompanyId,
            attendanceUserLookupService.loadUserIdForCompanyUser(companyId, userCompanyId),
            locationId,
            userId
        );
    }

    private String allowedLocationSql() {
        return """
            SELECT l.id,
                   l.unit_id,
                   COALESCE(u.name, '') AS unit_name,
                   l.business_id,
                   COALESCE(b.name, '') AS business_name,
                   l.contract_start_date,
                   l.contract_end_date,
                   l.name,
                   l.latitude,
                   l.longitude,
                   l.radius_meters,
                   COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
                   COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
                   COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
                   COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
                   COALESCE(LOWER(l.status), 'active') AS status
            FROM user_allowed_locations al
            JOIN attendance_locations l ON l.id = al.location_id
            LEFT JOIN units u ON u.id = l.unit_id
            LEFT JOIN businesses b ON b.id = l.business_id
            """;
    }
}
