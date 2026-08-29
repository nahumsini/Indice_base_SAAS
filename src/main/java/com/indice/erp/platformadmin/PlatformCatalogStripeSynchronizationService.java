package com.indice.erp.platformadmin;

import com.indice.erp.billing.stripe.StripeCatalogGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformCatalogStripeSynchronizationService {

    private static final String TAX_BEHAVIOR = "EXCLUSIVE";

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService accessService;
    private final PlatformAuditService audit;
    private final StripeCatalogGateway stripe;
    private final StripeSecretProvider secrets;
    private final StripePhaseTwoProperties properties;

    public PlatformCatalogStripeSynchronizationService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit,
        StripeCatalogGateway stripe,
        StripeSecretProvider secrets,
        StripePhaseTwoProperties properties
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessService = accessService;
        this.audit = audit;
        this.stripe = stripe;
        this.secrets = secrets;
        this.properties = properties;
    }

    @Transactional
    public Map<String, Object> synchronize(long actorUserId, long productId, SynchronizeRequest request) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        secrets.requireEnabled();
        if (!secrets.isTestMode()) {
            throw new IllegalStateException(
                "Por seguridad, conecta primero el catálogo en Stripe TEST antes de habilitar Stripe LIVE."
            );
        }
        if (request == null || request.monthly_amount_cents() == null || request.annual_amount_cents() == null) {
            throw new IllegalArgumentException("Los precios mensual y anual son obligatorios.");
        }
        if (request.monthly_amount_cents() <= 0 || request.annual_amount_cents() <= 0) {
            throw new IllegalArgumentException("Los precios mensual y anual deben ser mayores a cero.");
        }

        var product = product(productId);
        if (!"DRAFT".equals(product.versionStatus())) {
            throw new IllegalStateException("Sólo la versión de trabajo puede sincronizar precios con Stripe.");
        }
        var prices = prices(productId);
        var monthly = interval(prices, "MONTH");
        var annual = interval(prices, "YEAR");
        var taxCode = normalizedTaxCode();
        var productKey = opaqueKey(product.displayName() + "|" + taxCode + "|" + nullSafe(product.externalProductId()));
        var stripeProduct = stripe.upsertProduct(
            new StripeCatalogGateway.ProductCommand(product.externalProductId(), product.displayName(), taxCode),
            "indice-catalog-product-" + productKey
        );

        var monthlyResult = synchronizePrice(monthly, stripeProduct.productId(), request.monthly_amount_cents());
        var annualResult = synchronizePrice(annual, stripeProduct.productId(), request.annual_amount_cents());
        var now = Timestamp.from(Instant.now());
        jdbcTemplate.update(
            "UPDATE billing_catalog_products SET external_product_id = ?, stripe_tax_code = ?, stripe_synced_at = ? WHERE id = ?",
            stripeProduct.productId(), taxCode, now, product.id()
        );
        persistPrice(monthly, request.monthly_amount_cents(), monthlyResult, now);
        persistPrice(annual, request.annual_amount_cents(), annualResult, now);
        audit.record(actorUserId, "CATALOG_STRIPE_PRICES_SYNCHRONIZED", "BILLING_PRODUCT", Long.toString(product.id()), null, "SUCCESS", Map.of(
            "product_code", product.productCode(),
            "stripe_mode", "TEST",
            "tax_behavior", TAX_BEHAVIOR,
            "tax_code", taxCode,
            "monthly_reused", monthlyResult.reused(),
            "annual_reused", annualResult.reused()
        ));

        var result = new LinkedHashMap<String, Object>();
        result.put("catalog_product_id", product.id());
        result.put("stripe_product_id", stripeProduct.productId());
        result.put("stripe_mode", "TEST");
        result.put("currency", "USD");
        result.put("tax_behavior", TAX_BEHAVIOR);
        result.put("tax_code", taxCode);
        result.put("automatic_tax_enabled", properties.isAutomaticTaxEnabled());
        result.put("monthly", priceMap(monthly, request.monthly_amount_cents(), monthlyResult));
        result.put("annual", priceMap(annual, request.annual_amount_cents(), annualResult));
        return result;
    }

    private PriceSyncResult synchronizePrice(PriceRow price, String stripeProductId, long amountCents) {
        var canReuse = amountCents == price.amountCents()
            && price.externalPriceId() != null
            && price.externalPriceId().startsWith("price_")
            && TAX_BEHAVIOR.equalsIgnoreCase(price.taxBehavior())
            && price.syncedAt() != null
            && List.of("READY", "ACTIVE").contains(price.status());
        if (canReuse) {
            return new PriceSyncResult(price.externalPriceId(), true);
        }
        var created = stripe.createRecurringPrice(
            new StripeCatalogGateway.PriceCommand(
                stripeProductId,
                price.currency(),
                amountCents,
                price.interval().toLowerCase(Locale.ROOT)
            ),
            "indice-catalog-price-" + opaqueKey(stripeProductId + "|" + price.interval() + "|" + amountCents)
        );
        if (!"exclusive".equalsIgnoreCase(created.taxBehavior())) {
            throw new IllegalStateException("Stripe no confirmó el precio como impuesto exclusivo.");
        }
        return new PriceSyncResult(created.priceId(), false);
    }

    private void persistPrice(PriceRow price, long amountCents, PriceSyncResult result, Timestamp now) {
        jdbcTemplate.update(
            "UPDATE billing_catalog_prices SET unit_amount_cents = ?, external_price_id = ?, stripe_tax_behavior = 'EXCLUSIVE', stripe_synced_at = ?, status = 'READY' WHERE id = ?",
            amountCents, result.priceId(), now, price.id()
        );
    }

    private Map<String, Object> priceMap(PriceRow price, long amountCents, PriceSyncResult result) {
        return Map.of(
            "id", price.id(),
            "billing_interval", price.interval(),
            "amount_cents", amountCents,
            "external_price_id", result.priceId(),
            "reused", result.reused(),
            "status", "READY"
        );
    }

    private ProductRow product(long productId) {
        return jdbcTemplate.query(
            """
                SELECT product.id, product.catalog_version_id, product.product_code,
                       product.display_name, product.external_product_id, version.status
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.id = ?
                """,
            (rs, rowNum) -> new ProductRow(
                rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4),
                rs.getString(5), rs.getString(6)
            ),
            productId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Producto de catálogo no encontrado."));
    }

    private List<PriceRow> prices(long productId) {
        return jdbcTemplate.query(
            """
                SELECT id, billing_interval, currency, unit_amount_cents, external_price_id,
                       stripe_tax_behavior, stripe_synced_at, status
                FROM billing_catalog_prices
                WHERE catalog_product_id = ? AND billing_interval IN ('MONTH', 'YEAR') AND currency = 'USD'
                """,
            (rs, rowNum) -> new PriceRow(
                rs.getLong(1), rs.getString(2), rs.getString(3),
                rs.getObject(4, Long.class) == null ? 0L : rs.getObject(4, Long.class),
                rs.getString(5), rs.getString(6), rs.getTimestamp(7), rs.getString(8)
            ),
            productId
        );
    }

    private PriceRow interval(List<PriceRow> prices, String interval) {
        return prices.stream()
            .filter(price -> interval.equals(price.interval()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Falta la tarifa " + interval.toLowerCase(Locale.ROOT) + " del producto."));
    }

    private String normalizedTaxCode() {
        var value = properties.getCatalogProductTaxCode();
        return value == null || value.isBlank() ? "txcd_10103001" : value.trim();
    }

    private String opaqueKey(String source) {
        return UUID.nameUUIDFromBytes(source.getBytes(StandardCharsets.UTF_8)).toString();
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    public record SynchronizeRequest(Long monthly_amount_cents, Long annual_amount_cents) {
    }

    private record ProductRow(
        long id,
        long catalogVersionId,
        String productCode,
        String displayName,
        String externalProductId,
        String versionStatus
    ) {
    }

    private record PriceRow(
        long id,
        String interval,
        String currency,
        long amountCents,
        String externalPriceId,
        String taxBehavior,
        Timestamp syncedAt,
        String status
    ) {
    }

    private record PriceSyncResult(String priceId, boolean reused) {
    }
}
