package com.indice.erp.billing.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.indice.erp.billing.portal.StripeCustomerPortalGateway;
import com.indice.erp.billing.stripe.StripeBillingGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class BillingPortalServiceTest {
    private final BillingSubscriptionRepository repository = mock(BillingSubscriptionRepository.class);
    private final StripeCustomerPortalGateway portal = mock(StripeCustomerPortalGateway.class);
    private final BillingPaymentAuditService audit = mock(BillingPaymentAuditService.class);
    private final StripeBillingGateway stripe = mock(StripeBillingGateway.class);

    @Test
    void portalUsesTheCurrentCompanysStoredCustomerAndConfiguredReturnUrl() {
        when(repository.find(41)).thenReturn(Optional.of(record("cus_bound_owner", "sub_bound_owner")));
        when(portal.create(eq("cus_bound_owner"), eq("https://example.test/billing"), startsWith("indice.company.41.portal.")))
            .thenReturn(new StripeCustomerPortalGateway.PortalResult("https://billing.stripe.com/p/session/fixture"));

        var result = service().portal(41);

        assertThat(result.url()).isEqualTo("https://billing.stripe.com/p/session/fixture");
        verify(portal).create(eq("cus_bound_owner"), eq("https://example.test/billing"), startsWith("indice.company.41.portal."));
        verify(audit).subscriptionAction(41, "sub_bound_owner", "portal.opened", "succeeded", null);
        verifyNoInteractions(stripe);
    }

    @Test
    void anotherCompanyCannotReuseTheStoredCustomerWhenItHasNoSubscription() {
        when(repository.find(42)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service().portal(42)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(portal, stripe);
    }

    @Test
    void internalSubscriptionCannotOpenAStripePortal() {
        when(repository.find(41)).thenReturn(Optional.of(record("cus_bound_owner", "internal_fixture")));
        assertThatThrownBy(() -> service().portal(41)).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("not available");
        verifyNoInteractions(portal, stripe);
    }

    private BillingSubscriptionManagementService service() {
        var properties = new StripePhaseTwoProperties();
        properties.setEnabled(true);
        properties.setMode("test");
        properties.setSecretKey("sk_test_portal_fixture");
        properties.setPortalReturnUrl("https://example.test/billing");
        return new BillingSubscriptionManagementService(repository, mock(CompanySubscriptionStatusProvider.class),
            mock(SubscriptionSeatLimitService.class), properties, new StripeSecretProvider(properties), stripe,
            portal, mock(CompanySeatAllowanceService.class), audit);
    }

    private BillingSubscriptionRecord record(String customer, String subscription) {
        var now = Instant.parse("2026-09-08T12:00:00Z");
        return new BillingSubscriptionRecord(41L, customer, subscription, "active", "basic_1", 5,
            5, 0, 7_900, 1_200, "MONTH", "usd", null, null, now, now.plusSeconds(30 * 86_400L),
            false, null, null, null, null, "", "", "stripe", null, "", true, now);
    }
}
