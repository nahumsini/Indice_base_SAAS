package com.indice.erp.hr.attendance.locations;

import com.indice.erp.hr.attendance.models.LocationRow;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;


@Repository
public class AttendanceLocationRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AttendanceLocationMapper mapper;

    public AttendanceLocationRepository(JdbcTemplate jdbcTemplate, AttendanceLocationMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    public List<LocationRow> listLocations(long companyId) {
        return loadLocationRows(companyId, true);
    }

    public Map<Long, List<LocationRow>> groupLocationsByBusiness(List<LocationRow> locations) {
        var grouped = new HashMap<Long, List<LocationRow>>();
        for (var location : locations) {
            if (location.businessId() != null) {
                grouped.computeIfAbsent(location.businessId(), ignored -> new ArrayList<>()).add(location);
            }
        }
        return grouped;
    }

    public List<LocationRow> loadLocationRows(long companyId, boolean activeOnly) {
        var sql = locationSelectWithAssignments()
            + " WHERE l.company_id = ?"
            + (activeOnly ? " AND LOWER(COALESCE(l.status, 'active')) = 'active'" : "")
            + " ORDER BY CASE LOWER(COALESCE(l.status, 'active')) WHEN 'active' THEN 0 ELSE 1 END, l.name ASC";
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapper.mapWithAssignments(rs), companyId);
    }

    public LocationRow loadLocation(long companyId, Long locationId) {
        if (locationId == null) {
            throw new NoSuchElementException("Attendance location not found.");
        }
        var rows = jdbcTemplate.query(
            locationSelectWithAssignments() + " WHERE l.company_id = ? AND l.id = ? LIMIT 1",
            (rs, rowNum) -> mapper.mapWithAssignments(rs),
            companyId,
            locationId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attendance location not found.");
        }
        return rows.getFirst();
    }

    public List<LocationRow> loadBusinessAttendanceLocations(long companyId, Long businessId) {
        if (businessId == null) {
            return List.of();
        }
        return jdbcTemplate.query(
            locationSelect()
                + """
                 WHERE l.company_id = ?
                   AND l.business_id = ?
                   AND LOWER(COALESCE(l.status, 'active')) = 'active'
                 ORDER BY l.name ASC
                """,
            (rs, rowNum) -> mapper.mapBasic(rs),
            companyId,
            businessId
        );
    }

    public List<LocationRow> loadCompanyBusinessStructureAttendanceLocations(long companyId) {
        return jdbcTemplate.query(
            locationSelect()
                + """
                 WHERE l.company_id = ?
                   AND l.managed_source = 'business_structure'
                   AND LOWER(COALESCE(l.status, 'active')) = 'active'
                 ORDER BY l.name ASC
                """,
            (rs, rowNum) -> mapper.mapBasic(rs),
            companyId
        );
    }

    public List<LocationRow> loadUserAttendanceLocations(long companyId) {
        return listLocations(companyId);
    }

    public List<LocationRow> loadBusinessStructureAttendanceLocations(long companyId, Long businessId) {
        if (businessId == null) {
            return List.of();
        }
        return jdbcTemplate.query(
            locationSelect()
                + """
                 WHERE l.company_id = ?
                   AND l.business_id = ?
                   AND l.managed_source = 'business_structure'
                   AND LOWER(COALESCE(l.status, 'active')) = 'active'
                 ORDER BY l.name ASC
                """,
            (rs, rowNum) -> mapper.mapBasic(rs),
            companyId,
            businessId
        );
    }

    private String locationSelect() {
        return "SELECT " + locationColumns() + locationFrom();
    }

    private String locationSelectWithAssignments() {
        return "SELECT "
            + locationColumns()
            + """
                   ,
                   (
                       SELECT COUNT(DISTINCT a.user_company_id)
                       FROM user_work_site_assignments a
                       WHERE a.company_id = l.company_id
                         AND a.location_id = l.id
                         AND LOWER(COALESCE(a.status, 'active')) = 'active'
                         AND a.effective_start_date <= CURRENT_DATE
                         AND (a.effective_end_date IS NULL OR a.effective_end_date >= CURRENT_DATE)
                   ) AS assigned_user_count,
                   (
                       SELECT GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))), ''), CONCAT('User ', e.id)) ORDER BY e.first_name ASC, e.last_name ASC SEPARATOR ', ')
                       FROM user_work_site_assignments a
                       JOIN hr_users e ON e.id = a.user_company_id
                       WHERE a.company_id = l.company_id
                         AND a.location_id = l.id
                         AND LOWER(COALESCE(a.status, 'active')) = 'active'
                         AND a.effective_start_date <= CURRENT_DATE
                         AND (a.effective_end_date IS NULL OR a.effective_end_date >= CURRENT_DATE)
                   ) AS assigned_user_names
            """
            + locationFrom();
    }

    private String locationColumns() {
        return """
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
            COALESCE(l.managed_source, '') AS managed_source,
            COALESCE(LOWER(l.status), 'active') AS status
            """;
    }

    private String locationFrom() {
        return """
            FROM attendance_locations l
            LEFT JOIN units u ON u.id = l.unit_id
            LEFT JOIN businesses b ON b.id = l.business_id
            """;
    }
}
