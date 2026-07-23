package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.signup.BillingSignupIntent;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingTenantProvisioningService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BillingSignupCheckoutReconciliationServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-23T01:00:00Z");

    @Mock
    private BillingSignupIntentRepository signupIntents;

    @Mock
    private StripeCheckoutGateway stripeGateway;

    @Mock
    private BillingProjectionRepository projections;

    @Mock
    private BillingTenantProvisioningService provisioning;

    @Mock
    private BillingAuditService audit;

    @Test
    void completedStripeSessionMarksIntentAndProvisionsWhenWebhookIsMissing() {
        var intent = intent("CHECKOUT_CREATED", "NOT_STARTED", null);
        var completed = intent("CHECKOUT_COMPLETED", "PROVISIONED", 7L);
        var subscription = new StripeCheckoutGateway.SubscriptionSnapshot(
            "sub_test",
            "cus_test",
            "trialing",
            "charge_automatically",
            "usd",
            false,
            NOW,
            NOW.plusSeconds(30L * 24 * 60 * 60),
            NOW,
            NOW.plusSeconds(30L * 24 * 60 * 60),
            null,
            "in_test"
        );
        var session = new StripeCheckoutGateway.CheckoutSessionSnapshot(
            "cs_test",
            "complete",
            "paid",
            "cus_test",
            "sub_test",
            NOW,
            subscription
        );
        when(stripeGateway.retrieveCheckoutSession("cs_test")).thenReturn(session);
        when(provisioning.provisionIfEligible(10L)).thenReturn(
            new BillingTenantProvisioningService.ProvisioningResult(10L, "PROVISIONED", 7L, 9L, true)
        );
        when(signupIntents.findById(10L)).thenReturn(completed);

        var result = service().reconcileIfCompleted(intent);

        assertThat(result.provisioned()).isTrue();
        verify(signupIntents).markCheckoutCompleted(10L, "checkout-status:cs_test", NOW, "cus_test", "cs_test", "sub_test");
        var projection = ArgumentCaptor.forClass(BillingProjectionRepository.SubscriptionSnapshot.class);
        verify(projections).upsertSubscription(projection.capture(), eq(10L));
        assertThat(projection.getValue().subscriptionId()).isEqualTo("sub_test");
        assertThat(projection.getValue().status()).isEqualTo("trialing");
        assertThat(projection.getValue().lastPaymentStatus()).isEqualTo("paid");
        verify(provisioning).provisionIfEligible(10L);
    }

    @Test
    void openStripeSessionLeavesIntentPending() {
        var intent = intent("CHECKOUT_CREATED", "NOT_STARTED", null);
        when(stripeGateway.retrieveCheckoutSession("cs_test")).thenReturn(
            new StripeCheckoutGateway.CheckoutSessionSnapshot(
                "cs_test", "open", "unpaid", "cus_test", null, NOW, null
            )
        );

        var result = service().reconcileIfCompleted(intent);

        assertThat(result).isSameAs(intent);
        verifyNoInteractions(projections, provisioning, audit);
    }

    private BillingSignupCheckoutReconciliationService service() {
        return new BillingSignupCheckoutReconciliationService(
            signupIntents,
            stripeGateway,
            projections,
            provisioning,
            audit,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    private BillingSignupIntent intent(String status, String provisioningStatus, Long companyId) {
        return new BillingSignupIntent(
            10L,
            "signup_ref",
            "idempotency_hash",
            "fingerprint",
            status,
            "cus_test",
            "cs_test",
            companyId == null ? null : "sub_test",
            "https://checkout.stripe.com/c/test",
            NOW.plusSeconds(1800),
            provisioningStatus,
            companyId,
            companyId == null ? null : 9L,
            companyId == null ? null : 11L
        );
    }
}
