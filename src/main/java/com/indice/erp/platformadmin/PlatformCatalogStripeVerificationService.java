package com.indice.erp.platformadmin;

import com.indice.erp.billing.stripe.StripeCatalogGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PlatformCatalogStripeVerificationService {

    private final JdbcTemplate jdbcTemplate;
    private final StripeCatalogGateway stripe;
    private final StripeSecretProvider secrets;
    private final StripePhaseTwoProperties properties;
    private final PlatformAuditService audit;

    public PlatformCatalogStripeVerificationService(
        JdbcTemplate jdbcTemplate,
        StripeCatalogGateway stripe,
        StripeSecretProvider secrets,
        StripePhaseTwoProperties properties,
        PlatformAuditService audit
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.stripe = stripe;
        this.secrets = secrets;
        this.properties = properties;
        this.audit = audit;
    }

    public VerificationResult verify(long actorUserId, long versionId) {
        var blockers = new ArrayList<Map<String, Object>>();
        if (!properties.isEnabled()) {
            blockers.add(blocker(
                "STRIPE_DISABLED", "catalog",
                "Stripe debe estar habilitado para verificar y publicar la oferta."
            ));
            return new VerificationResult(mode(), null, blockers);
        }

        String accountId;
        try {
            secrets.requireEnabled();
            var account = stripe.account();
            accountId = account.accountId();
            if (accountId == null || accountId.isBlank()) {
                throw new IllegalStateException("Stripe no devolvió el identificador de cuenta.");
            }
            if ("LIVE".equals(mode()) && (!account.chargesEnabled() || !account.payoutsEnabled())) {
                throw new IllegalStateException("la cuenta LIVE no está habilitada para cobros y depósitos");
            }
        } catch (RuntimeException exception) {
            blockers.add(blocker(
                "STRIPE_UNAVAILABLE", "catalog",
                "No fue posible verificar la cuenta de Stripe: " + safeMessage(exception)
            ));
            return new VerificationResult(mode(), null, blockers);
        }

        var currentMode = mode();
        var products = products(versionId);
        for (var product : products) {
            verifyProduct(product, currentMode, accountId, blockers);
            prices(product, currentMode, accountId, blockers);
        }
        promotions(versionId, currentMode, accountId, blockers);
        audit.record(
            actorUserId,
            "CATALOG_STRIPE_REFERENCES_VERIFIED",
            "BILLING_CATALOG",
            Long.toString(versionId),
            null,
            blockers.isEmpty() ? "SUCCESS" : "FAILURE",
            Map.of(
                "stripe_mode", currentMode,
                "stripe_account_id", accountId,
                "products_checked", products.size(),
                "blockers", blockers.size()
            )
        );
        return new VerificationResult(currentMode, accountId, blockers);
    }

    public String configuredMode() {
        return mode();
    }

    private void verifyProduct(
        ProductReference product,
        String currentMode,
        String accountId,
        List<Map<String, Object>> blockers
    ) {
        if (!referenceReady(
            product.externalProductId(), "prod_", product.stripeMode(), product.stripeAccountId(),
            currentMode, accountId
        )) {
            blockers.add(blocker(
                "STRIPE_PRODUCT_NOT_VERIFIED", product.productCode(),
                "El producto " + product.displayName() + " no pertenece a la cuenta y modo de Stripe configurados."
            ));
            markProductError(product);
            return;
        }
        try {
            var remote = stripe.verifyProduct(product.externalProductId());
            var valid = remote.active()
                && remote.livemode() == "LIVE".equals(currentMode)
                && product.displayName().equals(remote.name())
                && product.taxCode().equals(remote.taxCode());
            if (!valid) {
                throw new IllegalStateException("nombre, estado o código fiscal no coincide");
            }
            var now = Timestamp.from(Instant.now());
            var updated = jdbcTemplate.update(
                """
                    UPDATE billing_catalog_products
                    SET stripe_verified_at = ?, stripe_sync_status = 'READY'
                    WHERE id = ? AND display_name = ? AND external_product_id <=> ?
                      AND stripe_tax_code <=> ? AND stripe_mode <=> ? AND stripe_account_id <=> ?
                      AND stripe_sync_status = ?
                    """,
                now, product.id(), product.displayName(), product.externalProductId(), product.taxCode(),
                product.stripeMode(), product.stripeAccountId(), product.syncStatus()
            );
            if (updated != 1) throw new IllegalStateException("el producto cambió durante la verificación");
        } catch (RuntimeException exception) {
            markProductError(product);
            blockers.add(blocker(
                "STRIPE_PRODUCT_MISMATCH", product.productCode(),
                "El producto " + product.displayName() + " no coincide con Stripe: " + safeMessage(exception)
            ));
        }
    }

    private void prices(
        ProductReference product,
        String currentMode,
        String accountId,
        List<Map<String, Object>> blockers
    ) {
        var prices = jdbcTemplate.query(
            """
                SELECT id, billing_interval, currency, unit_amount_cents, external_price_id,
                       stripe_tax_behavior, stripe_mode, stripe_account_id, stripe_sync_status
                FROM billing_catalog_prices
                WHERE catalog_product_id = ? AND billing_interval IN ('MONTH', 'YEAR') AND currency = 'USD'
                """,
            (rs, rowNum) -> new PriceReference(
                rs.getLong(1), rs.getString(2), rs.getString(3),
                rs.getObject(4, Long.class), rs.getString(5), rs.getString(6),
                rs.getString(7), rs.getString(8), rs.getString(9)
            ),
            product.id()
        );
        for (var price : prices) {
            if (price.amountCents() == null || price.amountCents() <= 0 || !referenceReady(
                price.externalPriceId(), "price_", price.stripeMode(), price.stripeAccountId(),
                currentMode, accountId
            )) {
                markPriceError(price);
                blockers.add(priceBlocker(product, price.interval(), "no está vinculada a la cuenta configurada"));
                continue;
            }
            try {
                var remote = stripe.verifyRecurringPrice(price.externalPriceId());
                var valid = remote.active()
                    && remote.livemode() == "LIVE".equals(currentMode)
                    && product.externalProductId().equals(remote.productId())
                    && price.currency().equalsIgnoreCase(remote.currency())
                    && price.amountCents() == remote.amountCents()
                    && price.interval().equalsIgnoreCase(remote.interval())
                    && "exclusive".equalsIgnoreCase(remote.taxBehavior());
                if (!valid) throw new IllegalStateException("importe, intervalo, producto o impuestos no coincide");
                var now = Timestamp.from(Instant.now());
                var updated = jdbcTemplate.update(
                    """
                        UPDATE billing_catalog_prices
                        SET stripe_verified_at = ?, stripe_sync_status = 'READY'
                        WHERE id = ? AND billing_interval = ? AND currency = ?
                          AND unit_amount_cents <=> ? AND external_price_id <=> ?
                          AND stripe_tax_behavior <=> ? AND stripe_mode <=> ?
                          AND stripe_account_id <=> ? AND stripe_sync_status = ?
                        """,
                    now, price.id(), price.interval(), price.currency(), price.amountCents(),
                    price.externalPriceId(), price.taxBehavior(), price.stripeMode(),
                    price.stripeAccountId(), price.syncStatus()
                );
                if (updated != 1) throw new IllegalStateException("la tarifa cambió durante la verificación");
            } catch (RuntimeException exception) {
                markPriceError(price);
                blockers.add(priceBlocker(product, price.interval(), safeMessage(exception)));
            }
        }
    }

    private void promotions(
        long versionId,
        String currentMode,
        String accountId,
        List<Map<String, Object>> blockers
    ) {
        var promotions = jdbcTemplate.query(
            """
                SELECT id, promotion_code, display_name, discount_type, percent_basis_points,
                       amount_off_cents, currency, duration_type, duration_cycles,
                       starts_at, ends_at, external_promotion_code_id, stripe_mode,
                       stripe_account_id, stripe_sync_status
                FROM billing_catalog_promotions
                WHERE catalog_version_id = ? AND active = 1
                """,
            (rs, rowNum) -> new PromotionReference(
                rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getObject(5, Integer.class), rs.getObject(6, Long.class), rs.getString(7),
                rs.getString(8), rs.getObject(9, Integer.class), rs.getTimestamp(10),
                rs.getTimestamp(11), rs.getString(12), rs.getString(13), rs.getString(14),
                rs.getString(15)
            ),
            versionId
        );
        for (var promotion : promotions) {
            var invalidId = promotion.externalId() == null || !promotion.externalId().startsWith("promo_");
            var boundElsewhere = (promotion.stripeMode() != null && !currentMode.equals(promotion.stripeMode()))
                || (promotion.stripeAccountId() != null && !accountId.equals(promotion.stripeAccountId()));
            if (invalidId || boundElsewhere) {
                markPromotionError(promotion);
                blockers.add(promotionBlocker(promotion, "no pertenece a la cuenta y modo configurados"));
                continue;
            }
            try {
                var remote = stripe.verifyPromotionCode(promotion.externalId());
                var valid = remote.active()
                    && remote.livemode() == "LIVE".equals(currentMode)
                    && promotion.code().equalsIgnoreCase(remote.code())
                    && promotion.discountType().equals(remote.discountType())
                    && Objects.equals(promotion.percentBasisPoints(), remote.percentBasisPoints())
                    && Objects.equals(promotion.amountOffCents(), remote.amountOffCents())
                    && ("PERCENT".equals(promotion.discountType())
                        || promotion.currency().equalsIgnoreCase(remote.currency()))
                    && promotion.durationType().equals(remote.durationType())
                    && Objects.equals(promotion.durationCycles(), remote.durationCycles())
                    && promotionProductIds(promotion.id()).equals(new HashSet<>(remote.productIds()));
                if (!valid) throw new IllegalStateException("descuento, vigencia o productos aplicables no coinciden");
                var now = Timestamp.from(Instant.now());
                var updated = jdbcTemplate.update(
                    """
                        UPDATE billing_catalog_promotions
                        SET stripe_mode = ?, stripe_account_id = ?, stripe_verified_at = ?,
                            stripe_sync_status = 'READY'
                        WHERE id = ? AND promotion_code = ? AND display_name = ?
                          AND discount_type = ? AND percent_basis_points <=> ?
                          AND amount_off_cents <=> ? AND currency = ? AND duration_type = ?
                          AND duration_cycles <=> ? AND starts_at <=> ? AND ends_at <=> ?
                          AND external_promotion_code_id <=> ? AND stripe_mode <=> ?
                          AND stripe_account_id <=> ? AND stripe_sync_status = ? AND active = 1
                        """,
                    currentMode, accountId, now, promotion.id(), promotion.code(),
                    promotion.displayName(), promotion.discountType(), promotion.percentBasisPoints(),
                    promotion.amountOffCents(), promotion.currency(), promotion.durationType(),
                    promotion.durationCycles(), promotion.startsAt(), promotion.endsAt(),
                    promotion.externalId(), promotion.stripeMode(), promotion.stripeAccountId(),
                    promotion.syncStatus()
                );
                if (updated != 1) throw new IllegalStateException("la promoción cambió durante la verificación");
            } catch (RuntimeException exception) {
                markPromotionError(promotion);
                blockers.add(promotionBlocker(promotion, safeMessage(exception)));
            }
        }
    }

    private List<ProductReference> products(long versionId) {
        return jdbcTemplate.query(
            """
                SELECT id, product_code, display_name, external_product_id, stripe_tax_code,
                       stripe_mode, stripe_account_id, stripe_sync_status
                FROM billing_catalog_products
                WHERE catalog_version_id = ? AND active = 1
                  AND commercial_kind IN ('MODULE', 'PACKAGE', 'SEAT')
                """,
            (rs, rowNum) -> new ProductReference(
                rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8)
            ),
            versionId
        );
    }

    private HashSet<String> promotionProductIds(long promotionId) {
        return new HashSet<>(jdbcTemplate.query(
            """
                SELECT product.external_product_id
                FROM billing_catalog_promotion_products link
                JOIN billing_catalog_products product ON product.id = link.catalog_product_id
                WHERE link.promotion_id = ?
                """,
            (rs, rowNum) -> rs.getString(1),
            promotionId
        ));
    }

    private boolean referenceReady(
        String externalId,
        String prefix,
        String referenceMode,
        String referenceAccountId,
        String currentMode,
        String currentAccountId
    ) {
        return externalId != null && externalId.startsWith(prefix)
            && currentMode.equals(referenceMode)
            && currentAccountId.equals(referenceAccountId);
    }

    private Map<String, Object> priceBlocker(ProductReference product, String interval, String reason) {
        return blocker(
            "STRIPE_PRICE_MISMATCH", product.productCode(),
            "La tarifa " + interval.toLowerCase(Locale.ROOT) + " de " + product.displayName()
                + " no coincide con Stripe: " + reason + "."
        );
    }

    private Map<String, Object> promotionBlocker(PromotionReference promotion, String reason) {
        return blocker(
            "PROMOTION_NOT_READY", promotion.code(),
            "La promoción " + promotion.displayName() + " no coincide con Stripe: " + reason + "."
        );
    }

    private Map<String, Object> blocker(String code, String productCode, String message) {
        return Map.of("code", code, "product_code", productCode, "message", message);
    }

    private void markProductError(ProductReference product) {
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_products SET stripe_sync_status = 'ERROR'
                WHERE id = ? AND display_name = ? AND external_product_id <=> ?
                  AND stripe_tax_code <=> ? AND stripe_mode <=> ? AND stripe_account_id <=> ?
                  AND stripe_sync_status = ?
                """,
            product.id(), product.displayName(), product.externalProductId(), product.taxCode(),
            product.stripeMode(), product.stripeAccountId(), product.syncStatus()
        );
    }

    private void markPriceError(PriceReference price) {
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_prices SET stripe_sync_status = 'ERROR'
                WHERE id = ? AND billing_interval = ? AND currency = ?
                  AND unit_amount_cents <=> ? AND external_price_id <=> ?
                  AND stripe_tax_behavior <=> ? AND stripe_mode <=> ?
                  AND stripe_account_id <=> ? AND stripe_sync_status = ?
                """,
            price.id(), price.interval(), price.currency(), price.amountCents(), price.externalPriceId(),
            price.taxBehavior(), price.stripeMode(), price.stripeAccountId(), price.syncStatus()
        );
    }

    private void markPromotionError(PromotionReference promotion) {
        jdbcTemplate.update(
            """
                UPDATE billing_catalog_promotions SET stripe_sync_status = 'ERROR'
                WHERE id = ? AND promotion_code = ? AND display_name = ?
                  AND discount_type = ? AND percent_basis_points <=> ? AND amount_off_cents <=> ?
                  AND currency = ? AND duration_type = ? AND duration_cycles <=> ?
                  AND starts_at <=> ? AND ends_at <=> ? AND external_promotion_code_id <=> ?
                  AND stripe_mode <=> ? AND stripe_account_id <=> ? AND stripe_sync_status = ?
                """,
            promotion.id(), promotion.code(), promotion.displayName(), promotion.discountType(),
            promotion.percentBasisPoints(), promotion.amountOffCents(), promotion.currency(),
            promotion.durationType(), promotion.durationCycles(), promotion.startsAt(), promotion.endsAt(),
            promotion.externalId(), promotion.stripeMode(), promotion.stripeAccountId(), promotion.syncStatus()
        );
    }

    private String mode() {
        return secrets.isLiveMode() ? "LIVE" : "TEST";
    }

    private String safeMessage(RuntimeException exception) {
        var value = exception.getMessage();
        if (value == null || value.isBlank()) return exception.getClass().getSimpleName();
        return value.length() > 240 ? value.substring(0, 240) : value;
    }

    public record VerificationResult(
        String stripeMode,
        String stripeAccountId,
        List<Map<String, Object>> blockers
    ) {
    }

    private record ProductReference(
        long id,
        String productCode,
        String displayName,
        String externalProductId,
        String taxCode,
        String stripeMode,
        String stripeAccountId,
        String syncStatus
    ) {
    }

    private record PriceReference(
        long id,
        String interval,
        String currency,
        Long amountCents,
        String externalPriceId,
        String taxBehavior,
        String stripeMode,
        String stripeAccountId,
        String syncStatus
    ) {
    }

    private record PromotionReference(
        long id,
        String code,
        String displayName,
        String discountType,
        Integer percentBasisPoints,
        Long amountOffCents,
        String currency,
        String durationType,
        Integer durationCycles,
        Timestamp startsAt,
        Timestamp endsAt,
        String externalId,
        String stripeMode,
        String stripeAccountId,
        String syncStatus
    ) {
    }
}
