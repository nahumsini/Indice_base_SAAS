package com.indice.erp.platformadmin;

import com.indice.erp.billing.subscription.BillingProductSelectionService;
import com.indice.erp.billing.subscription.BillingSelectionRequest;
import com.indice.erp.billing.subscription.BillingSelectionResponse;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PlatformCompanyModuleService {

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService accessService;
    private final PlatformAuditService audit;
    private final BillingProductSelectionService billingSelections;

    public PlatformCompanyModuleService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit,
        BillingProductSelectionService billingSelections
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessService = accessService;
        this.audit = audit;
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
        result.put("selection_state", selection.selection_state());
        result.put("effective_at", selection.effective_at());
        result.put("change_reference", selection.change_reference());
        return result;
    }

    private SubscriptionRecord subscription(long companyId) {
        requireActiveCompany(companyId);
        return jdbcTemplate.query(
            """
                SELECT stripe_subscription_id, COALESCE(billing_interval, 'MONTH') AS billing_interval,
                       trial_ends_at
                FROM company_billing_subscriptions
                WHERE company_id = ?
                ORDER BY last_event_created_at DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new SubscriptionRecord(
                rs.getString("stripe_subscription_id"),
                rs.getString("billing_interval").toUpperCase(Locale.ROOT),
                instant(rs.getTimestamp("trial_ends_at"))
            ),
            companyId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("La cuenta no tiene una suscripción Stripe."));
    }

    private void requireActiveCompany(long companyId) {
        var statuses = jdbcTemplate.query(
            "SELECT platform_status FROM companies WHERE id = ?",
            (rs, rowNum) -> rs.getString("platform_status"),
            companyId
        );
        if (statuses.isEmpty()) {
            throw new NoSuchElementException("No se encontró la cuenta.");
        }
        if (!"ACTIVE".equalsIgnoreCase(statuses.getFirst())) {
            throw new IllegalStateException("La cuenta eliminada no admite cambios de productos.");
        }
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
        String stripeSubscriptionId,
        String billingInterval,
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
