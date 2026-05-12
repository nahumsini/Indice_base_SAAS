package com.indice.erp.hr.attendance.kiosk;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Repository
public class AttendanceKioskDeviceRepository {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceKioskDeviceRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<KioskDeviceRow> list(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT d.id,
                       d.company_id,
                       d.unit_id,
                       u.name AS unit_name,
                       d.business_id,
                       b.name AS business_name,
                       d.location_id,
                       l.name AS location_name,
                       d.code,
                       d.name,
                       COALESCE(LOWER(d.status), 'active') AS status,
                       d.public_access_token,
                       d.metadata_json
                FROM attendance_kiosk_devices d
                LEFT JOIN units u ON u.id = d.unit_id
                LEFT JOIN businesses b ON b.id = d.business_id
                LEFT JOIN attendance_locations l ON l.id = d.location_id
                WHERE d.company_id = ?
                ORDER BY CASE LOWER(COALESCE(d.status, 'active')) WHEN 'active' THEN 0 ELSE 1 END, d.name ASC
                """,
            (rs, rowNum) -> mapRow(rs),
            companyId
        );
    }

    public KioskDeviceRow get(long companyId, long kioskDeviceId) {
        var rows = jdbcTemplate.query(
            """
                SELECT d.id,
                       d.company_id,
                       d.unit_id,
                       u.name AS unit_name,
                       d.business_id,
                       b.name AS business_name,
                       d.location_id,
                       l.name AS location_name,
                       d.code,
                       d.name,
                       COALESCE(LOWER(d.status), 'active') AS status,
                       d.public_access_token,
                       d.metadata_json
                FROM attendance_kiosk_devices d
                LEFT JOIN units u ON u.id = d.unit_id
                LEFT JOIN businesses b ON b.id = d.business_id
                LEFT JOIN attendance_locations l ON l.id = d.location_id
                WHERE d.company_id = ?
                  AND d.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapRow(rs),
            companyId,
            kioskDeviceId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Kiosk device not found.");
        }
        return rows.getFirst();
    }

    public KioskDeviceRow getByPublicAccessToken(String publicAccessToken) {
        var normalizedToken = publicAccessToken == null ? "" : publicAccessToken.trim();
        if (normalizedToken.isBlank()) {
            throw new IllegalArgumentException("Kiosk device token is required.");
        }

        var rows = jdbcTemplate.query(
            """
                SELECT d.id,
                       d.company_id,
                       d.unit_id,
                       u.name AS unit_name,
                       d.business_id,
                       b.name AS business_name,
                       d.location_id,
                       l.name AS location_name,
                       d.code,
                       d.name,
                       COALESCE(LOWER(d.status), 'active') AS status,
                       d.public_access_token,
                       d.metadata_json
                FROM attendance_kiosk_devices d
                LEFT JOIN units u ON u.id = d.unit_id
                LEFT JOIN businesses b ON b.id = d.business_id
                LEFT JOIN attendance_locations l ON l.id = d.location_id
                WHERE d.public_access_token = ?
                  AND COALESCE(LOWER(d.status), 'active') = 'active'
                LIMIT 1
                """,
            (rs, rowNum) -> mapRow(rs),
            normalizedToken
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Public kiosk device not found.");
        }
        return rows.getFirst();
    }

    private KioskDeviceRow mapRow(ResultSet rs) throws SQLException {
        return new KioskDeviceRow(
            rs.getLong("id"),
            rs.getLong("company_id"),
            getNullableLong(rs, "unit_id"),
            safe(rs.getString("unit_name")),
            getNullableLong(rs, "business_id"),
            safe(rs.getString("business_name")),
            getNullableLong(rs, "location_id"),
            safe(rs.getString("location_name")),
            safe(rs.getString("code")),
            safe(rs.getString("name")),
            safe(rs.getString("status")),
            safe(rs.getString("public_access_token")),
            safe(rs.getString("metadata_json"))
        );
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
