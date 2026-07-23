package com.indice.erp.billing.stripe;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StripeWebhookReconciliationServiceTest {

    @Mock private StripeUnmatchedWebhookEventRepository eventRepository;
    @Mock private CompanyBillingSubscriptionRepository subscriptionRepository;
    @Mock private StripeSubscriptionBillingMapper subscriptionMapper;
    @Mock private CompanyModuleEntitlementService moduleEntitlementService;
    @Mock private StripeBillingNotificationService notificationService;
    @Mock private StripeBillingGateway stripeGateway;
    @Mock private BillingPaymentAuditService auditService;

    @Test
    void reconcilePendingAppliesLatestStripeStateAndMarksEventResolved() throws Exception {
        var event = event("evt_1", "sub_test");
        var subscription = StripeWebhookTestSupport.subscription("sub_test", "active");
        when(eventRepository.pending(25)).thenReturn(List.of(event));
        when(subscriptionRepository.exists("sub_test")).thenReturn(true);
        when(stripeGateway.retrieveSubscription("sub_test")).thenReturn(subscription);
        when(subscriptionMapper.updateLocalState(subscriptionRepository, subscription)).thenReturn(1);

        assertEquals(1, service().reconcilePending());

        verify(moduleEntitlementService).activatePaidPlanBySubscription("sub_test");
        verify(eventRepository).markResolved(event);
        verify(auditService).reconciliation("evt_1", "sub_test", "resolved", null);
    }

    @Test
    void reconcilePendingKeepsEventPendingWhenLocalSubscriptionIsStillMissing() {
        var event = event("evt_1", "sub_missing");
        when(eventRepository.pending(25)).thenReturn(List.of(event));
        when(subscriptionRepository.exists("sub_missing")).thenReturn(false);

        assertEquals(0, service().reconcilePending());

        verify(eventRepository).markAttemptFailed(10L, "Local subscription row is not ready.");
        verify(auditService).reconciliation("evt_1", "sub_missing", "retrying", "Local subscription row is not ready.");
        verifyNoInteractions(stripeGateway, subscriptionMapper, moduleEntitlementService);
    }

    @Test
    void resolvePendingForSubscriptionUsesCheckoutSubscriptionAndSkipsStripeFetch() throws Exception {
        var event = event("evt_1", "sub_test");
        var subscription = StripeWebhookTestSupport.subscription("sub_test", "trialing");
        when(eventRepository.pendingForSubscription("sub_test", 25)).thenReturn(List.of(event));
        when(subscriptionMapper.updateLocalState(subscriptionRepository, subscription)).thenReturn(1);

        assertEquals(1, service().resolvePendingForSubscription(subscription));

        verify(eventRepository).markResolved(event);
        verify(stripeGateway, never()).retrieveSubscription("sub_test");
    }

    private StripeUnmatchedWebhookEvent event(String eventId, String subscriptionId) {
        return new StripeUnmatchedWebhookEvent(10L, eventId, "customer.subscription.updated", subscriptionId, "hash");
    }

    private StripeWebhookReconciliationService service() {
        return new StripeWebhookReconciliationService(eventRepository, subscriptionRepository, subscriptionMapper,
            moduleEntitlementService, notificationService, stripeGateway, auditService);
    }
}
