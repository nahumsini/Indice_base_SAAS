package com.indice.erp.configcenter.users;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;

public final class ConfigCenterModuleAccessRegistry {

    private final JdbcTemplate jdbcTemplate;

    ConfigCenterModuleAccessRegistry(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<LinkedHashMap<String, Object>> catalogForCompany(
        long companyId,
        boolean protectedActor,
        List<String> actorModuleSlugs
    ) {
        var actorModules = Set.copyOf(actorModuleSlugs == null ? List.of() : actorModuleSlugs);
        return jdbcTemplate.query(
            """
                SELECT module_row.slug,
                       module_row.name,
                       COALESCE(module_row.description, '') AS description,
                       COALESCE(module_row.module_category, 'complementary') AS module_category,
                       COALESCE(module_row.lifecycle_status, 'released') AS lifecycle_status,
                       COALESCE(module_row.access_model, 'module') AS access_model,
                       COALESCE(module_row.assignment_enabled, 1) AS assignment_enabled,
                       COALESCE(module_row.route_key, '') AS route_key,
                       CASE WHEN entitlement.id IS NULL THEN 0 ELSE 1 END AS entitled
                FROM modules module_row
                LEFT JOIN company_module_entitlements entitlement
                  ON entitlement.company_id = ?
                 AND entitlement.module_slug = module_row.slug
                 AND LOWER(COALESCE(entitlement.status, 'active')) = 'active'
                WHERE COALESCE(module_row.is_active, 1) = 1
                ORDER BY module_row.sort_order ASC, module_row.name ASC
                """,
            (rs, rowNum) -> {
                var slug = rs.getString("slug");
                var lifecycle = rs.getString("lifecycle_status");
                var entitled = rs.getBoolean("entitled");
                var assignmentEnabled = rs.getBoolean("assignment_enabled");
                var assignable = entitled
                    && assignmentEnabled
                    && ("pilot".equalsIgnoreCase(lifecycle) || "released".equalsIgnoreCase(lifecycle));
                var module = new LinkedHashMap<String, Object>();
                module.put("slug", slug);
                module.put("name", rs.getString("name"));
                module.put("description", rs.getString("description"));
                module.put("category", rs.getString("module_category"));
                module.put("lifecycle_status", lifecycle);
                module.put("access_model", rs.getString("access_model"));
                module.put("assignment_enabled", assignmentEnabled);
                module.put("route_key", rs.getString("route_key"));
                module.put("entitled", entitled);
                module.put("assignable", assignable);
                return module;
            },
            companyId
        ).stream()
            .filter(module -> protectedActor || actorModules.contains(String.valueOf(module.get("slug"))))
            .toList();
    }

    public void ensureAssignableToCompany(long companyId, List<String> moduleSlugs) {
        ensureAssignableToCompany(companyId, moduleSlugs, List.of());
    }

    public void ensureAssignableToCompany(long companyId, List<String> moduleSlugs, List<String> grandfatheredSlugs) {
        if (moduleSlugs == null || moduleSlugs.isEmpty()) {
            return;
        }

        var requested = new ArrayList<>(new LinkedHashSet<>(moduleSlugs));
        var grandfathered = Set.copyOf(grandfatheredSlugs == null ? List.of() : grandfatheredSlugs);
        var placeholders = String.join(",", Collections.nCopies(requested.size(), "?"));
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(requested);
        var assignable = new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT module_row.slug
                FROM modules module_row
                INNER JOIN company_module_entitlements entitlement
                  ON entitlement.company_id = ?
                 AND entitlement.module_slug = module_row.slug
                 AND LOWER(COALESCE(entitlement.status, 'active')) = 'active'
                WHERE module_row.slug IN (%s)
                  AND COALESCE(module_row.is_active, 1) = 1
                  AND COALESCE(module_row.assignment_enabled, 1) = 1
                  AND LOWER(COALESCE(module_row.lifecycle_status, 'released')) IN ('pilot', 'released')
                """.formatted(placeholders),
            (rs, rowNum) -> rs.getString("slug"),
            params.toArray()
        ));

        var unavailable = new LinkedHashSet<>(requested);
        unavailable.removeAll(assignable);
        unavailable.removeAll(grandfathered);
        if (!unavailable.isEmpty()) {
            throw new IllegalArgumentException(
                "Module access is not available for this company: " + String.join(", ", unavailable)
            );
        }
    }
}
