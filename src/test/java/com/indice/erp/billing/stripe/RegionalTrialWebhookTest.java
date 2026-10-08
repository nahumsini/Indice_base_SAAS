package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.indice.erp.billing.signup.*;
import com.indice.erp.billing.subscription.*;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RegionalTrialWebhookTest {
    private final PublicTrialPaymentService payment = mock(PublicTrialPaymentService.class);
    private final BillingSignupIntentRepository intents = mock(BillingSignupIntentRepository.class);
    private final BillingProjectionRepository projections = mock(BillingProjectionRepository.class);
    private final BillingActivationService activation = mock(BillingActivationService.class);
    private final BillingTenantProvisioningService provisioning = mock(BillingTenantProvisioningService.class);
    private final StripeWebhookEventHandler handler = new StripeWebhookEventHandler(new ObjectMapper(), intents, projections, provisioning,
        mock(BillingAuditService.class), mock(CompanyEntitlementProjectionService.class), mock(CommercialLifecycleService.class),
        activation, mock(BillingSelectionChangeService.class), payment);
    private final Instant cutoff = Instant.parse("2026-10-23T22:00:00Z");
    private StripeWebhookEventRepository.ClaimedEvent event(String type, String object) {
        return new StripeWebhookEventRepository.ClaimedEvent(1, "evt_regional", type,
            "{\"id\":\"evt_regional\",\"type\":\"" + type + "\",\"created\":" + cutoff.getEpochSecond() + ",\"data\":{\"object\":" + object + "}}", 1, cutoff);
    }
    private PublicTrialPaymentRepository.Consent consent() {
        return new PublicTrialPaymentRepository.Consent(7, 9, "quote", "CAD", 19900, cutoff, cutoff, "AFTER_TRIAL",
            "price_regional", "TEST", "acct_test", "cus_owner", "sub_owner", "cs_owner", cutoff.minusSeconds(60), null, cutoff.minusSeconds(120));
    }
    @Test void setupCompletionNeverProvisionsAnotherTenantOrGrantsPaidAccess() {
        when(intents.findByPublicReference("reference")).thenReturn(new BillingSignupIntent(9, "reference", "key", "fp", "CHECKOUT_CREATED", "cus_owner", "cs_owner", "sub_owner", null, cutoff));
        when(payment.regionalIntent(9)).thenReturn(true); when(payment.consent(9)).thenReturn(consent());
        var result = handler.process(event("checkout.session.completed", "{\"id\":\"cs_owner\",\"customer\":\"cus_owner\",\"metadata\":{\"indice_signup_ref\":\"reference\"}}"));
        assertThat(result.companyId()).isEqualTo(7L);
        verifyNoInteractions(activation, provisioning, projections);
    }
    @Test void invoiceArrivingBeforeSubscriptionBindingRemainsRetryableInsteadOfBeingOrphaned() {
        when(payment.unconvertedRegionalCustomer("cus_owner")).thenReturn(true);
        assertThatThrownBy(() -> handler.process(event("invoice.paid", "{\"id\":\"in_paid\",\"customer\":\"cus_owner\",\"subscription\":\"sub_owner\",\"status\":\"paid\"}")))
            .isInstanceOf(StripeEventProcessingException.class);
        verify(projections, never()).upsertInvoice(any(), any());
        verifyNoInteractions(activation, provisioning);
    }
    @Test void subscriptionCannotProjectBeforeItsVerifiedRegionalBinding() {
        doThrow(new StripeEventProcessingException("WAITING_TRIAL_SUBSCRIPTION_BINDING", "Synthetic waiting"))
            .when(payment).requireSubscriptionBinding(any(), any());
        assertThatThrownBy(() -> handler.process(event("customer.subscription.created", "{\"id\":\"sub_owner\",\"customer\":\"cus_owner\"}")))
            .isInstanceOf(StripeEventProcessingException.class);
        verifyNoInteractions(projections, activation, provisioning);
    }
    @Test void onlySuccessfulReceiptConversionRunsNativePaidActivation() {
        when(payment.bySubscription("sub_owner")).thenReturn(consent());
        when(projections.associationForSubscription("sub_owner")).thenReturn(new BillingProjectionRepository.ProjectionAssociation(10L, 7L, 9L, true));
        var event = event("invoice.paid", "{\"id\":\"in_paid\",\"customer\":\"cus_owner\",\"subscription\":\"sub_owner\",\"status\":\"paid\"}");
        handler.process(event);
        verify(activation, never()).complete(anyLong(), any());
        when(payment.confirmPaid(eq("sub_owner"), eq(7L), any(), eq(cutoff))).thenReturn(true);
        handler.process(event);
        verify(activation, times(1)).complete(9L, "cus_owner");
    }
}
