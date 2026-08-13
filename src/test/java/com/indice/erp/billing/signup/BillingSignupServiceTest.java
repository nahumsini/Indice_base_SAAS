package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.catalog.BillingInterval;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.stripe.StripeCheckoutGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.indice.erp.platformadmin.CourtesyCodeService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class BillingSignupServiceTest {

    @Mock
    private CommercialOfferSelectionService offers;

    @Mock
    private BillingSignupIntentRepository repository;

    @Mock
    private StripeCheckoutGateway gateway;

    @Mock
    private BillingAuditService audit;

    @Mock
    private CourtesyCodeService courtesyCodes;

    @Mock
    private BillingTenantProvisioningService tenantProvisioning;

    private StripePhaseTwoProperties properties;
    private BillingSignupService service;

    @BeforeEach
    void setUp() {
        properties = new StripePhaseTwoProperties();
        properties.setEnabled(true);
        properties.setMode("test");
        properties.setSuccessUrl("https://apptest.indiceapp.com/signup/complete?session_id={CHECKOUT_SESSION_ID}");
        properties.setCancelUrl("https://apptest.indiceapp.com/signup");
        properties.setPriceBasic1Monthly("price_basic_1_month");
        var secrets = new StripeSecretProvider(properties);
        var provisioningProperties = new BillingProvisioningProperties();
        service = new BillingSignupService(
            offers, repository, gateway, properties, secrets, audit,
            new BCryptPasswordEncoder(4), new ObjectMapper(),
            Clock.fixed(Instant.parse("2026-07-21T12:00:00Z"), ZoneOffset.UTC),
            provisioningProperties, courtesyCodes, tenantProvisioning
        );
    }

    @Test
    void retriesTheSameBusinessRequestWithoutCreatingAnotherStripeCustomerOrCheckout() {
        var product = new CommercialOfferSelection.Product(7L, "basic_hr", "Recursos Humanos");
        var selection = new CommercialOfferSelection(
            3L, "2026.07-premium-v1", "basic_1", BillingInterval.MONTH, "USD",
            5, 0, 5_900L, 5_900L, 1_200L, List.of(product)
        );
        var request = new BillingSignupRequest(
            "Premium Owner", "owner@example.com", "very-secure-password", "Premium Company",
            "MX", null, null, null, "MONTH", 0, List.of("basic_hr"), null
        );
        var pending = new BillingSignupIntent(
            17L, "a".repeat(64), "b".repeat(64), "c".repeat(64), "PENDING",
            null, null, null, null, null
        );
        var completed = new BillingSignupIntent(
            17L, "a".repeat(64), "b".repeat(64), "c".repeat(64), "CHECKOUT_CREATED",
            "cus_test", "cs_test", null, "https://checkout.stripe.test/cs_test",
            Instant.parse("2026-07-21T12:30:00Z")
        );
        when(offers.select(any(), anyString(), anyInt())).thenReturn(selection);
        when(repository.createOrLoad(anyString(), anyString(), anyString(), any(), anyString(), anyString(), any()))
            .thenReturn(pending, completed);
        when(repository.checkoutSpec(17L)).thenReturn(new BillingSignupIntentRepository.CheckoutSpec(
            17L, "a".repeat(64), "basic_1", "MONTH", "USD", 0,
            "Premium Owner", "owner@example.com", "Premium Company", "MX", null,
            "2026.07-premium-v1", List.of("basic_hr")
        ));
        when(gateway.createCustomer(any(), anyString())).thenReturn(new StripeCheckoutGateway.CustomerResult("cus_test"));
        when(gateway.createCheckout(any(), anyString())).thenReturn(new StripeCheckoutGateway.CheckoutResult(
            "cs_test", "https://checkout.stripe.test/cs_test", Instant.parse("2026-07-21T12:30:00Z")
        ));
        when(repository.findById(17L)).thenReturn(completed);

        var first = service.createCheckout(request, "idempotency-key-17");
        var replay = service.createCheckout(request, "idempotency-key-17");

        assertThat(first.replayed()).isFalse();
        assertThat(replay.replayed()).isTrue();
        assertThat(replay.checkoutSessionId()).isEqualTo("cs_test");
        verify(gateway, times(1)).createCustomer(any(), anyString());
        verify(gateway, times(1)).createCheckout(any(), anyString());
    }

    @Test
    void rejectsPasswordsThatBcryptWouldSilentlyTruncate() {
        var request = new BillingSignupRequest(
            "Premium Owner", "owner@example.com", "🔐".repeat(20), "Premium Company",
            "MX", null, null, null, "MONTH", 0, List.of("basic_hr"), null
        );

        assertThatThrownBy(() -> service.createCheckout(request, "idempotency-key-password-limit"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no more than 72 bytes");
    }
}
