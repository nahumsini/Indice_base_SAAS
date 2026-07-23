package com.indice.erp.billing.audit;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import com.indice.erp.auth.SignupPlanSelection;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;

@ExtendWith(MockitoExtension.class)
class BillingPaymentAuditServiceTest {

    @Mock
    private BillingPaymentAuditRepository repository;

    @Test
    void recordsCheckoutCreation() {
        var plan = plan();

        new BillingPaymentAuditService(repository).checkoutCreated(42L, "cus_test", "cs_test", plan);

        verify(repository).insert(org.mockito.ArgumentMatchers.argThat(event ->
            event.signupIntentId() == 42L
                && "signup.checkout.created".equals(event.eventType())
                && "succeeded".equals(event.status())
                && "cus_test".equals(event.stripeCustomerId())
                && "cs_test".equals(event.stripeCheckoutSessionId())
                && event.amountCents() == 19_900
        ));
    }

    @Test
    void auditInsertFailureDoesNotEscape() {
        doThrow(new DataAccessResourceFailureException("down"))
            .when(repository).insert(org.mockito.ArgumentMatchers.any());

        new BillingPaymentAuditService(repository).checkoutFailed(42L, "Stripe unavailable");
    }

    private SignupPlanSelection plan() {
        return new SignupPlanSelection("all-modules", 7, 5, 0, 19_900, "usd", List.of("crm"));
    }
}
