package com.indice.erp.finance.budgets;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.budgets.dto.BudgetListResponse;
import com.indice.erp.finance.budgets.dto.DeleteBudgetResponse;
import com.indice.erp.finance.status.BudgetStatus;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BudgetControllerTest {

    @Mock
    private FinanceRequestGuard guard;

    @Mock
    private BudgetService budgetService;

    @Mock
    private HttpSession session;

    @Test
    void listUsesReadGuardAndReturnsBudgets() {
        var controller = controller();
        var context = BudgetTestData.context();
        var body = new BudgetListResponse(List.of(BudgetTestData.response(99L)), 1);
        when(guard.requireReadAccess(session)).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetService.list(context)).thenReturn(body);

        var response = controller.list(session);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireReadAccess(session);
    }

    @Test
    void getUsesReadGuardAndReturnsBudget() {
        var controller = controller();
        var context = BudgetTestData.context();
        var body = BudgetTestData.response(55L);
        when(guard.requireReadAccess(session)).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetService.get(context, 55L)).thenReturn(body);

        var response = controller.get(session, 55L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
    }

    @Test
    void createUsesWriteGuardWithCsrfAndReturnsCreated() {
        var controller = controller();
        var context = BudgetTestData.context();
        var request = BudgetTestData.createRequest(
            "FY 2026", LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"));
        var body = BudgetTestData.response(88L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetService.create(context, request)).thenReturn(body);

        var response = controller.create(session, "csrf-token", request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void updateUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = BudgetTestData.context();
        var request = BudgetTestData.updateRequest(
            "FY 2026", LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"), BudgetStatus.ACTIVE);
        var body = BudgetTestData.response(89L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetService.update(context, 89L, request)).thenReturn(body);

        var response = controller.update(session, "csrf-token", 89L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void deleteUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = BudgetTestData.context();
        var body = new DeleteBudgetResponse(true);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetService.delete(context, 90L)).thenReturn(body);

        var response = controller.delete(session, "csrf-token", 90L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void createReturnsGuardErrorWithoutCallingService() {
        var controller = controller();
        var error = ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Invalid CSRF token."));
        when(guard.requireWriteAccess(session, null)).thenReturn(new FinanceRequestGuard.Result(null, error));

        var response = controller.create(session, null, BudgetTestData.createRequest(
            "FY 2026", LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31")));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(error.getBody(), response.getBody());
        verifyNoInteractions(budgetService);
    }

    private FinanceBudgetsController controller() {
        return new FinanceBudgetsController(guard, budgetService);
    }
}
