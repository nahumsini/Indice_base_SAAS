package com.indice.erp.finance.expenses;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.expenses.dto.*;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

class ExpenseOperationsControllerTest {
    @Test
    void allNewMutationsFailClosedWhenWriteGuardRejectsSessionOrCsrf() {
        var guard = mock(FinanceRequestGuard.class);
        var imports = mock(ExpenseImportService.class);
        var classification = mock(ExpenseAccountingClassificationService.class);
        var bulk = mock(ExpenseBulkActionService.class);
        var session = mock(HttpSession.class);
        var controller = new ExpenseOperationsController(guard, imports, classification, bulk);
        var denial = ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        when(guard.requireWriteAccess(session, null)).thenReturn(new FinanceRequestGuard.Result(null, denial));
        assertThat(controller.importExpenses(session, null, new ImportExpensesRequest("test", List.of()))).isEqualTo(denial);
        assertThat(controller.updateExpenses(session, null, new UpdateExpensesBatchRequest(List.of()))).isEqualTo(denial);
        assertThat(controller.updateAccountingAccount(session, null, 1, new UpdateExpenseAccountingAccountRequest(2L, 0L))).isEqualTo(denial);
        assertThat(controller.bulkAction(session, null, new ExpenseBulkActionRequest(ExpenseBulkActionRequest.Action.DELETE, List.of(), null, "test"))).isEqualTo(denial);
        verifyNoInteractions(imports, classification, bulk);
    }

    @Test
    void mutationsUseOnlyAuthenticatedContextAndForwardCsrfToGuard() {
        var guard = mock(FinanceRequestGuard.class);
        var imports = mock(ExpenseImportService.class);
        var classification = mock(ExpenseAccountingClassificationService.class);
        var bulk = mock(ExpenseBulkActionService.class);
        var session = mock(HttpSession.class);
        var context = new FinanceContext(1L, 2L, "Test", "admin", true, FinanceScope.corporateOffice());
        when(guard.requireWriteAccess(session, "test-csrf")).thenReturn(new FinanceRequestGuard.Result(context, null));
        var controller = new ExpenseOperationsController(guard, imports, classification, bulk);
        var batch = new ImportExpensesRequest("key", List.of());
        var updates = new UpdateExpensesBatchRequest(List.of());
        var account = new UpdateExpenseAccountingAccountRequest(2L, 0L);
        controller.importExpenses(session, "test-csrf", batch);
        controller.updateExpenses(session, "test-csrf", updates);
        controller.updateAccountingAccount(session, "test-csrf", 1, account);
        verify(imports).importExpenses(context, batch);
        verify(imports).updateExpenses(context, updates);
        verify(classification).update(context, 1, account);
        verify(guard, times(3)).requireWriteAccess(session, "test-csrf");
    }
}
