package com.indice.erp.platformadmin;

import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.subscription.BillingProductSelectionService;
import com.indice.erp.billing.subscription.BillingSelectionRequest;
import com.indice.erp.billing.subscription.BillingSelectionResponse;
import com.indice.erp.billing.stripe.StripeBillingGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.stripe.exception.StripeException;
import com.stripe.model.SubscriptionItem;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PlatformCompanyModuleService {

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactions;
    private final PlatformAdminAccessService accessService;
    private final PlatformAdminService platformAdminService;
    private final PlatformAuditService audit;
    private final CommercialOfferSelectionService offers;
    private final StripePhaseTwoProperties stripeProperties;
    private final StripeBillingGateway stripeGateway;
    private final BillingProductSelectionService billingSelections;

    public PlatformCompanyModuleService(
        JdbcTemplate jdbcTemplate,
        TransactionTemplate transactions,
        PlatformAdminAccessService accessService,
        PlatformAdminService platformAdminService,
        PlatformAuditService audit,
        CommercialOfferSelectionService offers,
        StripePhaseTwoProperties stripeProperties,
        StripeBillingGateway stripeGateway,
        BillingProductSelectionService billingSelections
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactions = transactions;
        this.accessService = accessService;
        this.platformAdminService = platformAdminService;
        this.audit = audit;
        this.offers = offers;
        this.stripeProperties = stripeProperties;
        this.stripeGateway = stripeGateway;
        this.billingSelections = billingSelections;
    }

    public Map<String, Object> updateTrialProducts(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        ProductSelectionRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        return updateTrialProductsAfterAuthorization(actorUserId, companyId, idempotencyKey, request);
    }

    public BillingSelectionResponse previewProducts(
        long actorUserId,
        long companyId,
        ProductSelectionRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        return previewProductsAfterAuthorization(companyId, request);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    public BillingSelectionResponse previewProductsAfterAuthorization(
        long companyId,
        ProductSelectionRequest request
    ) {
        var subscription = subscription(companyId);
        if (!subscription.stripeManaged()) {
            throw new IllegalStateException(
                "Esta cuenta todavía no tiene una suscripción administrada por Stripe."
            );
        }
        return billingSelections.preview(
            companyId,
            new BillingSelectionRequest(
                request == null ? null : request.product_codes(),
                null,
                subscription.billingInterval()
            )
        );
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    public Map<String, Object> updateTrialProductsAfterAuthorization(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        ProductSelectionRequest request
    ) {
        var cleanKey = requireIdempotencyKey(idempotencyKey);
        var subscription = subscription(companyId);
        if (!subscription.stripeManaged()) {
            throw new IllegalStateException(
                "Esta demo no tiene un método de pago en Stripe. Edita sus accesos administrativos o completa primero el alta de cobro."
            );
        }
        var selection = billingSelections.update(
            companyId,
            actorUserId,
            cleanKey,
            new BillingSelectionRequest(
                request == null ? null : request.product_codes(),
                null,
                subscription.billingInterval()
            ),
            request == null ? null : request.expected_catalog_version()
        );
        var selectedCodes = selection.selected_product_codes();
        audit.record(actorUserId, "TRIAL_PRODUCTS_UPDATED", "COMPANY", String.valueOf(companyId), companyId, "SUCCESS", Map.of(
            "offer_code", selection.offer_code(),
            "product_codes", selectedCodes,
            "charge_timing", selection.change_timing(),
            "proration_behavior", "none"
        ));

        var result = new LinkedHashMap<String, Object>();
        result.put("company_id", companyId);
        result.put("product_codes", selectedCodes);
        result.put("offer_code", selection.offer_code());
        result.put("billing_interval", subscription.billingInterval());
        result.put("trial_ends_at", subscription.trialEndsAt() == null ? null : subscription.trialEndsAt().toString());
        result.put("charge_timing", selection.change_timing());
        result.put("charged_now", selection.charged_now());
        return result;
    }

    private SubscriptionRecord subscription(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, company_id, stripe_subscription_id, status, COALESCE(billing_interval, 'MONTH') AS billing_interval,
                       COALESCE(extra_seats, 0) AS extra_seats, signup_intent_id,
                       trial_starts_at, trial_ends_at
                FROM company_billing_subscriptions
                WHERE company_id = ?
                ORDER BY last_event_created_at DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new SubscriptionRecord(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getString("stripe_subscription_id"),
                rs.getString("status").toUpperCase(Locale.ROOT),
                rs.getString("billing_interval").toUpperCase(Locale.ROOT),
                rs.getInt("extra_seats"),
                (Long) rs.getObject("signup_intent_id"),
                instant(rs.getTimestamp("trial_starts_at")),
                instant(rs.getTimestamp("trial_ends_at"))
            ),
            companyId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("La cuenta no tiene una suscripción Stripe."));
    }

    private List<Long> currentProductIds(long subscriptionId) {
        return jdbcTemplate.query(
            "SELECT catalog_product_id FROM company_billing_subscription_products WHERE subscription_id = ?",
            (rs, rowNum) -> rs.getLong(1),
            subscriptionId
        );
    }

    private void replaceSelection(
        SubscriptionRecord subscription,
        long catalogVersionId,
        String offerCode,
        List<Long> productIds
    ) {
        jdbcTemplate.update(
            "UPDATE company_billing_subscriptions SET catalog_version_id = ?, offer_code = ? WHERE id = ?",
            catalogVersionId,
            offerCode,
            subscription.id()
        );
        jdbcTemplate.update("DELETE FROM company_billing_subscription_products WHERE subscription_id = ?", subscription.id());
        for (var productId : productIds) {
            jdbcTemplate.update(
                "INSERT INTO company_billing_subscription_products (subscription_id, catalog_product_id, source) VALUES (?, ?, 'PLATFORM_ADMIN')",
                subscription.id(),
                productId
            );
        }
        if (subscription.signupIntentId() != null && subscription.trialStartsAt() != null && subscription.trialEndsAt() != null) {
            jdbcTemplate.update(
                "DELETE FROM company_trial_product_grants WHERE company_id = ? AND source_signup_intent_id = ?",
                subscription.companyId(),
                subscription.signupIntentId()
            );
            for (var productId : productIds) {
                jdbcTemplate.update(
                    """
                        INSERT INTO company_trial_product_grants (
                            company_id, catalog_product_id, source_signup_intent_id, status, starts_at, ends_at
                        ) VALUES (?, ?, ?, 'ACTIVE', ?, ?)
                        """,
                    subscription.companyId(),
                    productId,
                    subscription.signupIntentId(),
                    Timestamp.from(subscription.trialStartsAt()),
                    Timestamp.from(subscription.trialEndsAt())
                );
            }
        }
    }

    private SubscriptionItem baseItem(List<SubscriptionItem> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalStateException("La suscripción Stripe no contiene un producto base.");
        }
        Set<String> basePriceIds = new LinkedHashSet<>();
        basePriceIds.addAll(List.of(
            stripeProperties.getPriceBasic1Monthly(), stripeProperties.getPriceBasic1Annual(),
            stripeProperties.getPriceBasic2Monthly(), stripeProperties.getPriceBasic2Annual(),
            stripeProperties.getPriceBasic3Monthly(), stripeProperties.getPriceBasic3Annual(),
            stripeProperties.getPriceBasicAllMonthly(), stripeProperties.getPriceBasicAllAnnual()
        ));
        basePriceIds.removeIf(String::isBlank);
        return items.stream()
            .filter(item -> item.getPrice() != null && basePriceIds.contains(item.getPrice().getId()))
            .findFirst()
            .orElse(items.getFirst());
    }

    private String requireIdempotencyKey(String value) {
        var clean = value == null ? "" : value.trim();
        if (clean.length() < 8 || clean.length() > 120) {
            throw new IllegalArgumentException("Se requiere una llave de idempotencia válida.");
        }
        return clean.replaceAll("[^a-zA-Z0-9._-]", "-");
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    public record ProductSelectionRequest(List<String> product_codes, String expected_catalog_version) {
        public ProductSelectionRequest(List<String> productCodes) {
            this(productCodes, null);
        }
    }

    private record SubscriptionRecord(
        long id,
        long companyId,
        String stripeSubscriptionId,
        String status,
        String billingInterval,
        int extraSeats,
        Long signupIntentId,
        Instant trialStartsAt,
        Instant trialEndsAt
    ) {
        boolean stripeManaged() {
            return stripeSubscriptionId != null
                && !stripeSubscriptionId.isBlank()
                && !stripeSubscriptionId.startsWith("internal_")
                && !stripeSubscriptionId.startsWith("legacy_");
        }
    }
}
