package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingTenantProvisioningService;
import com.indice.erp.billing.subscription.BillingActivationService;
import com.indice.erp.billing.subscription.BillingSelectionChangeService;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StripeWebhookEventHandlerTest {

    @Mock private BillingSignupIntentRepository signupIntents;
    @Mock private BillingProjectionRepository projections;
    @Mock private BillingTenantProvisioningService provisioning;
    @Mock private BillingAuditService audit;
    @Mock private CompanyEntitlementProjectionService entitlementProjection;
    @Mock private CommercialLifecycleService commercialLifecycle;
    @Mock private BillingActivationService activationService;
    @Mock private BillingSelectionChangeService selectionChanges;

    @Test
    void paidInvoiceUsesItsExactSubscriptionAndPeriodStartForTheScheduledChange() {
        var association = new BillingProjectionRepository.ProjectionAssociation(7L, 42L, 11L, false);
        when(projections.associationForSubscription("sub_expected")).thenReturn(association);

        var result = handler().process(claimed("""
            {
              "id": "evt_invoice_paid",
              "type": "invoice.paid",
              "created": 1788134400,
              "data": {"object": {
                "id": "in_paid",
                "subscription": "sub_expected",
                "customer": "cus_expected",
                "status": "paid",
                "currency": "usd",
                "period_start": 1788220800,
                "period_end": 1790812800
              }}
            }
            """));

        assertThat(result.companyId()).isEqualTo(42L);
        verify(selectionChanges).applyDue(
            42L,
            "sub_expected",
            "evt_invoice_paid",
            Instant.ofEpochSecond(1788220800)
        );
        verify(entitlementProjection).refreshIfEnrolled(42L);
    }

    @Test
    void paidInvoiceWithoutPeriodStartCannotInventTheCutoffFromEventTime() {
        var association = new BillingProjectionRepository.ProjectionAssociation(7L, 42L, 11L, false);
        when(projections.associationForSubscription("sub_expected")).thenReturn(association);

        handler().process(claimed("""
            {
              "id": "evt_without_period",
              "type": "invoice.payment_succeeded",
              "created": 1788134400,
              "data": {"object": {
                "id": "in_without_period",
                "subscription": "sub_expected",
                "customer": "cus_expected",
                "status": "paid",
                "currency": "usd"
              }}
            }
            """));

        verify(selectionChanges).applyDue(
            42L,
            "sub_expected",
            "evt_without_period",
            null
        );
    }

    @ParameterizedTest
    @ValueSource(strings = {"invoice.payment_succeeded", "invoice.paid"})
    void successfulPaymentEventThatIsNotASettledInvoiceDoesNotApplyAccess(String eventType) {
        var association = new BillingProjectionRepository.ProjectionAssociation(7L, 42L, 11L, false);
        when(projections.associationForSubscription("sub_expected")).thenReturn(association);

        handler().process(claimed("""
            {
              "id": "evt_payment_attempt",
              "type": "%s",
              "created": 1788134400,
              "data": {"object": {
                "id": "in_still_open",
                "subscription": "sub_expected",
                "customer": "cus_expected",
                "status": "open",
                "currency": "usd",
                "period_start": 1788220800
              }}
            }
            """.formatted(eventType)));

        verifyNoInteractions(commercialLifecycle, selectionChanges, entitlementProjection);
    }

    private StripeWebhookEventHandler handler() {
        return new StripeWebhookEventHandler(
            new ObjectMapper(),
            signupIntents,
            projections,
            provisioning,
            audit,
            entitlementProjection,
            commercialLifecycle,
            activationService,
            selectionChanges
        );
    }

    private StripeWebhookEventRepository.ClaimedEvent claimed(String payload) {
        return new StripeWebhookEventRepository.ClaimedEvent(
            1L,
            "stored_event",
            "invoice.paid",
            payload,
            1,
            Instant.ofEpochSecond(1788134400)
        );
    }
}
