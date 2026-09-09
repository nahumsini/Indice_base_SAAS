package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.stripe.model.checkout.Session;
import com.stripe.net.ApiRequest;
import com.stripe.net.ApiResource;
import com.stripe.net.StripeResponseGetter;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.parallel.Isolated;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;

@Isolated("Temporarily replaces and restores the Stripe SDK's global transport")
class StripeJavaCheckoutGatewayTest {
    @ParameterizedTest
    @ValueSource(ints = {15, 0})
    @SuppressWarnings("unchecked")
    void hostedSubscriptionCheckoutAlwaysCollectsACardAndKeepsTheAgreedPrices(int trialDays) throws Exception {
        var secrets = mock(StripeSecretProvider.class);
        when(secrets.secretKey()).thenReturn("sk_test_gateway_fixture");
        var gateway = new StripeJavaCheckoutGateway(secrets);
        var expires = Instant.parse("2026-09-08T12:30:00Z");
        var metadata = Map.of("indice_company_id", "41", "indice_signup_ref", "fixture-reference");
        var command = new StripeCheckoutGateway.CheckoutCommand(
            "cus_fixture", "https://example.test/billing?checkout=success", "https://example.test/billing",
            true, true, trialDays, expires,
            List.of(new StripeCheckoutGateway.LineItem("price_agreed_month", 1),
                new StripeCheckoutGateway.LineItem("price_agreed_extra_user", 2)), metadata, "promo_agreed"
        );
        var hostedSession = new Session();
        hostedSession.setId("cs_fixture");
        hostedSession.setUrl("https://checkout.stripe.com/c/fixture");
        hostedSession.setExpiresAt(expires.getEpochSecond());

        // Mock the transport below Session.create; restore it even if an assertion fails.
        var transport = mock(StripeResponseGetter.class);
        when(transport.request(any(ApiRequest.class), eq(Session.class))).thenReturn(hostedSession);
        var previousTransport = ApiResource.getGlobalResponseGetter();
        try {
            ApiResource.setGlobalResponseGetter(transport);

            var result = gateway.createCheckout(command, "fixture-checkout-idempotency");

            var captured = ArgumentCaptor.forClass(ApiRequest.class);
            verify(transport).request(captured.capture(), eq(Session.class));
            var request = captured.getValue();
            var params = request.getParams();
            assertThat(request.getMethod()).isEqualTo(ApiResource.RequestMethod.POST);
            assertThat(request.getPath()).isEqualTo("/v1/checkout/sessions");
            assertThat(result).isEqualTo(new StripeCheckoutGateway.CheckoutResult(
                "cs_fixture", "https://checkout.stripe.com/c/fixture", expires));
            assertThat(params).containsEntry("mode", "subscription")
                .containsEntry("customer", "cus_fixture")
                .containsEntry("payment_method_types", List.of("card"))
                .containsEntry("payment_method_collection", "always")
                .containsEntry("billing_address_collection", "required")
                .containsEntry("automatic_tax", Map.of("enabled", true))
                .containsEntry("tax_id_collection", Map.of("enabled", true))
                .containsEntry("success_url", command.successUrl())
                .containsEntry("cancel_url", command.cancelUrl())
                .containsEntry("line_items", List.of(Map.of("price", "price_agreed_month", "quantity", 1L),
                    Map.of("price", "price_agreed_extra_user", "quantity", 2L)))
                .containsEntry("discounts", List.of(Map.of("promotion_code", "promo_agreed")))
                .doesNotContainKeys("payment_method_data", "card", "payment_intent_data");
            var subscription = (Map<String, Object>) params.get("subscription_data");
            assertThat(subscription).containsEntry("metadata", metadata);
            if (trialDays > 0) {
                assertThat(subscription).containsEntry("trial_period_days", 15)
                    .containsEntry("trial_settings", Map.of("end_behavior", Map.of("missing_payment_method", "cancel")));
            } else {
                assertThat(subscription).doesNotContainKeys("trial_period_days", "trial_settings");
            }
            assertThat(request.getOptions().getIdempotencyKey()).isEqualTo("fixture-checkout-idempotency");
        } finally {
            ApiResource.setGlobalResponseGetter(previousTransport);
        }
    }
}
