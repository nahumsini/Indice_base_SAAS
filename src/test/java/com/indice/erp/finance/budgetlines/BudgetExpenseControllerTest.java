package com.indice.erp.finance.budgetlines;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.access.tab.TabPermissionRouteClassifier;
import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;

class BudgetExpenseControllerTest {
    @Test void synchronizationUsesGuardContextCsrfAndExpensesTab() {
        var guard = mock(FinanceRequestGuard.class);
        var service = mock(BudgetExpenseSynchronizationService.class);
        var session = new MockHttpSession();
        var context = new FinanceContext(1L, 2L, "Test", "admin", true, FinanceScope.unitHeadquarters(3L));
        var result = new BudgetExpenseSyncResult(true, 1, List.of());
        when(guard.requireWriteAccess(session, "csrf")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(service.synchronize(context)).thenReturn(result);
        assertThat(new BudgetExpenseController(guard, service).synchronize(session, "csrf").getBody()).isEqualTo(result);
        verify(service).synchronize(context);
        var route = new MockHttpServletRequest("POST", "/api/v1/finance/expenses/budget-obligations/synchronize");
        assertThat(new TabPermissionRouteClassifier().classify(route).orElseThrow().anyOf()).containsExactly("expenses.expenses");
        assertThat(BudgetExpenseController.class.getAnnotation(RequiresCapability.class).value()).isEqualTo("expenses");
    }

    @Test void deniedAuthenticationAuthorizationAndCsrfNeverGenerate() {
        for (var status : List.of(401, 403)) {
            var guard = mock(FinanceRequestGuard.class);
            var service = mock(BudgetExpenseSynchronizationService.class);
            var session = new MockHttpSession();
            when(guard.requireWriteAccess(session, null)).thenReturn(new FinanceRequestGuard.Result(null, ResponseEntity.status(status).build()));
            assertThat(new BudgetExpenseController(guard, service).synchronize(session, null).getStatusCode().value()).isEqualTo(status);
            verifyNoInteractions(service);
        }
    }
}
