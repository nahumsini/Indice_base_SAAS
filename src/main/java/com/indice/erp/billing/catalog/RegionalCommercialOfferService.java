package com.indice.erp.billing.catalog;

import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Regional selection is catalog-owned and never falls back to USD, environment Price IDs or marketing data. */
@Service
public class RegionalCommercialOfferService {
    private final JdbcTemplate jdbc;
    private final StripePhaseTwoProperties stripe;

    public RegionalCommercialOfferService(JdbcTemplate jdbc, StripePhaseTwoProperties stripe) {
        this.jdbc = jdbc; this.stripe = stripe;
    }

    public List<CommercialOfferSelection> available(String market, String intervalValue) {
        var country = market == null ? "" : market.toUpperCase(Locale.ROOT);
        if (!List.of("CA", "MX").contains(country)) throw new IllegalArgumentException("Unsupported billing market.");
        var interval = BillingInterval.parse(intervalValue);
        if (!stripe.isEnabled()) return List.of();
        var currency = "CA".equals(country) ? "CAD" : "MXN";
        var mode = "live".equalsIgnoreCase(stripe.getMode()) ? "LIVE" : "TEST";
        return jdbc.query("""
            SELECT product.id, product.product_code, product.display_name, product.product_type,
                   product.included_seats, product.description, version.id AS version_id, version.version_code,
                   price.unit_amount_cents, price.external_price_id
            FROM billing_catalog_products product
            JOIN billing_catalog_versions version ON version.id = product.catalog_version_id AND version.status = 'ACTIVE'
            JOIN billing_catalog_prices price ON price.catalog_product_id = product.id AND price.catalog_version_id = version.id
            WHERE product.market_code = ? AND product.commercial_kind = 'PACKAGE' AND product.active = 1
              AND product.included_seats = 10 AND price.currency = ? AND price.billing_interval = ?
              AND price.unit_amount_cents > 0 AND price.status IN ('READY', 'ACTIVE')
              AND price.external_price_id LIKE 'price_%' AND price.stripe_mode = ?
              AND price.stripe_verified_at IS NOT NULL AND price.stripe_sync_status = 'READY'
              AND product.stripe_mode = price.stripe_mode AND product.stripe_account_id = price.stripe_account_id
              AND product.stripe_account_id IS NOT NULL AND product.external_product_id LIKE 'prod_%'
              AND product.stripe_verified_at IS NOT NULL AND product.stripe_sync_status = 'READY'
              AND price.stripe_tax_behavior = 'EXCLUSIVE'
              AND (price.effective_from IS NULL OR price.effective_from <= CURRENT_TIMESTAMP)
              AND (price.effective_to IS NULL OR price.effective_to > CURRENT_TIMESTAMP)
              AND EXISTS (SELECT 1 FROM billing_product_capabilities c WHERE c.product_id = product.id)
              AND NOT EXISTS (
                  SELECT 1 FROM billing_product_capabilities c
                  LEFT JOIN modules m ON BINARY m.slug = BINARY (CASE c.capability_code WHEN 'sales' THEN 'crm' ELSE c.capability_code END)
                  WHERE c.product_id = product.id AND (m.id IS NULL OR m.is_active = 0 OR m.assignment_enabled = 0
                    OR LOWER(m.lifecycle_status) <> 'released'))
            ORDER BY product.sort_order, product.id
            """, (rs, n) -> {
                var id = rs.getLong("id");
                var amount = rs.getLong("unit_amount_cents");
                var code = rs.getString("product_code");
                var priceId = rs.getString("external_price_id");
                var capabilities = jdbc.query("SELECT CASE capability_code WHEN 'sales' THEN 'crm' ELSE capability_code END FROM billing_product_capabilities WHERE product_id = ? ORDER BY 1",
                    (c, i) -> c.getString(1), id);
                var children = jdbc.query("SELECT p.product_code FROM billing_package_items i JOIN billing_catalog_products p ON p.id = i.included_product_id WHERE i.package_product_id = ? ORDER BY i.sort_order, p.id",
                    (c, i) -> c.getString(1), id);
                var product = new CommercialOfferSelection.Product(id, code, rs.getString("display_name"), rs.getString("product_type"),
                    "PACKAGE", amount, priceId, rs.getString("description"), children, capabilities);
                return new CommercialOfferSelection(rs.getLong("version_id"), rs.getString("version_code"), code, interval,
                    currency, rs.getInt("included_seats"), 0, amount, amount, 0, 0, priceId, null, List.of(product),
                    List.of(new CommercialOfferSelection.LineItem(id, code, "PACKAGE", 1, amount, priceId)),
                    capabilities, amount, 0, null, null);
            }, country, currency, interval.name(), mode);
    }

    public CommercialOfferSelection select(String market, String productCode, String interval) {
        return available(market, interval).stream().filter(offer -> offer.offerCode().equals(productCode)).findFirst()
            .orElseThrow(() -> new IllegalStateException("The regional offer is not published and verified for this environment."));
    }
}
