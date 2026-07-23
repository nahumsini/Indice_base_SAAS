package com.indice.erp.billing.subscription;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.indice.erp.billing.stripe.StripeBillingGateway;
import com.indice.erp.billing.stripe.StripeSignupProperties;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BillingSubscriptionManagementServiceTest {

    @Mock private BillingSubscriptionRepository repository;
    @Mock private CompanySubscriptionStatusProvider statusProvider;
    @Mock private SubscriptionSeatLimitService seatLimitService;
    @Mock private StripeBillingGateway stripeGateway;
    @Mock private CompanySeatAllowanceService seatAllowanceService;
    @Mock private BillingPaymentAuditService auditService;
    private BillingSubscriptionManagementService service;

    @BeforeEach
    void setUp() {
        var properties = new StripeSignupProperties();
        properties.setSecretKey("sk_test_key");
        service = new BillingSubscriptionManagementService(repository, statusProvider, seatLimitService, properties,
            stripeGateway, seatAllowanceService, auditService);
        when(seatAllowanceService.currentUsage(7L)).thenReturn(new CompanySeatAllowance(5, 1, 4, 5, 0));
        when(seatLimitService.usage(7L)).thenReturn(new SubscriptionSeatUsage(5, 1, 0, 1, 4, true));
    }

    @Test
    void cancelUsesSubscriptionIdempotencyKeyBeforeLocalUpdate() throws Exception {
        var record = record(false);
        when(repository.find(7L)).thenReturn(Optional.of(record), Optional.of(record));
        when(repository.selectedModules(7L)).thenReturn(List.of("crm"));
        when(statusProvider.currentStatus(7L)).thenReturn(new CompanySubscriptionStatus("trialing", "all-modules", null, true, ""));

        service.cancel(7L);

        verify(stripeGateway).updateSubscription("sub_test", Map.of("cancel_at_period_end", true),
            "indice.company.7.subscription.sub_test.cancel.1783512000000");
        verify(repository).scheduleCancellation(7L);
        verify(auditService).subscriptionAction(7L, "sub_test", "cancel", "succeeded", null);
    }

    @Test
    void cancelSkipsStripeWhenAlreadyScheduled() {
        var record = record(true);
        when(repository.find(7L)).thenReturn(Optional.of(record), Optional.of(record));
        when(repository.selectedModules(7L)).thenReturn(List.of());
        when(statusProvider.currentStatus(7L)).thenReturn(new CompanySubscriptionStatus("trialing", "all-modules", null, true, ""));

        service.cancel(7L);

        verifyNoInteractions(stripeGateway);
        verify(repository, never()).scheduleCancellation(7L);
    }

    @Test
    void resumeUsesSubscriptionIdempotencyKeyBeforeLocalUpdate() throws Exception {
        var record = record(true);
        when(repository.find(7L)).thenReturn(Optional.of(record), Optional.of(record));
        when(repository.selectedModules(7L)).thenReturn(List.of("crm"));
        when(statusProvider.currentStatus(7L)).thenReturn(new CompanySubscriptionStatus("trialing", "all-modules", null, true, ""));

        service.resume(7L);

        verify(stripeGateway).updateSubscription("sub_test", Map.of("cancel_at_period_end", false),
            "indice.company.7.subscription.sub_test.resume.1783512000000");
        verify(repository).resume(7L);
        verify(auditService).subscriptionAction(7L, "sub_test", "resume", "succeeded", null);
    }

    private BillingSubscriptionRecord record(boolean cancelAtPeriodEnd) {
        var now = Instant.parse("2026-07-08T12:00:00Z");
        return new BillingSubscriptionRecord(7L, "cus_test", "sub_test", "trialing", "all-modules", 7,
            5, 0, 19_900, "usd", now, now.plusSeconds(30 * 86_400L), now, now.plusSeconds(30 * 86_400L),
            cancelAtPeriodEnd, null, null, null, null, "", "", "stripe", null, "", true, now);
    }
}
