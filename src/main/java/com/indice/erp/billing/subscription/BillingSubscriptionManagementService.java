package com.indice.erp.billing.subscription;

import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.portal.StripeCustomerPortalGateway;
import com.indice.erp.billing.stripe.StripeBillingGateway;
import com.indice.erp.billing.stripe.StripeIdempotencyKeys;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.stripe.exception.StripeException;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BillingSubscriptionManagementService {

    private final BillingSubscriptionRepository repository;
    private final CompanySubscriptionStatusProvider statusProvider;
    private final SubscriptionSeatLimitService seatLimitService;
    private final StripePhaseTwoProperties stripeProperties;
    private final StripeSecretProvider stripeSecrets;
    private final StripeBillingGateway stripeGateway;
    private final StripeCustomerPortalGateway portalGateway;
    private final CompanySeatAllowanceService seatAllowanceService;
    private final BillingPaymentAuditService auditService;

    public BillingSubscriptionManagementService(
        BillingSubscriptionRepository repository,
        CompanySubscriptionStatusProvider statusProvider,
        SubscriptionSeatLimitService seatLimitService,
        StripePhaseTwoProperties stripeProperties,
        StripeSecretProvider stripeSecrets,
        StripeBillingGateway stripeGateway,
        StripeCustomerPortalGateway portalGateway,
        CompanySeatAllowanceService seatAllowanceService,
        BillingPaymentAuditService auditService
    ) {
        this.repository = repository;
        this.statusProvider = statusProvider;
        this.seatLimitService = seatLimitService;
        this.stripeProperties = stripeProperties;
        this.stripeSecrets = stripeSecrets;
        this.stripeGateway = stripeGateway;
        this.portalGateway = portalGateway;
        this.seatAllowanceService = seatAllowanceService;
        this.auditService = auditService;
    }

    public java.util.Optional<BillingSubscriptionResponse> current(long companyId) {
        return repository.find(companyId).map((record) -> response(record, repository.selectedModules(companyId)));
    }

    public BillingSubscriptionResponse cancel(long companyId) {
        var record = requireRecord(companyId);
        if (record.cancelAtPeriodEnd()) {
            auditService.subscriptionAction(companyId, record.stripeSubscriptionId(), "cancel", "ignored",
                "Cancellation is already scheduled.");
            return current(companyId).orElseThrow();
        }
        if (isStripeManaged(record)) {
            requireStripeSecret();
            try {
                stripeGateway.updateSubscription(record.stripeSubscriptionId(), Map.of("cancel_at_period_end", true),
                    idempotencyKey(record, "cancel"));
            } catch (StripeException ex) {
                auditService.subscriptionAction(companyId, record.stripeSubscriptionId(), "cancel", "failed",
                    "Stripe subscription cancellation failed.");
                throw new IllegalStateException("Stripe subscription cancellation failed.", ex);
            }
        }
        repository.scheduleCancellation(companyId);
        auditService.subscriptionAction(companyId, record.stripeSubscriptionId(), "cancel", "succeeded", null);
        return current(companyId).orElseThrow();
    }

    public BillingSubscriptionResponse resume(long companyId) {
        var record = requireRecord(companyId);
        if (!record.cancelAtPeriodEnd()) {
            auditService.subscriptionAction(companyId, record.stripeSubscriptionId(), "resume", "ignored",
                "Cancellation is not scheduled.");
            return current(companyId).orElseThrow();
        }
        if (isStripeManaged(record)) {
            requireStripeSecret();
            try {
                stripeGateway.updateSubscription(record.stripeSubscriptionId(), Map.of("cancel_at_period_end", false),
                    idempotencyKey(record, "resume"));
            } catch (StripeException ex) {
                auditService.subscriptionAction(companyId, record.stripeSubscriptionId(), "resume", "failed",
                    "Stripe subscription resume failed.");
                throw new IllegalStateException("Stripe subscription resume failed.", ex);
            }
        }
        repository.resume(companyId);
        auditService.subscriptionAction(companyId, record.stripeSubscriptionId(), "resume", "succeeded", null);
        return current(companyId).orElseThrow();
    }

    public BillingPortalResponse portal(long companyId) {
        var record = requireRecord(companyId);
        if (!isStripeManaged(record)) {
            throw new IllegalStateException("Stripe billing portal is not available for this subscription.");
        }
        requireStripeSecret();
        try {
            if (stripeProperties.getPortalReturnUrl().isBlank()) {
                throw new IllegalStateException("Stripe billing portal return URL is not configured.");
            }
            var session = portalGateway.create(
                record.stripeCustomerId(),
                stripeProperties.getPortalReturnUrl(),
                "indice.company." + companyId + ".portal." + BillingHashing.randomReference()
            );
            auditService.subscriptionAction(companyId, record.stripeSubscriptionId(), "portal.opened", "succeeded", null);
            return new BillingPortalResponse(session.url());
        } catch (RuntimeException ex) {
            auditService.subscriptionAction(companyId, record.stripeSubscriptionId(), "portal.opened", "failed",
                "Stripe billing portal could not be opened.");
            throw new IllegalStateException("Stripe billing portal could not be opened.", ex);
        }
    }

    private BillingSubscriptionRecord requireRecord(long companyId) {
        return repository.find(companyId)
            .orElseThrow(() -> new IllegalArgumentException("Company subscription was not found."));
    }

    private BillingSubscriptionResponse response(BillingSubscriptionRecord record, java.util.List<String> modules) {
        var status = statusProvider.currentStatus(record.companyId());
        var allowance = seatAllowanceService.currentUsage(record.companyId());
        var seatUsage = seatLimitService.usage(record.companyId());
        return new BillingSubscriptionResponse(
            record.status(),
            record.planId(),
            record.moduleCount(),
            record.includedCollaborators(),
            record.extraCollaborators(),
            allowance.allowedSeats(),
            allowance.usedSeats(),
            allowance.remainingSeats(),
            record.recurringAmountCents(),
            record.recurringAmountCents(),
            record.extraSeatUnitAmountCents(),
            record.billingInterval(),
            record.currency(),
            instantText(record.trialStartAt()),
            instantText(record.trialEndAt()),
            instantText(record.currentPeriodStartAt()),
            instantText(record.currentPeriodEndAt()),
            record.cancelAtPeriodEnd(),
            instantText(record.canceledAt()),
            instantText(record.cancellationEffectiveAt()),
            instantText(record.paymentFailedAt()),
            instantText(record.paymentGraceUntil()),
            record.paymentFailureReason(),
            record.latestInvoiceId(),
            record.source(),
            status.accessAllowed(),
            status.lockReason(),
            record.pricesExcludeTaxes(),
            modules,
            seatUsage.usedSeats(),
            seatUsage.activeSeats(),
            seatUsage.pendingInvitations(),
            seatUsage.remainingSeats(),
            seatUsage.enforced()
        );
    }

    private boolean isStripeManaged(BillingSubscriptionRecord record) {
        return "stripe".equals(record.source())
            && !record.stripeSubscriptionId().startsWith("internal_")
            && !record.stripeSubscriptionId().startsWith("legacy_");
    }

    private String idempotencyKey(BillingSubscriptionRecord record, String action) {
        return StripeIdempotencyKeys.subscriptionAction(
            record.companyId(),
            record.stripeSubscriptionId(),
            action,
            record.updatedAt()
        );
    }

    private void requireStripeSecret() {
        if (!stripeSecrets.isApiConfigured()) {
            throw new IllegalStateException("Stripe subscription management is not configured.");
        }
    }

    private String instantText(Instant instant) {
        return instant == null ? "" : instant.toString();
    }
}
