package com.indice.erp.dashboard;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class OrganizationService {

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

    public OrganizationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ModuleListItem> listModules(long userId, long companyId) {
        var favorites = Set.copyOf(jdbcTemplate.query(
            "SELECT module_slug FROM user_module_favorites WHERE user_id = ?",
            (rs, rowNum) -> rs.getString(1),
            userId
        ));

        return jdbcTemplate.query(
            """
                SELECT slug, name, description, icon, badge_text, tier, sort_order, is_core, is_active
                FROM modules
                WHERE COALESCE(is_active, 1) = 1
                ORDER BY sort_order ASC, id ASC
                """,
            (rs, rowNum) -> {
                var slug = rs.getString("slug");
                return new ModuleListItem(
                    slug,
                    rs.getString("name"),
                    rs.getString("description"),
                    resolveCategory(slug, rs.getBoolean("is_core"), rs.getString("tier")),
                    rs.getString("badge_text") != null ? rs.getString("badge_text") : rs.getString("tier"),
                    rs.getString("icon") != null ? rs.getString("icon") : "bi-grid",
                    null,
                    favorites.contains(slug),
                    false,
                    "/modules/" + slug + "/"
                );
            }
        );
    }

    public List<UnitSummary> listUnits(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, name, description, status
                FROM units
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC
                """,
            (rs, rowNum) -> new UnitSummary(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("status")
            ),
            companyId
        );
    }

    public List<BusinessSummary> listBusinesses(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, unit_id, name, address, description, status
                FROM businesses
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC
                """,
            (rs, rowNum) -> new BusinessSummary(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                rs.getString("name"),
                rs.getString("address"),
                rs.getString("description"),
                rs.getString("status")
            ),
            companyId
        );
    }

    private String resolveCategory(String slug, boolean isCore, String tier) {
        if (AI_SLUGS.contains(slug)) {
            return "ai";
        }
        if (isCore || BASIC_SLUGS.contains(slug)) {
            return "basic";
        }
        return "complementary";
    }

    private Long getNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    public record UnitSummary(
        long id,
        String name,
        String description,
        String status
    ) {
    }

    public record BusinessSummary(
        long id,
        Long unitId,
        String name,
        String address,
        String description,
        String status
    ) {
    }
}
