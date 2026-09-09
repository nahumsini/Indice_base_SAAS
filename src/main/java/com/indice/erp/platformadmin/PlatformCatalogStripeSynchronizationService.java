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
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PlatformCatalogStripeSynchronizationService {

    private static final String TAX_BEHAVIOR = "EXCLUSIVE";
    private static final long MAX_RECURRING_AMOUNT_CENTS = 100_000_000L;
    private static final String LIVE_CONFIRMATION = "PUBLICAR EN STRIPE LIVE";

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService accessService;
    private final PlatformAuditService audit;
    private final StripeCatalogGateway stripe;
    private final StripeSecretProvider secrets;
    private final StripePhaseTwoProperties properties;
    private final TransactionTemplate transactions;

    public PlatformCatalogStripeSynchronizationService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit,
        StripeCatalogGateway stripe,
        StripeSecretProvider secrets,
        StripePhaseTwoProperties properties,
        TransactionTemplate transactions
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessService = accessService;
        this.audit = audit;
        this.stripe = stripe;
        this.secrets = secrets;
        this.properties = properties;
        this.transactions = transactions;
    }

    public Map<String, Object> synchronize(long actorUserId, long productId, SynchronizeRequest request) {
        var authority = accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        secrets.requireEnabled();
        var stripeMode = configuredMode();
        requireAuthorizedMode(authority, request, stripeMode);
        if (request == null || request.monthly_amount_cents() == null || request.annual_amount_cents() == null) {
            throw new IllegalArgumentException("Los precios mensual y anual son obligatorios.");
        }
        if (request.monthly_amount_cents() <= 0 || request.annual_amount_cents() <= 0) {
            throw new IllegalArgumentException("Los precios mensual y anual deben ser mayores a cero.");
        }
        if (request.monthly_amount_cents() > MAX_RECURRING_AMOUNT_CENTS
            || request.annual_amount_cents() > MAX_RECURRING_AMOUNT_CENTS) {
            throw new IllegalArgumentException("El precio excede el límite operativo permitido.");
        }

        var product = product(productId);
        if (!"DRAFT".equals(product.versionStatus())) {
            throw new IllegalStateException("Sólo la versión de trabajo puede sincronizar precios con Stripe.");
        }
        var prices = prices(productId);
        var monthly = interval(prices, "MONTH");
        var annual = interval(prices, "YEAR");
        var taxCode = normalizedTaxCode();
        var account = stripe.account();
        if (account.accountId() == null || account.accountId().isBlank()) {
            throw new IllegalStateException("Stripe no devolvió una cuenta verificable.");
        }
        if ("LIVE".equals(stripeMode) && (!account.chargesEnabled() || !account.payoutsEnabled())) {
            throw new IllegalStateException("La cuenta Stripe LIVE no está habilitada para cobros y depósitos.");
        }
        var operationKey = opaqueKey(
            snapshotPart(product.catalogVersionId()) + snapshotPart(product.id())
                + snapshotPart(product.versionCode()) + snapshotPart(product.productCode())
                + snapshotPart(product.displayName()) + snapshotPart(product.externalProductId())
                + snapshotPart(product.stripeMode()) + snapshotPart(product.stripeAccountId())
                + snapshotPart(taxCode) + snapshotPart(stripeMode) + snapshotPart(account.accountId())
                + priceSnapshotPart(monthly) + priceSnapshotPart(annual)
                + snapshotPart(request.monthly_amount_cents()) + snapshotPart(request.annual_amount_cents())
        );
        beginOperation(operationKey, product, stripeMode, account.accountId(), request);

        StripeCatalogGateway.ProductResult stripeProduct;
        PriceSyncResult monthlyResult;
        PriceSyncResult annualResult;
        try {
            var reusableProductId = stripeMode.equals(product.stripeMode())
                && account.accountId().equals(product.stripeAccountId())
                ? product.externalProductId()
                : null;
            var sharedProduct = reusableProductId != null && sharedProductReference(product.id(), reusableProductId);
            if (sharedProduct) {
                var existing = stripe.verifyProduct(reusableProductId);
                var canShare = existing.active()
                    && existing.livemode() == "LIVE".equals(stripeMode)
                    && product.displayName().equals(existing.name())
                    && taxCode.equals(existing.taxCode());
                stripeProduct = canShare
                    ? new StripeCatalogGateway.ProductResult(existing.productId(), existing.livemode())
                    : stripe.upsertProduct(
                        new StripeCatalogGateway.ProductCommand(
                            null, product.displayName(), taxCode,
                            product.versionCode() + ":" + product.productCode()
                        ),
                        "indice-catalog-product-create-" + operationKey
                    );
            } else {
                stripeProduct = stripe.upsertProduct(
                    new StripeCatalogGateway.ProductCommand(
                        reusableProductId,
                        product.displayName(),
                        taxCode,
                        product.versionCode() + ":" + product.productCode()
                    ),
                    "indice-catalog-product-" + (reusableProductId == null ? "create-" : "update-") + operationKey
                );
            }
            requireMode(stripeProduct.livemode(), stripeMode);
            verifyProduct(stripeProduct.productId(), product.displayName(), taxCode, stripeMode);
            monthlyResult = synchronizePrice(
                monthly, stripeProduct.productId(), request.monthly_amount_cents(), stripeMode,
                account.accountId(), product.versionCode() + ":" + product.productCode() + ":MONTH",
                operationKey
            );
            annualResult = synchronizePrice(
                annual, stripeProduct.productId(), request.annual_amount_cents(), stripeMode,
                account.accountId(), product.versionCode() + ":" + product.productCode() + ":YEAR",
                operationKey
            );
            var now = Timestamp.from(Instant.now());
            var finalStripeProduct = stripeProduct;
            var finalMonthlyResult = monthlyResult;
            var finalAnnualResult = annualResult;
            transactions.executeWithoutResult(status -> {
                lockUnchangedDraft(product, monthly, annual);
                jdbcTemplate.update(
                    """
                        UPDATE billing_catalog_products
                        SET external_product_id = ?, stripe_tax_code = ?, stripe_synced_at = ?,
                            stripe_mode = ?, stripe_account_id = ?, stripe_verified_at = ?,
                            stripe_sync_status = 'READY'
                        WHERE id = ?
                        """,
                    finalStripeProduct.productId(), taxCode, now, stripeMode, account.accountId(), now, product.id()
                );
                persistPrice(monthly, request.monthly_amount_cents(), finalMonthlyResult, now, stripeMode, account.accountId());
                persistPrice(annual, request.annual_amount_cents(), finalAnnualResult, now, stripeMode, account.accountId());
                completeOperation(
                    operationKey, account.accountId(), finalStripeProduct.productId(),
                    finalMonthlyResult.priceId(), finalAnnualResult.priceId()
                );
                audit.record(actorUserId, "CATALOG_STRIPE_PRICES_SYNCHRONIZED", "BILLING_PRODUCT", Long.toString(product.id()), null, "SUCCESS", Map.of(
                    "product_code", product.productCode(),
                    "stripe_mode", stripeMode,
                    "stripe_account_id", account.accountId(),
                    "tax_behavior", TAX_BEHAVIOR,
                    "tax_code", taxCode,
                    "monthly_reused", finalMonthlyResult.reused(),
                    "annual_reused", finalAnnualResult.reused()
                ));
            });
        } catch (RuntimeException exception) {
            failOperation(operationKey, exception);
            audit.record(actorUserId, "CATALOG_STRIPE_PRICES_SYNCHRONIZED", "BILLING_PRODUCT", Long.toString(product.id()), null, "FAILURE", Map.of(
                "product_code", product.productCode(), "stripe_mode", stripeMode,
                "reason", safeMessage(exception)
            ));
            throw exception;
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("catalog_product_id", product.id());
        result.put("stripe_product_id", stripeProduct.productId());
        result.put("stripe_mode", stripeMode);
        result.put("stripe_account_id", account.accountId());
        result.put("operation_id", operationKey);
        result.put("currency", "USD");
        result.put("tax_behavior", TAX_BEHAVIOR);
        result.put("tax_code", taxCode);
        result.put("automatic_tax_enabled", properties.isAutomaticTaxEnabled());
        result.put("monthly", priceMap(monthly, request.monthly_amount_cents(), monthlyResult));
        result.put("annual", priceMap(annual, request.annual_amount_cents(), annualResult));
        return result;
    }

    String requirePublicationSynchronization(long actorUserId, String targetMode, String confirmation) {
        var authority = accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        if (!"PLATFORM_ROOT".equals(authority.role())) {
            throw new PlatformAdminForbiddenException("Sólo Root puede publicar una versión comercial.");
        }
        secrets.requireEnabled();
        var stripeMode = configuredMode();
        requireAuthorizedMode(authority, new SynchronizeRequest(null, null, targetMode, confirmation), stripeMode);
        return stripeMode;
    }

    private PriceSyncResult synchronizePrice(
        PriceRow price,
        String stripeProductId,
        long amountCents,
        String stripeMode,
        String stripeAccountId,
        String catalogReference,
        String operationKey
    ) {
        var canReuse = price.amountCents() != null
            && amountCents == price.amountCents()
            && price.externalPriceId() != null
            && price.externalPriceId().startsWith("price_")
            && TAX_BEHAVIOR.equalsIgnoreCase(price.taxBehavior())
            && price.syncedAt() != null
            && stripeMode.equals(price.stripeMode())
            && stripeAccountId.equals(price.stripeAccountId())
            && List.of("READY", "ACTIVE").contains(price.status());
        if (canReuse) {
            var verification = stripe.verifyRecurringPrice(price.externalPriceId());
            if (matches(verification, stripeProductId, price.currency(), amountCents, price.interval(), stripeMode)) {
                return new PriceSyncResult(price.externalPriceId(), true);
            }
        }
        var created = stripe.createRecurringPrice(
            new StripeCatalogGateway.PriceCommand(
                stripeProductId,
                price.currency(),
                amountCents,
                price.interval().toLowerCase(Locale.ROOT),
                catalogReference
            ),
            "indice-catalog-price-" + opaqueKey(operationKey + "|" + price.interval())
        );
        requireMode(created.livemode(), stripeMode);
        if (!"exclusive".equalsIgnoreCase(created.taxBehavior())) {
            throw new IllegalStateException("Stripe no confirmó el precio como impuesto exclusivo.");
        }
        var verification = stripe.verifyRecurringPrice(created.priceId());
        if (!matches(verification, stripeProductId, price.currency(), amountCents, price.interval(), stripeMode)) {
            throw new IllegalStateException("La tarifa creada no coincide con el catálogo local.");
        }
        return new PriceSyncResult(created.priceId(), false);
    }

    private void persistPrice(
        PriceRow price,
        long amountCents,
        PriceSyncResult result,
        Timestamp now,
        String stripeMode,
        String stripeAccountId
    ) {
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_prices
                SET unit_amount_cents = ?, external_price_id = ?, stripe_tax_behavior = 'EXCLUSIVE',
                    stripe_synced_at = ?, stripe_mode = ?, stripe_account_id = ?, stripe_verified_at = ?,
                    stripe_sync_status = 'READY', status = 'READY'
                WHERE id = ?
                """,
            amountCents, result.priceId(), now, stripeMode, stripeAccountId, now, price.id()
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
                SELECT product.id, product.catalog_version_id, version.version_code, product.product_code,
                       product.display_name, product.external_product_id, version.status,
                       product.stripe_mode, product.stripe_account_id
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.id = ?
                """,
            (rs, rowNum) -> new ProductRow(
                rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getString(5),
                rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9)
            ),
            productId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Producto de catálogo no encontrado."));
    }

    private List<PriceRow> prices(long productId) {
        return jdbcTemplate.query(
            """
                SELECT id, billing_interval, currency, unit_amount_cents, external_price_id,
                       stripe_tax_behavior, stripe_synced_at, status, stripe_mode, stripe_account_id
                FROM billing_catalog_prices
                WHERE catalog_product_id = ? AND billing_interval IN ('MONTH', 'YEAR') AND currency = 'USD'
                """,
            (rs, rowNum) -> new PriceRow(
                rs.getLong(1), rs.getString(2), rs.getString(3),
                rs.getObject(4, Long.class),
                rs.getString(5), rs.getString(6), rs.getTimestamp(7), rs.getString(8),
                rs.getString(9), rs.getString(10)
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

    private String priceSnapshotPart(PriceRow price) {
        return snapshotPart(price.id()) + snapshotPart(price.interval()) + snapshotPart(price.currency())
            + snapshotPart(price.amountCents()) + snapshotPart(price.externalPriceId())
            + snapshotPart(price.taxBehavior()) + snapshotPart(price.syncedAt())
            + snapshotPart(price.status()) + snapshotPart(price.stripeMode())
            + snapshotPart(price.stripeAccountId());
    }

    private String snapshotPart(Object value) {
        var text = Objects.toString(value, "<null>");
        return text.length() + ":" + text + "|";
    }

    private String configuredMode() {
        return secrets.isLiveMode() ? "LIVE" : "TEST";
    }

    private void requireAuthorizedMode(
        PlatformAdminAccessService.Access authority,
        SynchronizeRequest request,
        String stripeMode
    ) {
        var requestedMode = request == null ? null : request.target_mode();
        if (requestedMode != null && !stripeMode.equalsIgnoreCase(requestedMode.trim())) {
            throw new IllegalArgumentException("El modo solicitado no coincide con la configuración de Stripe.");
        }
        if (!"LIVE".equals(stripeMode)) return;
        if (!properties.isCatalogLiveSyncEnabled()) {
            throw new IllegalStateException("La sincronización LIVE del catálogo está bloqueada por despliegue.");
        }
        if (!"PLATFORM_ROOT".equals(authority.role())) {
            throw new PlatformAdminForbiddenException("Sólo Root puede sincronizar el catálogo con Stripe LIVE.");
        }
        if (request == null || !LIVE_CONFIRMATION.equals(request.confirmation())) {
            throw new IllegalArgumentException("Confirma exactamente: " + LIVE_CONFIRMATION);
        }
    }

    private void requireMode(boolean livemode, String stripeMode) {
        if (livemode != "LIVE".equals(stripeMode)) {
            throw new IllegalStateException("Stripe devolvió un objeto de un modo diferente al configurado.");
        }
    }

    private void verifyProduct(String productId, String name, String taxCode, String stripeMode) {
        var verified = stripe.verifyProduct(productId);
        requireMode(verified.livemode(), stripeMode);
        if (!verified.active() || !name.equals(verified.name()) || !taxCode.equals(verified.taxCode())) {
            throw new IllegalStateException("El producto de Stripe no coincide con el catálogo local.");
        }
    }

    private boolean sharedProductReference(long productId, String externalProductId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            """
                SELECT EXISTS(
                    SELECT 1 FROM billing_catalog_products
                    WHERE id <> ? AND external_product_id = ?
                )
                """,
            Boolean.class,
            productId,
            externalProductId
        ));
    }

    private boolean matches(
        StripeCatalogGateway.PriceVerification price,
        String productId,
        String currency,
        long amountCents,
        String interval,
        String stripeMode
    ) {
        return price.active()
            && price.livemode() == "LIVE".equals(stripeMode)
            && productId.equals(price.productId())
            && currency.equalsIgnoreCase(price.currency())
            && amountCents == price.amountCents()
            && interval.equalsIgnoreCase(price.interval())
            && "exclusive".equalsIgnoreCase(price.taxBehavior());
    }

    private void beginOperation(
        String operationKey,
        ProductRow product,
        String stripeMode,
        String stripeAccountId,
        SynchronizeRequest request
    ) {
        try {
            transactions.executeWithoutResult(status -> {
                jdbcTemplate.update(
                    """
                        UPDATE billing_catalog_stripe_sync_operations
                        SET status = 'FAILED', running_scope = NULL, completed_at = CURRENT_TIMESTAMP(6),
                            last_error = 'La operación excedió su ventana de ejecución.'
                        WHERE catalog_product_id = ? AND stripe_mode = ? AND status = 'RUNNING'
                          AND started_at < DATE_SUB(CURRENT_TIMESTAMP(6), INTERVAL 15 MINUTE)
                        """,
                    product.id(), stripeMode
                );
                jdbcTemplate.update(
                    """
                        INSERT IGNORE INTO billing_catalog_stripe_sync_operations (
                            operation_key, catalog_version_id, catalog_product_id, stripe_mode,
                            stripe_account_id, monthly_amount_cents, annual_amount_cents,
                            status, attempt_count
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)
                        """,
                    operationKey, product.catalogVersionId(), product.id(), stripeMode, stripeAccountId,
                    request.monthly_amount_cents(), request.annual_amount_cents()
                );
                var currentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM billing_catalog_stripe_sync_operations WHERE operation_key = ? FOR UPDATE",
                    String.class,
                    operationKey
                );
                if ("RUNNING".equals(currentStatus)) {
                    throw new IllegalStateException("Ya existe una sincronización de Stripe en curso para este producto.");
                }
                jdbcTemplate.update(
                    """
                        UPDATE billing_catalog_stripe_sync_operations
                        SET stripe_account_id = ?, monthly_amount_cents = ?, annual_amount_cents = ?,
                            status = 'RUNNING', running_scope = ?, attempt_count = attempt_count + 1,
                            started_at = CURRENT_TIMESTAMP(6), completed_at = NULL, last_error = NULL
                        WHERE operation_key = ?
                        """,
                    stripeAccountId, request.monthly_amount_cents(), request.annual_amount_cents(),
                    product.id() + ":" + stripeMode, operationKey
                );
            });
        } catch (DataIntegrityViolationException exception) {
            throw new IllegalStateException(
                "Ya existe una sincronización de Stripe en curso para este producto.",
                exception
            );
        }
    }

    private void lockUnchangedDraft(ProductRow product, PriceRow monthly, PriceRow annual) {
        var status = jdbcTemplate.queryForObject(
            "SELECT status FROM billing_catalog_versions WHERE id = ? FOR UPDATE",
            String.class,
            product.catalogVersionId()
        );
        if (!"DRAFT".equals(status)) {
            throw new IllegalStateException(
                "La versión dejó de ser un borrador durante la sincronización; no se modificó el catálogo local."
            );
        }
        var currentProduct = jdbcTemplate.query(
            """
                SELECT product.id, product.catalog_version_id, version.version_code, product.product_code,
                       product.display_name, product.external_product_id, version.status,
                       product.stripe_mode, product.stripe_account_id
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.id = ? FOR UPDATE
                """,
            (rs, rowNum) -> new ProductRow(
                rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getString(5),
                rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9)
            ),
            product.id()
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("El producto cambió durante la sincronización."));
        if (!product.equals(currentProduct)) {
            throw new IllegalStateException(
                "El producto cambió durante la sincronización; vuelve a revisar y conectar sus precios."
            );
        }
        var currentPrices = jdbcTemplate.query(
            """
                SELECT id, billing_interval, currency, unit_amount_cents, external_price_id,
                       stripe_tax_behavior, stripe_synced_at, status, stripe_mode, stripe_account_id
                FROM billing_catalog_prices
                WHERE catalog_product_id = ? AND billing_interval IN ('MONTH', 'YEAR')
                  AND currency = 'USD' FOR UPDATE
                """,
            (rs, rowNum) -> new PriceRow(
                rs.getLong(1), rs.getString(2), rs.getString(3), rs.getObject(4, Long.class),
                rs.getString(5), rs.getString(6), rs.getTimestamp(7), rs.getString(8),
                rs.getString(9), rs.getString(10)
            ),
            product.id()
        );
        if (!containsSnapshot(currentPrices, monthly) || !containsSnapshot(currentPrices, annual)) {
            throw new IllegalStateException(
                "Los precios cambiaron durante la sincronización; vuelve a revisarlos antes de conectar Stripe."
            );
        }
    }

    private boolean containsSnapshot(List<PriceRow> currentPrices, PriceRow expected) {
        return currentPrices.stream().anyMatch(current -> current.id() == expected.id()
            && Objects.equals(current, expected));
    }

    private void completeOperation(
        String operationKey,
        String stripeAccountId,
        String stripeProductId,
        String monthlyPriceId,
        String annualPriceId
    ) {
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_stripe_sync_operations
                SET status = 'SUCCEEDED', stripe_account_id = ?, stripe_product_id = ?,
                    monthly_price_id = ?, annual_price_id = ?, running_scope = NULL,
                    completed_at = CURRENT_TIMESTAMP(6), last_error = NULL
                WHERE operation_key = ?
                """,
            stripeAccountId, stripeProductId, monthlyPriceId, annualPriceId, operationKey
        );
    }

    private void failOperation(String operationKey, RuntimeException exception) {
        transactions.executeWithoutResult(status -> jdbcTemplate.update(
            """
                UPDATE billing_catalog_stripe_sync_operations
                SET status = 'FAILED', running_scope = NULL, last_error = ?, completed_at = CURRENT_TIMESTAMP(6)
                WHERE operation_key = ?
                """,
            safeMessage(exception), operationKey
        ));
    }

    private String safeMessage(RuntimeException exception) {
        var message = exception.getMessage();
        if (message == null || message.isBlank()) return exception.getClass().getSimpleName();
        return message.length() > 500 ? message.substring(0, 500) : message;
    }

    public record SynchronizeRequest(
        Long monthly_amount_cents,
        Long annual_amount_cents,
        String target_mode,
        String confirmation
    ) {
        public SynchronizeRequest(Long monthlyAmountCents, Long annualAmountCents) {
            this(monthlyAmountCents, annualAmountCents, null, null);
        }
    }

    private record ProductRow(
        long id,
        long catalogVersionId,
        String versionCode,
        String productCode,
        String displayName,
        String externalProductId,
        String versionStatus,
        String stripeMode,
        String stripeAccountId
    ) {
    }

    private record PriceRow(
        long id,
        String interval,
        String currency,
        Long amountCents,
        String externalPriceId,
        String taxBehavior,
        Timestamp syncedAt,
        String status,
        String stripeMode,
        String stripeAccountId
    ) {
    }

    private record PriceSyncResult(String priceId, boolean reused) {
    }
}
