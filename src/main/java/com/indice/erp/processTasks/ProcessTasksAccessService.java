package com.indice.erp.processTasks;

import com.indice.erp.auth.AuthSessionUser;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ProcessTasksAccessService {

    private static final String PROCESS_TASKS_MODULE = "processes";
    private static final Set<String> FULL_ACCESS_ROLES = Set.of("root", "superadmin");
    private static final Set<String> LEGACY_ADMIN_ROLES = Set.of("admin", "owner", "dueno");

    private final JdbcTemplate jdbcTemplate;

    public ProcessTasksAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean canAccess(AuthSessionUser currentUser) {
        var role = normalizeRole(currentUser.role());
        if (FULL_ACCESS_ROLES.contains(role)) {
            return true;
        }

        var userCompanyId = activeUserCompanyId(currentUser);
        if (userCompanyId == null) {
            return false;
        }

        var moduleSlugs = listModuleSlugs(userCompanyId);
        if (moduleSlugs.isEmpty()) {
            return LEGACY_ADMIN_ROLES.contains(role);
        }

        return moduleSlugs.contains(PROCESS_TASKS_MODULE);
    }

    private Long activeUserCompanyId(AuthSessionUser currentUser) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM user_companies
                WHERE user_id = ?
                  AND company_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            currentUser.userId(),
            currentUser.companyId()
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Set<String> listModuleSlugs(long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM user_company_module_roles
                WHERE user_company_id = ?
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> normalizeModuleSlug(rs.getString("module_slug")),
            userCompanyId
        );

        var moduleSlugs = new LinkedHashSet<String>();
        for (var row : rows) {
            if (!row.isBlank()) {
                moduleSlugs.add(row);
            }
        }
        return moduleSlugs;
    }

    private String normalizeRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "super admin", "superadmin" -> "superadmin";
            case "dueño", "dueno" -> "dueno";
            default -> normalized;
        };
    }

    private String normalizeModuleSlug(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
