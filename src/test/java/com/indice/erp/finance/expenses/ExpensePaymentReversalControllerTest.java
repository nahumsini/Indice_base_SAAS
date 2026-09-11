package com.indice.erp.finance.expenses;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.expenses.dto.ReverseExpensePaymentRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ExpensePaymentReversalControllerTest {
    private final FinanceRequestGuard guard = mock(FinanceRequestGuard.class);
    private final ExpensePaymentReversalService service = mock(ExpensePaymentReversalService.class);
    private final HttpSession session = mock(HttpSession.class);
    private final ExpensePaymentReversalController controller = new ExpensePaymentReversalController(guard, service);

    @Test void csrfOrAccessDenialNeverReachesTheFinancialMutation() {
        when(guard.requireWriteAccess(session, null)).thenReturn(new FinanceRequestGuard.Result(null, ResponseEntity.status(HttpStatus.FORBIDDEN).build()));
        assertThat(controller.reverse(session, 1, 2, null, new ReverseExpensePaymentRequest(3L, "Mistake")).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(service);
    }

    @Test void forwardsOnlyAuthenticatedContextAndTypedReversal() {
        var context = new FinanceContext(7L, 8L, "Test", "admin", true, FinanceScope.corporateOffice());
        var request = new ReverseExpensePaymentRequest(3L, "Mistake");
        when(guard.requireWriteAccess(session, "csrf")).thenReturn(new FinanceRequestGuard.Result(context, null));
        assertThat(controller.reverse(session, 1, 2, "csrf", request).getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(service).reverse(context, 1, 2, request);
    }
}
