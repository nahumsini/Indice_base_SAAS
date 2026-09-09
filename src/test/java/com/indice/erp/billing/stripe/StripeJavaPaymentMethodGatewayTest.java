package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.stripe.exception.ApiConnectionException;
import com.stripe.model.Customer;
import com.stripe.model.PaymentMethod;
import com.stripe.model.Subscription;
import com.stripe.net.ApiRequest;
import com.stripe.net.ApiResource;
import com.stripe.net.StripeResponseGetter;
import java.lang.reflect.Type;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class StripeJavaPaymentMethodGatewayTest {
    private final StripeSecretProvider secrets = mock(StripeSecretProvider.class);
    private final StripeResponseGetter transport = mock(StripeResponseGetter.class);
    private final List<ApiRequest> requests = new ArrayList<>();
    private final Clock clock = Clock.fixed(Instant.parse("2026-09-30T23:59:59Z"), ZoneOffset.UTC);
    private final StripeJavaPaymentMethodGateway gateway = new StripeJavaPaymentMethodGateway(secrets, clock, transport);
    private Subscription subscription;
    private Customer customer;
    private PaymentMethod method;

    @BeforeEach
    void fixtures() throws Exception {
        when(secrets.secretKey()).thenReturn("rk_test_payment_method_fixture");
        subscription = json("""
            {"id":"sub_fixture","customer":"cus_fixture","livemode":false,
             "default_payment_method":"pm_fixture"}
            """, Subscription.class);
        customer = json("""
            {"id":"cus_fixture","livemode":false,"invoice_settings":{"default_payment_method":"pm_customer"}}
            """, Customer.class);
        method = card("pm_fixture", 2026, 9);
        when(transport.request(any(ApiRequest.class), any(Type.class))).thenAnswer(invocation -> {
            var request = invocation.getArgument(0, ApiRequest.class);
            requests.add(request);
            if (request.getPath().startsWith("/v1/subscriptions/")) return subscription;
            if (request.getPath().startsWith("/v1/customers/")) return customer;
            if (request.getPath().startsWith("/v1/payment_methods/")) return method;
            throw new AssertionError("Unexpected provider operation");
        });
    }

    @Test
    void subscriptionDefaultTakesPrecedenceAndOnlyBoundedGetRequestsAreSent() {
        var result = gateway.inspect("cus_fixture", "sub_fixture");

        assertThat(result).isEqualTo(new StripePaymentMethodGateway.CardStatus(
            StripePaymentMethodGateway.Status.SAVED, "visa", "4242"));
        assertThat(requests).extracting(ApiRequest::getPath)
            .containsExactly("/v1/subscriptions/sub_fixture", "/v1/payment_methods/pm_fixture");
        assertThat(requests).allSatisfy(request -> {
            assertThat(request.getMethod()).isEqualTo(ApiResource.RequestMethod.GET);
            assertThat(request.getOptions().getConnectTimeout()).isEqualTo(3000);
            assertThat(request.getOptions().getReadTimeout()).isEqualTo(5000);
            assertThat(request.getOptions().getMaxNetworkRetries()).isZero();
        });
    }

    @Test
    void missingSubscriptionDefaultUsesCustomerInvoiceDefault() {
        subscription.setDefaultPaymentMethod(null);
        method = card("pm_customer", 2027, 1);

        assertThat(gateway.inspect("cus_fixture", "sub_fixture").status()).isEqualTo(StripePaymentMethodGateway.Status.SAVED);
        assertThat(requests).extracting(ApiRequest::getPath).containsExactly(
            "/v1/subscriptions/sub_fixture", "/v1/customers/cus_fixture", "/v1/payment_methods/pm_customer");
    }

    @Test
    void existingCustomerWithoutSubscriptionCanHaveASavedDefault() {
        method = card("pm_customer", 2027, 1);
        assertThat(gateway.inspect("cus_fixture", null).status()).isEqualTo(StripePaymentMethodGateway.Status.SAVED);
        assertThat(requests).extracting(ApiRequest::getPath)
            .containsExactly("/v1/customers/cus_fixture", "/v1/payment_methods/pm_customer");
    }

    @Test
    void absenceIsReportedOnlyAfterInspectingBothDefaults() {
        subscription.setDefaultPaymentMethod(null);
        customer.getInvoiceSettings().setDefaultPaymentMethod(null);
        assertThat(gateway.inspect("cus_fixture", "sub_fixture")).isEqualTo(StripePaymentMethodGateway.CardStatus.noCard());
        assertThat(requests).hasSize(2);
    }

    @ParameterizedTest
    @CsvSource({"2026,8,EXPIRED", "2026,9,SAVED", "2026,10,SAVED", "2027,1,SAVED"})
    void expiryRemainsValidThroughTheLastDayOfItsMonth(long year, long month, String expected) {
        method = card("pm_fixture", year, month);
        assertThat(gateway.inspect("cus_fixture", "sub_fixture").status().name()).isEqualTo(expected);
    }

    @Test
    void expiryChangesAtTheStartOfTheNextMonth() {
        var nextMonth = new StripeJavaPaymentMethodGateway(secrets,
            Clock.fixed(Instant.parse("2026-10-01T00:00:00Z"), ZoneOffset.UTC), transport);
        assertThat(nextMonth.inspect("cus_fixture", "sub_fixture").status()).isEqualTo(StripePaymentMethodGateway.Status.EXPIRED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"subscription-customer", "subscription-id", "subscription-mode", "subscription-missing-mode",
        "method-customer", "method-detached", "method-id", "method-mode", "method-type", "invalid-month",
        "invalid-last4", "invalid-brand"})
    void unverifiableExplicitDefaultsDoNotLeakMetadataOrFallBack(String invalid) {
        switch (invalid) {
            case "subscription-customer" -> subscription.setCustomer("cus_another_company");
            case "subscription-id" -> subscription.setId("sub_wrong");
            case "subscription-mode" -> subscription.setLivemode(true);
            case "subscription-missing-mode" -> subscription.setLivemode(null);
            case "method-customer" -> method.setCustomer("cus_another_company");
            case "method-detached" -> method.setCustomer(null);
            case "method-id" -> method.setId("pm_wrong");
            case "method-mode" -> method.setLivemode(true);
            case "method-type" -> method.setType("us_bank_account");
            case "invalid-month" -> method.getCard().setExpMonth(13L);
            case "invalid-last4" -> method.getCard().setLast4("4242424242424242");
            case "invalid-brand" -> method.getCard().setBrand("unexpected provider detail");
            default -> throw new AssertionError(invalid);
        }
        assertThat(gateway.inspect("cus_fixture", "sub_fixture")).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
        assertThat(requests).noneMatch(request -> request.getPath().startsWith("/v1/customers/"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"customer-id", "customer-mode", "customer-deleted", "customer-missing-mode"})
    void invalidCustomerNeverRevealsItsDefault(String invalid) {
        switch (invalid) {
            case "customer-id" -> customer.setId("cus_wrong");
            case "customer-mode" -> customer.setLivemode(true);
            case "customer-deleted" -> customer.setDeleted(true);
            case "customer-missing-mode" -> customer.setLivemode(null);
            default -> throw new AssertionError(invalid);
        }
        assertThat(gateway.inspect("cus_fixture", null)).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
        assertThat(requests).hasSize(1);
    }

    @Test
    void legacySubscriptionSourceIsUnavailableAndDoesNotUseAnotherDefault() {
        subscription.setDefaultPaymentMethod(null);
        subscription.setDefaultSource("card_legacy");
        assertThat(gateway.inspect("cus_fixture", "sub_fixture")).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
        assertThat(requests).hasSize(1);
    }

    @Test
    void legacyCustomerSourceIsUnavailableInsteadOfNoCard() {
        customer.getInvoiceSettings().setDefaultPaymentMethod(null);
        customer.setDefaultSource("card_legacy");
        assertThat(gateway.inspect("cus_fixture", null)).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
    }

    @ParameterizedTest
    @ValueSource(strings = {"../customers", "cus_fixture?expand=source", "", "cus_ fixture", "cus_fixture/other"})
    void malformedCustomerReferencesNeverReachSecretsOrProvider(String customerId) {
        assertThat(gateway.inspect(customerId, null)).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
        verifyNoInteractions(secrets, transport);
    }

    @Test
    void malformedSubscriptionAndPaymentMethodReferencesFailClosed() {
        assertThat(gateway.inspect("cus_fixture", "../subscriptions")).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
        verifyNoInteractions(secrets, transport);
        subscription.setDefaultPaymentMethod("../payment_methods");
        assertThat(gateway.inspect("cus_fixture", "sub_fixture")).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
        assertThat(requests).hasSize(1);
    }

    @Test
    void networkFailuresReturnUnavailableWithoutProviderDetails() throws Exception {
        doThrow(new ApiConnectionException("private provider payload must not leave gateway"))
            .when(transport).request(any(ApiRequest.class), any(Type.class));
        assertThat(gateway.inspect("cus_fixture", "sub_fixture")).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
    }

    @Test
    void missingServerConfigurationNeverCallsProvider() {
        when(secrets.secretKey()).thenThrow(new StripePhaseTwoUnavailableException("private configuration path"));
        assertThat(gateway.inspect("cus_fixture", "sub_fixture")).isEqualTo(StripePaymentMethodGateway.CardStatus.unavailable());
        verifyNoInteractions(transport);
    }

    private PaymentMethod card(String id, long year, long month) {
        return json("""
            {"id":"%s","customer":"cus_fixture","livemode":false,"type":"card",
             "card":{"brand":"visa","last4":"4242","exp_year":%d,"exp_month":%d}}
            """.formatted(id, year, month), PaymentMethod.class);
    }

    private <T> T json(String value, Class<T> type) { return ApiResource.GSON.fromJson(value, type); }
}
