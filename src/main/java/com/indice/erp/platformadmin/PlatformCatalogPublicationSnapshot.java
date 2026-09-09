package com.indice.erp.platformadmin;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Commercial inputs only: Stripe synchronization and verification may update their own metadata. */
@Component
public class PlatformCatalogPublicationSnapshot {
    private final JdbcTemplate jdbc;

    public PlatformCatalogPublicationSnapshot(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Snapshot capture(long versionId) {
        return new Snapshot(List.of(
            jdbc.queryForList("SELECT id, version_code, status FROM billing_catalog_versions WHERE id = ?", versionId),
            jdbc.queryForList("""
                SELECT id, product_code, display_name, description, product_type, commercial_kind, sort_order, active
                FROM billing_catalog_products WHERE catalog_version_id = ? ORDER BY id
                """, versionId),
            jdbc.queryForList("""
                SELECT id, catalog_product_id, billable_code, price_type, billing_interval, currency,
                       unit_amount_cents, included_quantity
                FROM billing_catalog_prices WHERE catalog_version_id = ? ORDER BY id
                """, versionId),
            jdbc.queryForList("""
                SELECT capability.product_id, capability.capability_code
                FROM billing_product_capabilities capability
                JOIN billing_catalog_products product ON product.id = capability.product_id
                WHERE product.catalog_version_id = ? ORDER BY capability.product_id, capability.capability_code
                """, versionId),
            jdbc.queryForList("""
                SELECT item.package_product_id, item.included_product_id, item.sort_order
                FROM billing_package_items item
                JOIN billing_catalog_products product ON product.id = item.package_product_id
                WHERE product.catalog_version_id = ? ORDER BY item.package_product_id, item.included_product_id
                """, versionId),
            jdbc.queryForList("""
                SELECT id, promotion_code, display_name, description, discount_type, percent_basis_points,
                       amount_off_cents, currency, duration_type, duration_cycles, starts_at, ends_at,
                       external_promotion_code_id, active, sort_order
                FROM billing_catalog_promotions WHERE catalog_version_id = ? ORDER BY id
                """, versionId),
            jdbc.queryForList("""
                SELECT item.promotion_id, item.catalog_product_id
                FROM billing_catalog_promotion_products item
                JOIN billing_catalog_promotions promotion ON promotion.id = item.promotion_id
                WHERE promotion.catalog_version_id = ? ORDER BY item.promotion_id, item.catalog_product_id
                """, versionId)
        ));
    }

    public void requireUnchanged(long versionId, Snapshot expected) {
        if (!expected.equals(capture(versionId))) {
            throw new IllegalStateException("La oferta cambió durante la publicación. Revisa los cambios y vuelve a publicar.");
        }
    }

    public record Snapshot(List<List<Map<String, Object>>> rows) {
    }
}
