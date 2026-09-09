package com.indice.erp.billing.subscription;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.collection.PaymentCollectionProtectionService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.seats.SeatService;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.stripe.StripeCheckoutGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.indice.erp.platformadmin.PlatformAdminService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.TransactionTemplate;

class BillingCollectionActivationTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final StripeCheckoutGateway stripe = mock(StripeCheckoutGateway.class);
    private final CommercialOfferSelectionService offers = mock(CommercialOfferSelectionService.class);
    private final PaymentCollectionProtectionService protection = mock(PaymentCollectionProtectionService.class);
    private final BillingActivationService activation = new BillingActivationService(jdbc, mock(TransactionTemplate.class),
        offers, mock(BillingSignupIntentRepository.class), stripe, new StripePhaseTwoProperties(),
        mock(StripeSecretProvider.class), mock(PlatformAdminService.class), mock(BillingAuditService.class),
        mock(BillingSelectionChangeService.class), mock(SeatService.class),
        Clock.fixed(Instant.parse("2026-09-08T12:00:00Z"), ZoneOffset.UTC), protection);

    @Test
    @SuppressWarnings("unchecked")
    void collectionCannotShortenRemainingTrialOrCreateASecondFreeTrial() {
        when(jdbc.queryForObject(contains("COUNT(*) FROM company_billing_subscriptions"), eq(Long.class), eq(9L))).thenReturn(0L);
        when(protection.protection(9)).thenReturn(new PaymentCollectionProtectionService.Protection(Instant.parse("2026-09-09T12:00:00Z"), false));
        assertThatThrownBy(() -> activation.createCollectionCheckout(9, 7, "request-19", null, 19))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("período pagado");
        verifyNoInteractions(stripe, offers);
    }

    @Test
    @SuppressWarnings("unchecked")
    void collectionCannotChargeWhileAnExistingPaidPeriodIsProtected() {
        when(jdbc.queryForObject(contains("stripe_subscription_id NOT LIKE"), eq(Long.class), eq(9L))).thenReturn(0L);
        when(jdbc.query(anyString(), any(RowMapper.class), eq(9L))).thenReturn(List.of());
        when(protection.protection(9)).thenReturn(new PaymentCollectionProtectionService.Protection(Instant.parse("2026-09-09T12:00:00Z"), false));
        assertThatThrownBy(() -> activation.createCollectionCheckout(9, 7, "request-19", null, 19))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("período pagado");
        verifyNoInteractions(stripe, offers);
    }

    @Test
    void collectionCannotCreateAnotherSubscriptionForAnAlreadySubscribedCompany() {
        when(jdbc.queryForObject(contains("stripe_subscription_id NOT LIKE"), eq(Long.class), eq(9L))).thenReturn(1L);
        assertThatThrownBy(() -> activation.createCollectionCheckout(9, 7, "request-19", null, 19))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("suscripción Stripe");
        verifyNoInteractions(stripe, offers);
    }

    @Test
    @SuppressWarnings("unchecked")
    void absentProtectionValidatesThePinnedSelectionBeforeCallingStripe() {
        when(jdbc.queryForObject(contains("stripe_subscription_id NOT LIKE"), eq(Long.class), eq(9L))).thenReturn(0L);
        when(jdbc.query(anyString(), any(RowMapper.class), eq(9L))).thenReturn(java.util.Collections.singletonList(null));
        when(protection.protection(9)).thenReturn(new PaymentCollectionProtectionService.Protection(null, false));
        assertThatThrownBy(() -> activation.createCollectionCheckout(9, 7, "request-19", null, 19))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("selección de cobro");
        verifyNoInteractions(stripe, offers);
    }
    @Test
    @SuppressWarnings("unchecked")
    void ordinaryActivationMustUseTheOpenCollectionPaymentRouteBeforeChangingAnySelection() {
        when(jdbc.query(contains("company_payment_requests"), any(RowMapper.class), eq(9L))).thenReturn(List.of(19L));
        assertThatThrownBy(() -> activation.createCheckout(9, 7, "ordinary-key", null))
            .isInstanceOf(com.indice.erp.billing.signup.BillingSignupConflictException.class)
            .hasMessageContaining("solicitud de cobro abierta");
        verifyNoInteractions(stripe, offers, protection);
    }
}
