package com.indice.erp.hr.attendance.kiosk;

import java.sql.SQLException;
import java.sql.Types;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;


@Repository
class AttendanceKioskDeviceWriter {

    private final JdbcTemplate jdbcTemplate;

    AttendanceKioskDeviceWriter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void delete(long companyId, long kioskDeviceId) {
        var deleted = jdbcTemplate.update(
            "DELETE FROM attendance_kiosk_devices WHERE id = ? AND company_id = ?",
            kioskDeviceId,
            companyId
        );
        if (deleted == 0) {
            throw new NoSuchElementException("Kiosk device not found.");
        }
    }

    long insert(
        long companyId,
        long userId,
        String code,
        String name,
        String status,
        KioskDeviceScope scope,
        String publicAccessToken,
        String metadataJson
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO attendance_kiosk_devices
                    (company_id, unit_id, business_id, location_id, code, name, status, public_access_token, metadata_json, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            setNullableLong(statement, 2, scope.unitId());
            setNullableLong(statement, 3, scope.businessId());
            setNullableLong(statement, 4, scope.locationId());
            statement.setString(5, code);
            statement.setString(6, name);
            statement.setString(7, status);
            statement.setString(8, publicAccessToken);
            statement.setString(9, metadataJson);
            statement.setLong(10, userId);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    long update(
        long companyId,
        long kioskDeviceId,
        String code,
        String name,
        String status,
        KioskDeviceScope scope,
        String publicAccessToken,
        String metadataJson
    ) {
        var updated = jdbcTemplate.update(
            """
                UPDATE attendance_kiosk_devices
                SET unit_id = ?, business_id = ?, location_id = ?, code = ?, name = ?, status = ?,
                    public_access_token = ?, metadata_json = CAST(? AS JSON)
                WHERE id = ? AND company_id = ?
                """,
            scope.unitId(),
            scope.businessId(),
            scope.locationId(),
            code,
            name,
            status,
            publicAccessToken,
            metadataJson,
            kioskDeviceId,
            companyId
        );
        if (updated == 0) {
            throw new NoSuchElementException("Kiosk device not found.");
        }
        return kioskDeviceId;
    }

    void rotatePublicAccessToken(long companyId, long kioskDeviceId, String publicAccessToken) {
        var updated = jdbcTemplate.update(
            "UPDATE attendance_kiosk_devices SET public_access_token = ? WHERE id = ? AND company_id = ?",
            publicAccessToken,
            kioskDeviceId,
            companyId
        );
        if (updated == 0) {
            throw new NoSuchElementException("Kiosk device not found.");
        }
    }

    boolean publicAccessTokenExists(String publicAccessToken) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM attendance_kiosk_devices WHERE public_access_token = ?",
            Integer.class,
            publicAccessToken
        );
        return count != null && count > 0;
    }

    private void setNullableLong(java.sql.PreparedStatement statement, int parameterIndex, Long value) throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(parameterIndex, Types.BIGINT);
        } else {
            statement.setLong(parameterIndex, value);
        }
    }
}
