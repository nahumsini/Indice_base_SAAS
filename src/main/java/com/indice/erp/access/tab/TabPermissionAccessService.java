package com.indice.erp.access.tab;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.auth.AuthSessionUser;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class TabPermissionAccessService {

    private static final Set<String> UNRESTRICTED_ROLES = Set.of("root", "superadmin");

    private final JdbcTemplate jdbcTemplate;

    public TabPermissionAccessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean canAccess(AuthSessionUser user, TabPermissionRequirement requirement) {
        if (UNRESTRICTED_ROLES.contains(normalizeRole(user.role()))) {
            return true;
        }

        var userCompanyId = resolveUserCompanyId(user);
        if (userCompanyId == null) {
            return false;
        }

        var assignedModules = assignedModules(userCompanyId);
        var allowedPermissions = allowedPermissions(userCompanyId);
        for (var requiredPermission : requirement.anyOf()) {
            var separator = requiredPermission.indexOf('.');
            if (separator < 1 || separator == requiredPermission.length() - 1) {
                continue;
            }
            var moduleSlug = ModuleSlugNormalizer.normalize(requiredPermission.substring(0, separator));
            if (assignedModules.contains(moduleSlug) && allowedPermissions.contains(requiredPermission)) {
                return true;
            }
        }
        return false;
    }

    private Long resolveUserCompanyId(AuthSessionUser user) {
        if (user.userCompanyId() != null) {
            return user.userCompanyId();
        }
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
            user.userId(),
            user.companyId()
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Set<String> assignedModules(long userCompanyId) {
        return new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM user_company_module_roles
                WHERE user_company_id = ?
                """,
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")),
            userCompanyId
        ));
    }

    private Set<String> allowedPermissions(long userCompanyId) {
        return new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT module_slug, tab_key
                FROM user_company_tab_permissions
                WHERE user_company_id = ?
                  AND can_view = 1
                """,
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")) + "." + rs.getString("tab_key"),
            userCompanyId
        ));
    }

    private String normalizeRole(String rawRole) {
        var role = rawRole == null ? "" : rawRole.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(role) ? "superadmin" : role;
    }
}
