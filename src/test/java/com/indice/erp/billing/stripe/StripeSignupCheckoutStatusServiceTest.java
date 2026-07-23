package com.indice.erp.billing.stripe;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.SignupPlanCalculator;
import com.indice.erp.auth.SignupPlanSelection;
import com.indice.erp.auth.SignupProfile;
import com.indice.erp.auth.SignupService;
import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.stripe.exception.ApiConnectionException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StripeSignupCheckoutStatusServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-08T12:00:00Z");

    @Mock private SignupService signupService;
    @Mock private SignupPlanCalculator planCalculator;
    @Mock private SignupIntentRepository intentRepository;
    @Mock private SignupIntentModuleRepository intentModuleRepository;
    @Mock private StripeCheckoutLineItemFactory lineItemFactory;
    @Mock private StripeBillingGateway stripeGateway;

    @Test
    void completedCheckoutStatusAllowsLogin() {
        when(intentRepository.findByCheckoutSessionId("cs_test"))
            .thenReturn(Optional.of(intent("completed", NOW.plusSeconds(60), 7L, null)));

        var response = service().checkoutStatus(" cs_test ");

        assertEquals("completed", response.status());
        assertEquals(7L, response.companyId());
        assertTrue(response.canLogin());
        assertFalse(response.canRestart());
        verifyNoInteractions(stripeGateway);
    }

    @Test
    void pendingCheckoutStatusDoesNotAllowRestart() {
        when(intentRepository.findByCheckoutSessionId("cs_test"))
            .thenReturn(Optional.of(intent("checkout_created", NOW.plusSeconds(60), null, null)));

        var response = service().checkoutStatus("cs_test");

        assertEquals("pending", response.status());
        assertFalse(response.canRestart());
        assertFalse(response.canLogin());
    }

    @Test
    void locallyExpiredPendingCheckoutReturnsExpired() {
        when(intentRepository.findByCheckoutSessionId("cs_test"))
            .thenReturn(Optional.of(intent("checkout_created", NOW.minusSeconds(1), null, null)));

        var response = service().checkoutStatus("cs_test");

        assertEquals("expired", response.status());
        assertTrue(response.canRestart());
    }

    @Test
    void failedCheckoutReturnsFailureMessage() {
        when(intentRepository.findByCheckoutSessionId("cs_test"))
            .thenReturn(Optional.of(intent("failed", NOW.plusSeconds(60), null, "Stripe refused setup.")));

        var response = service().checkoutStatus("cs_test");

        assertEquals("failed", response.status());
        assertEquals("Stripe refused setup.", response.message());
        assertTrue(response.canRestart());
    }

    @Test
    void supersededCheckoutReturnsRestartableState() {
        when(intentRepository.findByCheckoutSessionId("cs_test"))
            .thenReturn(Optional.of(intent("superseded", NOW.plusSeconds(60), null, null)));

        var response = service().checkoutStatus("cs_test");

        assertEquals("superseded", response.status());
        assertTrue(response.canRestart());
    }

    @Test
    void unknownCheckoutSessionReturnsNotFound() {
        when(intentRepository.findByCheckoutSessionId("missing")).thenReturn(Optional.empty());

        var response = service().checkoutStatus("missing");

        assertEquals("not_found", response.status());
        assertNull(response.companyId());
        assertTrue(response.canRestart());
    }

    @Test
    void blankCheckoutSessionIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service().checkoutStatus(" "));
    }

    @Test
    void cleanupSkipsCompletedIntentDefensively() {
        when(intentRepository.findExpiredCheckoutAttempts())
            .thenReturn(List.of(intent("completed", NOW.minusSeconds(60), 7L, null)));

        assertEquals(0, service().cleanupExpiredCheckoutAttempts());
        verify(intentRepository, never()).markExpired(99L);
        verify(intentRepository, never()).deleteInactive(99L);
        verifyNoInteractions(stripeGateway);
    }

    @Test
    void cleanupKeepsIntentWhenStripeCheckoutCannotBeExpired() throws Exception {
        when(intentRepository.findExpiredCheckoutAttempts())
            .thenReturn(List.of(intent("checkout_created", NOW.minusSeconds(60), null, null)));
        doThrow(new ApiConnectionException("already complete"))
            .when(stripeGateway).expireCheckoutSession("cs_test");

        assertEquals(0, service().cleanupExpiredCheckoutAttempts());

        verify(intentRepository, never()).markExpired(99L);
        verify(intentRepository, never()).deleteInactive(99L);
    }

    private StripeSignupCheckoutService service() {
        return new StripeSignupCheckoutService(new StripeSignupProperties(), signupService, planCalculator,
            intentRepository, intentModuleRepository, lineItemFactory, stripeGateway, BillingPaymentAuditService.noop(),
            Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private SignupIntentRecord intent(String status, Instant expiresAt, Long companyId, String failureMessage) {
        return new SignupIntentRecord(99L, "token", status,
            new SignupProfile("Ada Owner", "ada@example.com", "hash", "Ada Studio", "retail", "1-5", "US", "+1555"),
            new SignupPlanSelection("all-modules", 7, 5, 0, 19_900, "usd", List.of("crm")),
            "cs_test", "cus_test", "sub_test", companyId, failureMessage, expiresAt);
    }
}
