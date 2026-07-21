package com.indice.erp.billing.catalog;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CommercialOfferSelectionService {

    private static final int INCLUDED_SEATS = 5;
    private static final int MAX_EXTRA_SEATS = 500;

    private final JdbcTemplate jdbcTemplate;

    public CommercialOfferSelectionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public CommercialOfferSelection select(List<String> requestedProductCodes, String intervalValue, int extraSeats) {
        var interval = BillingInterval.parse(intervalValue);
        if (extraSeats < 0 || extraSeats > MAX_EXTRA_SEATS) {
            throw new IllegalArgumentException("Extra seats must be between 0 and 500.");
        }

        var version = activeVersion();
        var available = jdbcTemplate.query(
            """
                SELECT id, product_code, display_name
                FROM billing_catalog_products
                WHERE catalog_version_id = ?
                  AND product_type = 'BASIC'
                  AND active = 1
                ORDER BY sort_order, id
                """,
            (rs, rowNum) -> new CommercialOfferSelection.Product(
                rs.getLong("id"),
                rs.getString("product_code"),
                rs.getString("display_name")
            ),
            version.id()
        );
        if (available.isEmpty()) {
            throw new IllegalStateException("The active catalog has no basic products.");
        }

        var requested = normalize(requestedProductCodes);
        var availableCodes = available.stream().map(CommercialOfferSelection.Product::code).collect(java.util.stream.Collectors.toSet());
        if (requested.isEmpty() || !availableCodes.containsAll(requested)) {
            throw new IllegalArgumentException("Select valid basic products from the active catalog.");
        }

        var selected = available.stream().filter(product -> requested.contains(product.code())).toList();
        var offerCode = offerCode(selected.size(), available.size());
        var basePrice = price(version.id(), offerCode, interval, "BASE");
        var seatPrice = price(version.id(), "extra_seat", interval, "ADDON");
        if (seatPrice.unitAmountCents() == null) {
            throw new IllegalStateException("The extra-seat price is not ready.");
        }
        var estimated = basePrice.unitAmountCents() == null
            ? null
            : Math.addExact(basePrice.unitAmountCents(), Math.multiplyExact(seatPrice.unitAmountCents(), (long) extraSeats));

        return new CommercialOfferSelection(
            version.id(),
            version.code(),
            offerCode,
            interval,
            "USD",
            INCLUDED_SEATS,
            extraSeats,
            estimated,
            basePrice.unitAmountCents(),
            seatPrice.unitAmountCents(),
            selected
        );
    }

    public List<CommercialOfferSelection.Product> activeBasicProducts() {
        var version = activeVersion();
        return jdbcTemplate.query(
            """
                SELECT id, product_code, display_name
                FROM billing_catalog_products
                WHERE catalog_version_id = ?
                  AND product_type = 'BASIC'
                  AND active = 1
                ORDER BY sort_order, id
                """,
            (rs, rowNum) -> new CommercialOfferSelection.Product(
                rs.getLong("id"),
                rs.getString("product_code"),
                rs.getString("display_name")
            ),
            version.id()
        );
    }

    public List<PublicPrice> activePrices() {
        var version = activeVersion();
        return jdbcTemplate.query(
            """
                SELECT billable_code, price_type, billing_interval, currency,
                       unit_amount_cents, included_quantity, status
                FROM billing_catalog_prices
                WHERE catalog_version_id = ?
                  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
                  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
                ORDER BY price_type, billable_code, billing_interval
                """,
            (rs, rowNum) -> new PublicPrice(
                rs.getString("billable_code"),
                rs.getString("price_type"),
                rs.getString("billing_interval"),
                rs.getString("currency"),
                (Long) rs.getObject("unit_amount_cents"),
                rs.getInt("included_quantity"),
                rs.getString("status")
            ),
            version.id()
        );
    }

    private CatalogVersion activeVersion() {
        var rows = jdbcTemplate.query(
            """
                SELECT id, version_code
                FROM billing_catalog_versions
                WHERE status = 'ACTIVE'
                  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
                  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
                ORDER BY effective_from DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new CatalogVersion(rs.getLong("id"), rs.getString("version_code"))
        );
        if (rows.isEmpty()) {
            throw new IllegalStateException("No active commercial catalog is configured.");
        }
        return rows.getFirst();
    }

    private PriceDefinition price(long versionId, String billableCode, BillingInterval interval, String priceType) {
        var rows = jdbcTemplate.query(
            """
                SELECT unit_amount_cents, status
                FROM billing_catalog_prices
                WHERE catalog_version_id = ?
                  AND billable_code = ?
                  AND price_type = ?
                  AND billing_interval = ?
                  AND currency = 'USD'
                  AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
                  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
                ORDER BY effective_from DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new PriceDefinition(
                (Long) rs.getObject("unit_amount_cents"),
                rs.getString("status")
            ),
            versionId,
            billableCode,
            priceType,
            interval.name()
        );
        if (rows.isEmpty()) {
            throw new IllegalStateException("The requested commercial price is not configured.");
        }
        return rows.getFirst();
    }

    private String offerCode(int selectedCount, int availableCount) {
        if (selectedCount == availableCount) {
            return "basic_all";
        }
        return switch (selectedCount) {
            case 1 -> "basic_1";
            case 2 -> "basic_2";
            case 3 -> "basic_3";
            default -> throw new IllegalArgumentException("Select 1, 2, 3, or all basic products.");
        };
    }

    private Set<String> normalize(List<String> values) {
        var normalized = new LinkedHashSet<String>();
        if (values == null) {
            return normalized;
        }
        for (var value : values) {
            if (value != null && !value.isBlank()) {
                normalized.add(value.trim().toLowerCase(Locale.ROOT));
            }
        }
        return normalized;
    }

    private record CatalogVersion(long id, String code) {
    }

    private record PriceDefinition(Long unitAmountCents, String status) {
    }

    public record PublicPrice(
        String billableCode,
        String priceType,
        String billingInterval,
        String currency,
        Long unitAmountCents,
        int includedQuantity,
        String status
    ) {
    }
}
