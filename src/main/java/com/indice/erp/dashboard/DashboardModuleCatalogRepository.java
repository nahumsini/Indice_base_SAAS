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

    private static final Set<String> BASIC_SLUGS = Set.of(
        "config_center",
        "human_resources",
        "expenses",
        "petty_cash",
        "pos",
        "processes",
        "sales",
        "kpis"
    );

    private static final Set<String> AI_SLUGS = Set.of(
        "agente_ventas",
        "indice_analitica",
        "capacitacion",
        "coach"
    );

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
                SELECT slug, name, description, icon, badge_text, tier, sort_order, is_core, is_active
                FROM modules
                WHERE COALESCE(is_active, 1) = 1
                  %s
                ORDER BY sort_order ASC, id ASC
                """, moduleFilter),
            (rs, rowNum) -> {
                var slug = rs.getString("slug");
                return new ModuleListItem(
                    slug,
                    rs.getString("name"),
                    rs.getString("description"),
                    resolveCategory(slug, rs.getBoolean("is_core")),
                    rs.getString("badge_text") != null ? rs.getString("badge_text") : rs.getString("tier"),
                    rs.getString("icon") != null ? rs.getString("icon") : "bi-grid",
                    null,
                    favorites.contains(slug),
                    false,
                    "/modules/" + slug + "/"
                );
            },
            params.toArray()
        );
    }

    private String resolveCategory(String slug, boolean isCore) {
        if (AI_SLUGS.contains(slug)) {
            return "ai";
        }
        if (isCore || BASIC_SLUGS.contains(slug)) {
            return "basic";
        }
        return "complementary";
    }
}
