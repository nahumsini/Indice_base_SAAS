package com.indice.erp.platformadmin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicit draft preparation only: publication and Stripe verification retain their native owners. */
@Service
public class PlatformRegionalCatalogService {
    private final JdbcTemplate jdbc;
    private final PlatformAdminAccessService access;
    private final PlatformCatalogManagementService catalog;
    private final PlatformAuditService audit;

    public PlatformRegionalCatalogService(JdbcTemplate jdbc, PlatformAdminAccessService access,
        PlatformCatalogManagementService catalog, PlatformAuditService audit) {
        this.jdbc = jdbc; this.access = access; this.catalog = catalog; this.audit = audit;
    }

    @Transactional
    public PreparedDraft prepare(long actorUserId) {
        var authority = access.require(actorUserId, "PLATFORM_MODULES_WRITE");
        if (!"PLATFORM_ROOT".equals(authority.role())) {
            throw new PlatformAdminForbiddenException("Only Platform Root can prepare a regional offer.");
        }
        var draft = catalog.createDraft(actorUserId);
        long versionId = ((Number) draft.get("id")).longValue();
        var created = new ArrayList<String>();
        for (var market : List.of("MX", "CA")) {
            for (var plan : definitions(market)) {
                var code = market.toLowerCase(Locale.ROOT) + "_" + plan.code();
                var existing = jdbc.queryForList("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = ?",
                    Long.class, versionId, code);
                // A retry never overwrites edits, prices or an existing operator's draft decisions.
                if (!existing.isEmpty()) continue;
                var children = plan.children().stream().map(child -> jdbc.queryForList(
                    "SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = ? AND active = 1",
                    Long.class, versionId, child).stream().findFirst().orElseThrow(() ->
                        new IllegalStateException("The draft is missing required product " + child))).toList();
                jdbc.update("""
                    INSERT INTO billing_catalog_products (catalog_version_id, product_code, display_name,
                        product_type, commercial_kind, sort_order, active, market_code, included_seats)
                    VALUES (?, ?, ?, 'ADDON', 'PACKAGE', ?, 1, ?, 10)
                    """, versionId, code, plan.name() + " · " + market, plan.order(), market);
                var productId = jdbc.queryForObject("SELECT id FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = ?",
                    Long.class, versionId, code);
                for (int i = 0; i < children.size(); i++) {
                    jdbc.update("INSERT INTO billing_package_items (package_product_id, included_product_id, sort_order) VALUES (?, ?, ?)",
                        productId, children.get(i), i);
                }
                jdbc.update("""
                    INSERT INTO billing_product_capabilities (product_id, capability_code)
                    SELECT DISTINCT ?, capability_code FROM billing_product_capabilities
                    WHERE product_id IN (SELECT included_product_id FROM billing_package_items WHERE package_product_id = ?)
                    """, productId, productId);
                for (var interval : List.of("MONTH", "YEAR")) {
                    jdbc.update("""
                        INSERT INTO billing_catalog_prices (catalog_version_id, catalog_product_id, billable_code,
                            price_type, billing_interval, currency, unit_amount_cents, included_quantity, status)
                        VALUES (?, ?, ?, 'PACKAGE', ?, ?, ?, 1, 'DRAFT')
                        """, versionId, productId, code, interval, "CA".equals(market) ? "CAD" : "MXN",
                        "MONTH".equals(interval) ? plan.monthlyCents() : plan.annualCents());
                }
                created.add(code);
            }
        }
        audit.record(actorUserId, "REGIONAL_CATALOG_DRAFT_PREPARED", "BILLING_CATALOG", Long.toString(versionId),
            null, "SUCCESS", Map.of("createdProducts", created, "includedSeats", 10, "published", false));
        return new PreparedDraft(versionId, String.valueOf(draft.get("version_code")), "DRAFT", false, List.copyOf(created));
    }

    static List<Plan> definitions(String market) {
        boolean canada = "CA".equals(market);
        return List.of(
            new Plan("controla", "Controla", canada ? 19900 : 299900, canada ? 191040 : 2879040, 601,
                List.of("module_hr", "module_process_tasks")),
            new Plan("escala_sales", "Escala · Sales", canada ? 36900 : 549900, canada ? 354240 : 5279040, 602,
                List.of("module_hr", "module_process_tasks", "module_expenses", "module_sales_inventory")),
            new Plan("escala_pos", "Escala · POS", canada ? 36900 : 549900, canada ? 354240 : 5279040, 603,
                List.of("module_hr", "module_process_tasks", "module_expenses", "module_pos_inventory")),
            new Plan("corporativo", "Corporativo", canada ? 64900 : 949900, canada ? 623040 : 9119040, 604,
                List.of("module_hr", "module_process_tasks", "module_expenses", "module_sales_inventory", "module_pos_inventory", "module_receivables"))
        );
    }

    record Plan(String code, String name, long monthlyCents, long annualCents, int order, List<String> children) { }
    public record PreparedDraft(long catalogVersionId, String versionCode, String status, boolean published, List<String> createdProducts) { }
}
