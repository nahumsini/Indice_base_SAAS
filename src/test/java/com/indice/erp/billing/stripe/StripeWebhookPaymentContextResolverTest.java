package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class StripeWebhookPaymentContextResolverTest {

    private final StripeBillingGateway gateway = mock(StripeBillingGateway.class);
    private final StripeSecretProvider secrets = mock(StripeSecretProvider.class);
    private final StripeWebhookPaymentContextResolver resolver =
        new StripeWebhookPaymentContextResolver(gateway, new ObjectMapper(), secrets);

    @Test
    void retrievesTheChargeCustomerForARealisticDisputePayload() throws Exception {
        var charge = charge("ch_expected", false);
        charge.setCustomer("cus_expected");
        when(gateway.retrieveCharge("ch_expected")).thenReturn(charge);

        var context = resolver.resolve(event("charge.dispute.created", "\"charge\":\"ch_expected\""));

        assertThat(context).isEqualTo(
            new StripeWebhookPaymentContextResolver.PaymentContext("ch_expected", "cus_expected")
        );
    }

    @Test
    void preservesExistingPayloadAssociationsWithoutAProviderCall() {
        assertThat(resolver.resolve(event("charge.refunded", "\"customer\":\"cus_existing\""))).isNull();
        assertThat(resolver.resolve(event("invoice.paid", "\"subscription\":\"sub_existing\""))).isNull();
        verifyNoInteractions(gateway);
    }

    @Test
    void rejectsProviderModeAndReferenceMismatches() throws Exception {
        when(gateway.retrieveCharge("ch_expected")).thenReturn(charge("ch_other", false));
        assertThatThrownBy(() -> resolver.resolve(event("refund.updated", "\"charge\":\"ch_expected\"")))
            .isInstanceOf(StripeEventProcessingException.class)
            .extracting("code").isEqualTo("PAYMENT_REFERENCE_MISMATCH");

        when(gateway.retrieveCharge("ch_expected")).thenReturn(charge("ch_expected", true));
        assertThatThrownBy(() -> resolver.resolve(event("refund.updated", "\"charge\":\"ch_expected\"")))
            .isInstanceOf(StripeEventProcessingException.class)
            .extracting("code").isEqualTo("PAYMENT_REFERENCE_MISMATCH");
    }

    @Test
    void providerFailureAndMissingChargeRemainRetryable() throws Exception {
        when(gateway.retrieveCharge("ch_expected")).thenThrow(mock(StripeException.class));
        assertThatThrownBy(() -> resolver.resolve(event("refund.updated", "\"charge\":\"ch_expected\"")))
            .isInstanceOf(StripeEventProcessingException.class)
            .extracting("code").isEqualTo("PAYMENT_REFERENCE_UNAVAILABLE");
        assertThatThrownBy(() -> resolver.resolve(event("refund.updated", "\"payment_intent\":\"pi_pending\"")))
            .isInstanceOf(StripeEventProcessingException.class)
            .extracting("code").isEqualTo("WAITING_PAYMENT_ASSOCIATION");
    }

    private Charge charge(String id, boolean live) {
        var charge = new Charge();
        charge.setId(id);
        charge.setLivemode(live);
        return charge;
    }

    private StripeWebhookEventRepository.ClaimedEvent event(String type, String fields) {
        return new StripeWebhookEventRepository.ClaimedEvent(
            1L, "evt_payment", type,
            "{\"data\":{\"object\":{\"id\":\"re_payment\"," + fields + "}}}",
            1, Instant.now()
        );
    }
}
