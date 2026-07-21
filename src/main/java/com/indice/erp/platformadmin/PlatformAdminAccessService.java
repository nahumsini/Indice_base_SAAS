package com.indice.erp.platformadmin;

import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PlatformAdminAccessService {

    private final JdbcTemplate jdbcTemplate;

    public PlatformAdminAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Access require(long userId, String permission) {
        var access = find(userId);
        if (access == null || !access.allows(permission)) {
            throw new PlatformAdminForbiddenException("Platform administration access is required.");
        }
        return access;
    }

    public Access find(long userId) {
        var rows = jdbcTemplate.query(
            """
                SELECT administrator.id, administrator.platform_role
                FROM platform_administrators administrator
                WHERE administrator.user_id = ?
                  AND administrator.status = 'ACTIVE'
                LIMIT 1
                """,
            (rs, rowNum) -> new AdminRow(rs.getLong("id"), rs.getString("platform_role")),
            userId
        );
        if (rows.isEmpty()) {
            return null;
        }
        var row = rows.getFirst();
        var permissions = jdbcTemplate.query(
            """
                SELECT permission_code
                FROM platform_administrator_permissions
                WHERE platform_administrator_id = ?
                ORDER BY permission_code
                """,
            (rs, rowNum) -> normalize(rs.getString("permission_code")),
            row.id()
        );
        return new Access(row.id(), normalize(row.role()), permissions);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private record AdminRow(long id, String role) {
    }

    public record Access(long administratorId, String role, List<String> permissions) {
        public boolean allows(String permission) {
            return "PLATFORM_ROOT".equals(role) || permissions.contains(normalize(permission));
        }
    }
}
