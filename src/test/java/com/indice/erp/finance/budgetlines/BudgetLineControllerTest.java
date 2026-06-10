package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.budgetlines.dto.BudgetLineListResponse;
import com.indice.erp.finance.budgetlines.dto.DeleteBudgetLineResponse;
import com.indice.erp.finance.status.BudgetStatus;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
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
class BudgetLineControllerTest {

    @Mock
    private FinanceRequestGuard guard;

    @Mock
    private BudgetLineService budgetLineService;

    @Mock
    private HttpSession session;

    @Test
    void listUsesReadGuardAndReturnsBudgetLines() {
        var controller = controller();
        var context = BudgetLineTestData.context();
        var body = new BudgetLineListResponse(List.of(BudgetLineTestData.response(99L)), 1);
        when(guard.requireReadAccess(session)).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetLineService.list(context)).thenReturn(body);

        var response = controller.list(session);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireReadAccess(session);
    }

    @Test
    void getUsesReadGuardAndReturnsBudgetLine() {
        var controller = controller();
        var context = BudgetLineTestData.context();
        var body = BudgetLineTestData.response(55L);
        when(guard.requireReadAccess(session)).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetLineService.get(context, 55L)).thenReturn(body);

        var response = controller.get(session, 55L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
    }

    @Test
    void createUsesWriteGuardWithCsrfAndReturnsCreated() {
        var controller = controller();
        var context = BudgetLineTestData.context();
        var request = BudgetLineTestData.createRequest("Software", new BigDecimal("1000.00"));
        var body = BudgetLineTestData.response(88L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetLineService.create(context, request)).thenReturn(body);

        var response = controller.create(session, "csrf-token", request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void updateUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = BudgetLineTestData.context();
        var request = BudgetLineTestData.updateRequest("Software", new BigDecimal("1000.00"), BudgetStatus.ACTIVE);
        var body = BudgetLineTestData.response(89L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetLineService.update(context, 89L, request)).thenReturn(body);

        var response = controller.update(session, "csrf-token", 89L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void deleteUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = BudgetLineTestData.context();
        var body = new DeleteBudgetLineResponse(true);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(budgetLineService.delete(context, 90L)).thenReturn(body);

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

        var response = controller.create(session, null,
            BudgetLineTestData.createRequest("Software", new BigDecimal("1000.00")));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(error.getBody(), response.getBody());
        verifyNoInteractions(budgetLineService);
    }

    private FinanceBudgetLinesController controller() {
        return new FinanceBudgetLinesController(guard, budgetLineService);
    }
}
