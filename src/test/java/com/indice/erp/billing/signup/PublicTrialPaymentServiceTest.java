package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.catalog.RegionalCommercialOfferService;
import com.indice.erp.billing.stripe.*;
import com.indice.erp.billing.subscription.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class PublicTrialPaymentServiceTest {
    private final Instant cutoff = Instant.parse("2026-10-23T22:00:00Z");
    private final ObjectMapper mapper = new ObjectMapper();
    private PublicTrialPaymentRepository payments;
    private BillingSignupIntentRepository intents;
    private StripeTrialPaymentGateway stripe;
    private PublicTrialPaymentService service;
    private PublicTrialPaymentRepository.Consent consent;
    private StripeWebhookEventRepository.ClaimedEvent event;

    @BeforeEach void setup() {
        payments = mock(PublicTrialPaymentRepository.class); intents = mock(BillingSignupIntentRepository.class);
        stripe = mock(StripeTrialPaymentGateway.class);
        service = new PublicTrialPaymentService(true, "https://apptest.indiceapp.com", payments,
            mock(RegionalCommercialOfferService.class), mock(BillingAccountAuthorityService.class), mock(BillingActivationService.class),
            intents, mock(StripeCheckoutGateway.class), stripe, new StripePhaseTwoProperties(), mock(JdbcTemplate.class),
            mock(BillingAuditService.class), Clock.fixed(cutoff.minusSeconds(60), ZoneOffset.UTC), mapper);
        consent = receipt(null, null);
        when(intents.findByPublicReference("reference")).thenReturn(new BillingSignupIntent(9, "reference", "key", "fp", "CHECKOUT_CREATED", "cus_owner", "cs_owner", null, null, cutoff));
        when(intents.findById(9)).thenAnswer(call -> intents.findByPublicReference("reference"));
        when(payments.consent(9)).thenAnswer(call -> consent);
        when(payments.trial(7, false)).thenReturn(new PublicTrialPaymentRepository.Trial("CA", cutoff, false));
        when(stripe.verifySetup("cs_owner")).thenReturn(new StripeTrialPaymentGateway.VerifiedSetup("cus_owner", "pm_test", "CA", "acct_verified", false, Map.of("indice_quote_hash", "quote")));
        when(payments.subscriptionAttemptRecorded(9)).thenReturn(true);
        when(stripe.createSubscription(any(), any())).thenReturn("sub_owner");
        event = new StripeWebhookEventRepository.ClaimedEvent(1, "evt_setup", "checkout.session.completed",
            "{\"data\":{\"object\":{\"id\":\"cs_owner\",\"metadata\":{\"indice_flow\":\"regional_trial_payment\",\"indice_signup_ref\":\"reference\"}}}}", 1, cutoff.minusSeconds(60));
    }
    private PublicTrialPaymentRepository.Consent receipt(String subscription, String invoice) {
        return new PublicTrialPaymentRepository.Consent(7, 9, "quote", "CAD", 19900, cutoff, cutoff, "AFTER_TRIAL",
            "price_regional", "TEST", "acct_verified", "cus_owner", subscription, "cs_owner", cutoff.minusSeconds(60), invoice, cutoff.minusSeconds(120));
    }
    @Test void setupUsesOriginalAbsoluteDeadlineAndSameIdempotencyKeyOnRetry() {
        service.prepareSetup(event); service.prepareSetup(event);
        verify(stripe, times(2)).createSubscription(argThat(command -> cutoff.equals(command.absoluteTrialEnd())
            && "cus_owner".equals(command.customerId()) && "pm_test".equals(command.paymentMethodId()) && "price_regional".equals(command.priceId())), eq("indice-trial-subscription-9"));
        verify(intents, times(2)).attachSubscription(eq(9L), eq("sub_owner"), eq("evt_setup"), any());
    }
    @Test void duplicateAfterBindingDoesNotCreateAnotherSubscription() {
        consent = receipt("sub_owner", null);
        service.prepareSetup(event);
        verifyNoInteractions(stripe);
    }
    @Test void foreignProviderCountryAccountModeOrQuoteStopsBeforeCreate() {
        for (var verified : java.util.List.of(
            new StripeTrialPaymentGateway.VerifiedSetup("cus_foreign", "pm", "CA", "acct_verified", false, Map.of("indice_quote_hash", "quote")),
            new StripeTrialPaymentGateway.VerifiedSetup("cus_owner", "pm", "MX", "acct_verified", false, Map.of("indice_quote_hash", "quote")),
            new StripeTrialPaymentGateway.VerifiedSetup("cus_owner", "pm", "CA", "acct_foreign", false, Map.of("indice_quote_hash", "quote")),
            new StripeTrialPaymentGateway.VerifiedSetup("cus_owner", "pm", "CA", "acct_verified", true, Map.of("indice_quote_hash", "quote")),
            new StripeTrialPaymentGateway.VerifiedSetup("cus_owner", "pm", "CA", "acct_verified", false, Map.of("indice_quote_hash", "changed")))) {
            when(stripe.verifySetup("cs_owner")).thenReturn(verified);
            assertThatThrownBy(() -> service.prepareSetup(event)).isInstanceOf(StripeEventProcessingException.class);
        }
        verify(stripe, never()).createSubscription(any(), any());
        verify(payments, never()).verifiedSetup(anyLong(), any());
    }
    @Test void unrecordedOrUncertainAttemptNeverBecomesImmediatePayment() {
        when(payments.subscriptionAttemptRecorded(9)).thenReturn(false);
        assertThatThrownBy(() -> service.prepareSetup(event)).isInstanceOf(StripeEventProcessingException.class);
        verify(stripe, never()).createSubscription(any(), any());
    }
    private ObjectNode invoice() throws Exception {
        return (ObjectNode) mapper.readTree("{\"id\":\"in_paid\",\"subscription\":\"sub_owner\",\"customer\":\"cus_owner\",\"status\":\"paid\",\"currency\":\"cad\",\"livemode\":false,\"amount_paid\":19900,\"amount_due\":19900,\"total\":19900,\"lines\":{\"data\":[{\"price\":\"price_regional\",\"quantity\":1,\"amount\":19900,\"period\":{\"start\":" + cutoff.getEpochSecond() + "}}]}}");
    }
    @Test void onlyVerifiedMatchedPositivePaymentConvertsAndReplayDoesNotConvertAgain() throws Exception {
        consent = receipt("sub_owner", null); when(payments.bySubscription("sub_owner")).thenAnswer(call -> consent);
        var invoice = invoice();
        invoice.put("amount_paid", 0);
        assertThat(service.confirmPaid("sub_owner", 7L, invoice, cutoff)).isFalse();
        verify(payments, never()).convert(any(), any(), any());
        invoice.put("amount_paid", 19900);
        assertThatThrownBy(() -> service.confirmPaid("sub_owner", 8L, invoice, cutoff)).isInstanceOf(StripeEventProcessingException.class);
        assertThatThrownBy(() -> service.confirmPaid("sub_owner", 7L, invoice, cutoff.minusSeconds(1))).isInstanceOf(StripeEventProcessingException.class);
        when(payments.convert(consent, "in_paid", cutoff)).thenReturn(true);
        assertThat(service.confirmPaid("sub_owner", 7L, invoice, cutoff)).isTrue();
        consent = receipt("sub_owner", "in_paid");
        assertThat(service.confirmPaid("sub_owner", 7L, invoice, cutoff)).isFalse();
        verify(payments, times(1)).convert(any(), eq("in_paid"), eq(cutoff));
    }
    @Test void unpaidSubscriptionMustMatchPriceCustomerModeAndOriginalCutoff() throws Exception {
        consent = receipt("sub_owner", null);
        var sub = (ObjectNode) mapper.readTree("{\"id\":\"sub_owner\",\"customer\":\"cus_owner\",\"currency\":\"cad\",\"collection_method\":\"charge_automatically\",\"livemode\":false,\"trial_end\":" + cutoff.getEpochSecond() + ",\"metadata\":{\"indice_quote_hash\":\"quote\"},\"items\":{\"data\":[{\"price\":\"price_regional\",\"quantity\":1}]}}");
        assertThat(PublicTrialPaymentService.validSubscription(consent, sub)).isTrue();
        for (var field : java.util.List.of("id", "customer", "currency", "trial_end", "livemode")) {
            var changed = sub.deepCopy();
            if (field.equals("trial_end")) changed.put(field, cutoff.plusSeconds(86400).getEpochSecond());
            else if (field.equals("livemode")) changed.put(field, true); else changed.put(field, "foreign");
            assertThat(PublicTrialPaymentService.validSubscription(consent, changed)).isFalse();
        }
    }

    @Test void readinessRequiresEnabledProcessorAndBothMarketsAndIntervals() {
        var offers = mock(RegionalCommercialOfferService.class);
        var properties = new StripePhaseTwoProperties();
        var candidate = new PublicTrialPaymentService(true, "https://apptest.indiceapp.com", payments,
            offers, mock(BillingAccountAuthorityService.class), mock(BillingActivationService.class),
            intents, mock(StripeCheckoutGateway.class), stripe, properties, mock(JdbcTemplate.class),
            mock(BillingAuditService.class), Clock.fixed(cutoff.minusSeconds(60), ZoneOffset.UTC), mapper);
        assertThat(candidate.publicReady()).isFalse();
        verifyNoInteractions(offers);
        properties.setEnabled(true);
        assertThat(candidate.publicReady()).isFalse();
        verifyNoInteractions(offers);
        properties.setProcessorEnabled(true);
        var available = java.util.List.of(new com.indice.erp.billing.catalog.CommercialOfferSelection(
            1, "TEST", "ca_controla", com.indice.erp.billing.catalog.BillingInterval.MONTH,
            "CAD", 10, 0, 19900L, 19900L, 0, java.util.List.of()));
        when(offers.available(anyString(), anyString())).thenReturn(available);
        assertThat(candidate.publicReady()).isTrue();
        for (var country : java.util.List.of("CA", "MX")) {
            for (var interval : java.util.List.of("MONTH", "YEAR")) {
                when(offers.available(country, interval)).thenReturn(java.util.List.of());
                assertThat(candidate.publicReady()).isFalse();
                when(offers.available(country, interval)).thenReturn(available);
            }
        }
    }
}
