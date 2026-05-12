package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.models.ScopeBusinessRow;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Component
public class AttendanceKioskDeviceValidator {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceKioskDeviceValidator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    LocationRow loadLocation(long companyId, Long locationId) {
        if (locationId == null) {
            throw new NoSuchElementException("Attendance location not found.");
        }
        var rows = jdbcTemplate.query(
            """
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
                       COALESCE(l.managed_source, '') AS managed_source,
                       COALESCE(LOWER(l.status), 'active') AS status
                FROM attendance_locations l
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE l.company_id = ? AND l.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapLocation(rs),
            companyId,
            locationId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attendance location not found.");
        }
        return rows.getFirst();
    }

    void validateOperationalScope(long companyId, Long unitId, Long businessId, Long locationId) {
        if (unitId != null) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM units WHERE id = ? AND (company_id = ? OR company_id IS NULL)",
                Integer.class,
                unitId,
                companyId
            );
            if (count == null || count == 0) {
                throw new IllegalArgumentException("Selected unit does not exist.");
            }
        }
        if (businessId != null) {
            validateBusinessScope(companyId, unitId, businessId);
        }
        if (locationId != null) {
            loadLocation(companyId, locationId);
        }
    }

    void ensureBusinessUnitKioskScopeHasLocations(long companyId, Long unitId, Long businessId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM attendance_locations l
                WHERE l.company_id = ?
                  AND l.managed_source = 'business_structure'
                  AND l.business_id IS NOT NULL
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                  AND (? IS NULL OR l.unit_id = ?)
                  AND (? IS NULL OR l.business_id = ?)
                """,
            Integer.class,
            companyId,
            unitId,
            unitId,
            businessId,
            businessId
        );
        if (count == null || count == 0) {
            throw new IllegalArgumentException("No active Business Structure attendance locations are available for this kiosk scope.");
        }
    }

    void ensureUniqueKioskCode(long companyId, Long kioskDeviceId, String code) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM attendance_kiosk_devices
                WHERE company_id = ?
                  AND LOWER(code) = LOWER(?)
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            code,
            kioskDeviceId,
            kioskDeviceId
        );
        if (count != null && count > 0) {
            throw new IllegalArgumentException("Kiosk code must be unique.");
        }
    }

    private void validateBusinessScope(long companyId, Long unitId, long businessId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, unit_id
                FROM businesses
                WHERE id = ?
                  AND (company_id = ? OR company_id IS NULL)
                LIMIT 1
                """,
            (rs, rowNum) -> new ScopeBusinessRow(rs.getLong("id"), getNullableLong(rs, "unit_id")),
            businessId,
            companyId
        );
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Selected business does not exist.");
        }
        var business = rows.getFirst();
        if (unitId != null && business.unitId() != null && !unitId.equals(business.unitId())) {
            throw new IllegalArgumentException("The selected business does not belong to the selected unit.");
        }
    }

    private LocationRow mapLocation(ResultSet rs) throws SQLException {
        return new LocationRow(
            rs.getLong("id"),
            getNullableLong(rs, "unit_id"),
            safe(rs.getString("unit_name")),
            getNullableLong(rs, "business_id"),
            safe(rs.getString("business_name")),
            rs.getObject("contract_start_date", LocalDate.class),
            rs.getObject("contract_end_date", LocalDate.class),
            safe(rs.getString("name")),
            rs.getBigDecimal("latitude"),
            rs.getBigDecimal("longitude"),
            rs.getInt("radius_meters"),
            rs.getBigDecimal("required_hours_per_day"),
            rs.getObject("required_start_time", LocalTime.class),
            rs.getObject("required_end_time", LocalTime.class),
            rs.getInt("required_days_per_week"),
            safe(rs.getString("managed_source")),
            safe(rs.getString("status")),
            0,
            ""
        );
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record ScopeBusinessRow(long id, Long unitId) {
    }
}
