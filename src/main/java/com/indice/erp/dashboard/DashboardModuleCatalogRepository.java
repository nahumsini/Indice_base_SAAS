package com.indice.erp.dashboard;

import com.indice.erp.access.ModuleSlugNormalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class DashboardModuleCatalogRepository {

    private final JdbcTemplate jdbcTemplate;

    DashboardModuleCatalogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<ModuleListItem> listModules(
        long userId,
        DashboardModuleAccessRepository.DashboardModuleAccess moduleAccess
    ) {
        if (!moduleAccess.allModules() && moduleAccess.moduleSlugs().isEmpty()) {
            return List.of();
        }

        var favorites = Set.copyOf(jdbcTemplate.query(
            "SELECT module_slug FROM user_module_favorites WHERE user_id = ?",
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString(1)),
            userId
        ));

        var moduleFilter = "";
        var params = new ArrayList<Object>();
        if (!moduleAccess.allModules()) {
            var slugs = new ArrayList<>(moduleAccess.moduleSlugs());
            Collections.sort(slugs);
            moduleFilter = " AND slug IN (" + String.join(",", Collections.nCopies(slugs.size(), "?")) + ")";
            params.addAll(slugs);
        }

        return jdbcTemplate.query(
            String.format("""
                SELECT slug, name, description, icon, badge_text, tier, sort_order, is_core, is_active,
                       COALESCE(module_category, 'complementary') AS module_category,
                       COALESCE(route_key, '') AS route_key
                FROM modules
                WHERE COALESCE(is_active, 1) = 1
                  AND LOWER(COALESCE(lifecycle_status, 'released')) IN ('pilot', 'released')
                  %s
                ORDER BY sort_order ASC, id ASC
                """, moduleFilter),
            (rs, rowNum) -> {
                var slug = rs.getString("slug");
                return new ModuleListItem(
                    slug,
                    rs.getString("name"),
                    rs.getString("description"),
                    rs.getString("module_category"),
                    rs.getString("badge_text") != null ? rs.getString("badge_text") : rs.getString("tier"),
                    rs.getString("icon") != null ? rs.getString("icon") : "bi-grid",
                    null,
                    favorites.contains(slug),
                    false,
                    rs.getString("route_key").isBlank()
                        ? "/modules/" + slug + "/"
                        : "/" + rs.getString("route_key")
                );
            },
            params.toArray()
        );
    }
}
