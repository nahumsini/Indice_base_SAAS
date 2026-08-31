package com.indice.erp.billing.catalog;

import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
final class VersionedCommercialOfferEngine {

    private static final int INCLUDED_SEATS = 5;
    private static final String ADDITIONAL_MODULE_UNIT = "module_additional_unit";

    private final JdbcTemplate jdbcTemplate;
    private final StripePhaseTwoProperties stripeProperties;

    VersionedCommercialOfferEngine(JdbcTemplate jdbcTemplate, StripePhaseTwoProperties stripeProperties) {
        this.jdbcTemplate = jdbcTemplate;
        this.stripeProperties = stripeProperties;
    }

    boolean configured(long versionId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            """
                SELECT EXISTS(
                    SELECT 1
                    FROM billing_catalog_products product
                    LEFT JOIN billing_catalog_prices price ON price.catalog_product_id = product.id
                    WHERE product.catalog_version_id = ? AND product.active = 1
                      AND (
                          product.commercial_kind = 'SEAT'
                          OR (
                              product.commercial_kind IN ('MODULE', 'PACKAGE')
                              AND price.price_type IN ('PRODUCT', 'PACKAGE')
                          )
                          OR price.external_price_id IS NOT NULL
                          OR price.stripe_mode IS NOT NULL
                          OR price.stripe_verified_at IS NOT NULL
                      )
                )
                """,
            Boolean.class,
            versionId
        ));
    }

    boolean requiresVerifiedReferences() {
        return stripeProperties.isEnabled();
    }

    boolean ready(long versionId, BillingInterval interval) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            """
                SELECT EXISTS(
                    SELECT 1 FROM billing_catalog_products seat
                    JOIN billing_catalog_prices price ON price.catalog_product_id = seat.id
                    WHERE seat.catalog_version_id = ? AND seat.active = 1 AND seat.commercial_kind = 'SEAT'
                      AND price.billing_interval = ? AND price.currency = 'USD'
                      AND price.unit_amount_cents > 0 AND price.status IN ('READY', 'ACTIVE')
                      AND (? = 0 OR (price.stripe_mode = ? AND price.stripe_verified_at IS NOT NULL
                           AND price.stripe_sync_status = 'READY' AND price.external_price_id LIKE 'price_%'))
                )
                AND EXISTS(
                    SELECT 1 FROM billing_catalog_products offer
                    JOIN billing_catalog_prices price ON price.catalog_product_id = offer.id
                    WHERE offer.catalog_version_id = ? AND offer.active = 1
                      AND offer.commercial_kind IN ('MODULE', 'PACKAGE')
                      AND price.billing_interval = ? AND price.currency = 'USD'
                      AND price.unit_amount_cents > 0 AND price.status IN ('READY', 'ACTIVE')
                      AND (? = 0 OR (price.stripe_mode = ? AND price.stripe_verified_at IS NOT NULL
                           AND price.stripe_sync_status = 'READY' AND price.external_price_id LIKE 'price_%'))
                )
                """,
            Boolean.class,
            versionId, interval.name(), verificationFlag(), mode(),
            versionId, interval.name(), verificationFlag(), mode()
        ));
    }

    List<CommercialOfferSelection.Product> products(long versionId, BillingInterval interval) {
        return jdbcTemplate.query(
            """
                SELECT product.id, product.product_code, product.display_name, product.product_type,
                       product.commercial_kind, product.description, price.unit_amount_cents,
                       price.external_price_id,
                       (SELECT GROUP_CONCAT(child.product_code ORDER BY item.sort_order, child.id SEPARATOR ',')
                          FROM billing_package_items item
                          JOIN billing_catalog_products child ON child.id = item.included_product_id
                         WHERE item.package_product_id = product.id) AS included_codes,
                       (SELECT GROUP_CONCAT(capability.capability_code ORDER BY capability.capability_code SEPARATOR ',')
                          FROM billing_product_capabilities capability
                         WHERE capability.product_id = product.id) AS capabilities
                FROM billing_catalog_products product
                JOIN billing_catalog_prices price
                  ON price.catalog_product_id = product.id
                 AND price.billing_interval = ? AND price.currency = 'USD'
                 AND price.price_type IN ('PRODUCT', 'PACKAGE')
                 AND price.status IN ('READY', 'ACTIVE')
                 AND (? = 0 OR (price.stripe_mode = ? AND price.stripe_verified_at IS NOT NULL
                      AND price.stripe_sync_status = 'READY' AND price.external_price_id LIKE 'price_%'))
                 AND (price.effective_from IS NULL OR price.effective_from <= CURRENT_TIMESTAMP)
                 AND (price.effective_to IS NULL OR price.effective_to > CURRENT_TIMESTAMP)
                WHERE product.catalog_version_id = ? AND product.active = 1
                  AND product.commercial_kind IN ('MODULE', 'PACKAGE')
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_product_capabilities capability
                      LEFT JOIN modules module_row
                        ON BINARY module_row.slug = BINARY (CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END)
                      WHERE capability.product_id = product.id
                        AND (module_row.id IS NULL OR module_row.is_active = 0 OR module_row.assignment_enabled = 0
                             OR LOWER(module_row.lifecycle_status) NOT IN ('pilot', 'released'))
                  )
                ORDER BY product.sort_order, product.id
                """,
            (rs, rowNum) -> new CommercialOfferSelection.Product(
                rs.getLong("id"), rs.getString("product_code"), rs.getString("display_name"),
                rs.getString("product_type"), rs.getString("commercial_kind"),
                (Long) rs.getObject("unit_amount_cents"), rs.getString("external_price_id"),
                rs.getString("description"), csv(rs.getString("included_codes")), csv(rs.getString("capabilities"))
            ),
            interval.name(), verificationFlag(), mode(), versionId
        );
    }

    CommercialOfferSelection select(
        long versionId,
        String versionCode,
        List<String> requestedProductCodes,
        BillingInterval interval,
        int extraSeats,
        String promotionCode
    ) {
        var available = products(versionId, interval);
        var requested = normalize(requestedProductCodes);
        var byCode = new LinkedHashMap<String, CommercialOfferSelection.Product>();
        available.forEach(product -> byCode.put(product.code().toLowerCase(Locale.ROOT), product));
        if (requested.isEmpty() || !byCode.keySet().containsAll(requested)) {
            throw new IllegalArgumentException("Selecciona módulos o paquetes vigentes del catálogo.");
        }
        var selected = requested.stream().map(byCode::get).toList();
        requireNoOverlap(selected);

        var lines = new ArrayList<CommercialOfferSelection.LineItem>();
        var packages = selected.stream().filter(CommercialOfferSelection.Product::packageOffer).toList();
        var modules = selected.stream().filter(product -> !product.packageOffer()).toList();
        for (var product : packages) {
            requireReadyAmount(product.displayName(), product.unitAmountCents());
            lines.add(new CommercialOfferSelection.LineItem(
                product.id(), product.code(), "PACKAGE",
                1, product.unitAmountCents(), product.externalPriceId()
            ));
        }
        if (modules.size() == 1 && packages.isEmpty()) {
            var product = modules.getFirst();
            requireReadyAmount(product.displayName(), product.unitAmountCents());
            lines.add(new CommercialOfferSelection.LineItem(
                product.id(), product.code(), "PRODUCT", 1,
                product.unitAmountCents(), product.externalPriceId()
            ));
        } else if (!modules.isEmpty()) {
            var volumePrice = commercialUnit(versionId, interval, ADDITIONAL_MODULE_UNIT, "VOLUME");
            lines.add(new CommercialOfferSelection.LineItem(
                volumePrice.productId(), volumePrice.billableCode(), "PRODUCT", modules.size(),
                volumePrice.unitAmountCents(), volumePrice.externalPriceId()
            ));
        }
        var productSubtotal = total(lines);
        var seat = seat(versionId, interval);
        if (extraSeats > 0) {
            lines.add(new CommercialOfferSelection.LineItem(
                seat.productId(), seat.billableCode(), "SEAT", extraSeats,
                seat.unitAmountCents(), seat.externalPriceId()
            ));
        }
        var subtotal = total(lines);
        var promotion = promotion(versionId, promotionCode, lines, subtotal);
        var moduleSlugs = selected.stream().flatMap(product -> product.capabilities().stream())
            .map(this::canonicalCapability).distinct().sorted().toList();
        var offerCode = selected.size() == 1
            ? selected.getFirst().code()
            : "custom_offer";
        return new CommercialOfferSelection(
            versionId, versionCode, offerCode, interval, "USD", INCLUDED_SEATS, extraSeats,
            Math.subtractExact(subtotal, promotion.discountAmountCents()), productSubtotal,
            seat.unitAmountCents(), 0, null, seat.externalPriceId(), selected, lines, moduleSlugs,
            subtotal, promotion.discountAmountCents(), promotion.code(), promotion.externalPromotionCodeId()
        );
    }

    private CommercialUnitDefinition commercialUnit(
        long versionId,
        BillingInterval interval,
        String productCode,
        String commercialKind
    ) {
        return jdbcTemplate.query(
            """
                SELECT product.id, product.product_code, price.unit_amount_cents, price.external_price_id
                FROM billing_catalog_products product
                JOIN billing_catalog_prices price ON price.catalog_product_id = product.id
                WHERE product.catalog_version_id = ? AND product.active = 1
                  AND BINARY product.product_code = BINARY ?
                  AND product.commercial_kind = ?
                  AND price.billing_interval = ? AND price.currency = 'USD'
                  AND price.status IN ('READY', 'ACTIVE')
                  AND (? = 0 OR (price.stripe_mode = ? AND price.stripe_verified_at IS NOT NULL
                       AND price.stripe_sync_status = 'READY' AND price.external_price_id LIKE 'price_%'))
                LIMIT 1
                """,
            (rs, rowNum) -> new CommercialUnitDefinition(
                rs.getLong(1), rs.getString(2), (Long) rs.getObject(3), rs.getString(4)
            ),
            versionId, productCode, commercialKind, interval.name(), verificationFlag(), mode()
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException(
            "La tarifa para modulos adicionales todavia no esta lista."
        ));
    }

    private SeatDefinition seat(long versionId, BillingInterval interval) {
        return jdbcTemplate.query(
            """
                SELECT product.id, product.product_code, price.unit_amount_cents, price.external_price_id
                FROM billing_catalog_products product
                JOIN billing_catalog_prices price ON price.catalog_product_id = product.id
                WHERE product.catalog_version_id = ? AND product.active = 1 AND product.commercial_kind = 'SEAT'
                  AND price.billing_interval = ? AND price.currency = 'USD'
                  AND price.status IN ('READY', 'ACTIVE')
                  AND (? = 0 OR (price.stripe_mode = ? AND price.stripe_verified_at IS NOT NULL
                       AND price.stripe_sync_status = 'READY' AND price.external_price_id LIKE 'price_%'))
                ORDER BY product.sort_order, product.id LIMIT 1
                """,
            (rs, rowNum) -> new SeatDefinition(rs.getLong(1), rs.getString(2), (Long) rs.getObject(3), rs.getString(4)),
            versionId, interval.name(), verificationFlag(), mode()
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("La tarifa de usuario adicional no está lista."));
    }

    private PromotionResult promotion(
        long versionId,
        String rawCode,
        List<CommercialOfferSelection.LineItem> lines,
        long subtotal
    ) {
        if (rawCode == null || rawCode.isBlank()) return PromotionResult.none();
        var code = rawCode.trim().toUpperCase(Locale.ROOT);
        var rows = jdbcTemplate.query(
            """
                SELECT id, promotion_code, discount_type, percent_basis_points, amount_off_cents,
                       external_promotion_code_id
                FROM billing_catalog_promotions
                WHERE catalog_version_id = ? AND UPPER(promotion_code) = ? AND active = 1
                  AND (? = 0 OR (stripe_mode = ? AND stripe_verified_at IS NOT NULL
                       AND stripe_sync_status = 'READY' AND external_promotion_code_id LIKE 'promo_%'))
                  AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
                  AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP)
                LIMIT 1
                """,
            (rs, rowNum) -> new PromotionDefinition(
                rs.getLong(1), rs.getString(2), rs.getString(3), (Integer) rs.getObject(4),
                (Long) rs.getObject(5), rs.getString(6)
            ), versionId, code, verificationFlag(), mode()
        );
        if (rows.isEmpty()) throw new IllegalArgumentException("La promoción no existe o ya no está vigente.");
        var promotion = rows.getFirst();
        var restrictedIds = jdbcTemplate.query(
            "SELECT catalog_product_id FROM billing_catalog_promotion_products WHERE promotion_id = ?",
            (rs, rowNum) -> rs.getLong(1), promotion.id()
        );
        var eligible = restrictedIds.isEmpty() ? subtotal : lines.stream()
            .filter(line -> line.productId() != null && restrictedIds.contains(line.productId()))
            .map(CommercialOfferSelection.LineItem::totalAmountCents)
            .filter(java.util.Objects::nonNull)
            .reduce(0L, Math::addExact);
        if (eligible <= 0) throw new IllegalArgumentException("La promoción no aplica a la selección actual.");
        long discount;
        if ("PERCENT".equals(promotion.discountType())) {
            var basisPoints = promotion.percentBasisPoints() == null ? 0 : promotion.percentBasisPoints();
            discount = BigDecimal.valueOf(eligible).multiply(BigDecimal.valueOf(basisPoints))
                .divide(BigDecimal.valueOf(10_000), 0, RoundingMode.HALF_UP).longValueExact();
        } else {
            discount = Math.min(eligible, promotion.amountOffCents() == null ? 0 : promotion.amountOffCents());
        }
        return new PromotionResult(promotion.code(), Math.max(0, discount), promotion.externalPromotionCodeId());
    }

    private void requireNoOverlap(List<CommercialOfferSelection.Product> selected) {
        var ownerByCapability = new LinkedHashMap<String, String>();
        for (var product : selected) {
            for (var capability : product.capabilities()) {
                var canonical = canonicalCapability(capability);
                var previous = ownerByCapability.putIfAbsent(canonical, product.displayName());
                if (previous != null && !"inventory".equals(canonical)) {
                    throw new IllegalArgumentException(
                        "La selección repite el módulo " + canonical + " en " + previous + " y " + product.displayName() + "."
                    );
                }
            }
        }
    }

    private int verificationFlag() {
        return requiresVerifiedReferences() ? 1 : 0;
    }

    private String mode() {
        return "live".equalsIgnoreCase(stripeProperties.getMode()) ? "LIVE" : "TEST";
    }

    private long total(List<CommercialOfferSelection.LineItem> lines) {
        long total = 0;
        for (var line : lines) {
            requireReadyAmount(line.billableCode(), line.unitAmountCents());
            total = Math.addExact(total, Math.multiplyExact(line.unitAmountCents(), (long) line.quantity()));
        }
        return total;
    }

    private void requireReadyAmount(String label, Long amount) {
        if (amount == null || amount <= 0) throw new IllegalStateException("La tarifa de " + label + " todavía no está lista.");
    }

    private Set<String> normalize(List<String> values) {
        var normalized = new LinkedHashSet<String>();
        if (values == null) return normalized;
        for (var value : values) if (value != null && !value.isBlank()) normalized.add(value.trim().toLowerCase(Locale.ROOT));
        return normalized;
    }

    private List<String> csv(String value) {
        if (value == null || value.isBlank()) return List.of();
        return java.util.Arrays.stream(value.split(",")).map(String::trim).filter(item -> !item.isBlank()).toList();
    }

    private String canonicalCapability(String value) {
        return "sales".equalsIgnoreCase(value) ? "crm" : value;
    }

    private record SeatDefinition(long productId, String billableCode, long unitAmountCents, String externalPriceId) {}
    private record CommercialUnitDefinition(long productId, String billableCode, long unitAmountCents, String externalPriceId) {}
    private record PromotionDefinition(long id, String code, String discountType, Integer percentBasisPoints, Long amountOffCents, String externalPromotionCodeId) {}
    private record PromotionResult(String code, long discountAmountCents, String externalPromotionCodeId) {
        private static PromotionResult none() { return new PromotionResult(null, 0, null); }
    }
}
