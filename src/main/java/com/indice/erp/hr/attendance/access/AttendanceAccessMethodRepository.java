package com.indice.erp.hr.attendance.access;

import com.indice.erp.hr.attendance.models.AccessMethodRow;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Repository
class AttendanceAccessMethodRepository {

    private final JdbcTemplate jdbcTemplate;

    AttendanceAccessMethodRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<AccessMethodRow> loadAccessMethods(long companyId, Long accessProfileId) {
        return jdbcTemplate.query(
            accessProfileId == null ? accessMethodsSql("") : accessMethodsSql("AND m.access_profile_id = ?"),
            (rs, rowNum) -> mapAccessMethod(rs),
            accessProfileId == null ? new Object[] { companyId } : new Object[] { companyId, accessProfileId }
        );
    }

    AccessMethodRow loadAccessMethod(long companyId, long methodId) {
        return loadAccessMethods(companyId, null).stream()
            .filter((method) -> method.id() == methodId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("HR user access method not found."));
    }

    List<AccessMethodRow> loadPublicKioskAccessMethods(long companyId, String methodType) {
        return jdbcTemplate.query(
            accessMethodsSql("""
                AND COALESCE(LOWER(m.status), 'active') = 'active'
                AND COALESCE(LOWER(p.status), 'active') = 'active'
                AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                AND m.method_type = ?
                """),
            (rs, rowNum) -> mapAccessMethod(rs),
            companyId,
            methodType
        );
    }

    boolean pinCredentialReferenceExists(long companyId, String credentialRef, Long excludedMethodId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_access_methods
                WHERE company_id = ?
                  AND method_type = 'pin'
                  AND credential_ref = ?
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            credentialRef,
            excludedMethodId,
            excludedMethodId
        );
        return count != null && count > 0;
    }

    private String accessMethodsSql(String extraWhere) {
        return """
            SELECT m.id, m.company_id, m.access_profile_id, m.method_type,
                   m.credential_ref, m.secret_hash,
                   COALESCE(LOWER(m.status), 'active') AS status,
                   m.priority, m.metadata_json, p.user_company_id,
                   COALESCE(e.user_code, '') AS user_code,
                   TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS user_name
            FROM user_access_methods m
            JOIN user_access_profiles p ON p.id = m.access_profile_id
            JOIN hr_users e ON e.id = p.user_company_id
            WHERE m.company_id = ?
            %s
            ORDER BY p.user_company_id ASC, m.priority ASC, m.id ASC
            """.formatted(extraWhere);
    }

    private AccessMethodRow mapAccessMethod(ResultSet rs) throws SQLException {
        return new AccessMethodRow(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getLong("access_profile_id"),
            safe(rs.getString("method_type")),
            safe(rs.getString("credential_ref")),
            safe(rs.getString("secret_hash")),
            safe(rs.getString("status")),
            rs.getInt("priority"),
            safe(rs.getString("metadata_json")),
            rs.getLong("user_company_id"),
            safe(rs.getString("user_code")),
            safe(rs.getString("user_name"))
        );
    }
}
