package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.DeleteExpenseResponse;
import com.indice.erp.finance.expenses.dto.ExpenseListResponse;
import com.indice.erp.finance.expenses.dto.ExpensePaymentListResponse;
import com.indice.erp.finance.expenses.dto.ExpensePaymentResponse;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.time.Instant;
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
class FinanceExpensesControllerTest {

    @Mock
    private FinanceRequestGuard guard;

    @Mock
    private ExpenseService expenseService;

    @Mock
    private HttpSession session;

    @Test
    void listUsesReadGuardAndReturnsExpenses() {
        var controller = controller();
        var context = context();
        var body = new ExpenseListResponse(List.of(response(99L)), 1);
        when(guard.requireReadAccess(session)).thenReturn(allowed(context));
        when(expenseService.list(context)).thenReturn(body);

        var response = controller.list(session);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireReadAccess(session);
    }

    @Test
    void getUsesReadGuardAndReturnsExpense() {
        var controller = controller();
        var context = context();
        var body = response(55L);
        when(guard.requireReadAccess(session)).thenReturn(allowed(context));
        when(expenseService.get(context, 55L)).thenReturn(body);

        var response = controller.get(session, 55L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireReadAccess(session);
    }

    @Test
    void listPaymentsUsesReadGuardAndReturnsAuditableHistory() {
        var controller = controller();
        var context = context();
        var payment = new ExpensePaymentResponse(
            12L,
            55L,
            81L,
            "Main account",
            "BANK",
            new BigDecimal("50.00"),
            "MXN",
            LocalDate.of(2026, 6, 15),
            "RECORDED",
            1L,
            "Finance User",
            Instant.parse("2026-06-15T12:00:00Z"), null, null, null
        );
        var body = new ExpensePaymentListResponse(List.of(payment), 1);
        when(guard.requireReadAccess(session)).thenReturn(allowed(context));
        when(expenseService.listPayments(context, 55L)).thenReturn(body);

        var response = controller.listPayments(session, 55L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireReadAccess(session);
    }

    @Test
    void createUsesWriteGuardWithCsrfAndReturnsCreated() {
        var controller = controller();
        var context = context();
        var request = createRequest();
        var body = response(88L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(allowed(context));
        when(expenseService.createDraft(context, request)).thenReturn(body);

        var response = controller.create(session, "csrf-token", request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void updateUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = context();
        var request = updateRequest();
        var body = response(89L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(allowed(context));
        when(expenseService.updateDraft(context, 89L, request)).thenReturn(body);

        var response = controller.update(session, "csrf-token", 89L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void deleteUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = context();
        var body = new DeleteExpenseResponse(true);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(allowed(context));
        when(expenseService.deleteDraft(context, 90L)).thenReturn(body);

        var response = controller.delete(session, "csrf-token", 90L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void settlePaymentUsesWriteGuardAndPreservesDeniedResponse() {
        var request = new com.indice.erp.finance.expenses.dto.SettleExpensePaymentRequest(null, null, "payment-key");
        var error = ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        when(guard.requireWriteAccess(session, null)).thenReturn(new FinanceRequestGuard.Result(null, error));
        assertEquals(HttpStatus.FORBIDDEN, controller().settlePayment(session, null, 55L, request).getStatusCode());
        verifyNoInteractions(expenseService);
    }

    @Test
    void settlePaymentPassesAuthenticatedContextAndCsrfToOwner() {
        var context = context();
        var request = new com.indice.erp.finance.expenses.dto.SettleExpensePaymentRequest(81L, null, "payment-key");
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(allowed(context));
        when(expenseService.settlePayment(context, 55L, request)).thenReturn(response(55L));
        assertEquals(HttpStatus.OK, controller().settlePayment(session, "csrf-token", 55L, request).getStatusCode());
        verify(expenseService).settlePayment(context, 55L, request);
    }

    @Test
    void createReturnsGuardErrorWithoutCallingService() {
        var controller = controller();
        var error = ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Invalid CSRF token."));
        when(guard.requireWriteAccess(session, null)).thenReturn(new FinanceRequestGuard.Result(null, error));

        var response = controller.create(session, null, createRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(error.getBody(), response.getBody());
        verifyNoInteractions(expenseService);
    }

    private FinanceExpensesController controller() {
        return new FinanceExpensesController(guard, expenseService);
    }

    private FinanceRequestGuard.Result allowed(FinanceContext context) {
        return new FinanceRequestGuard.Result(context, null);
    }

    private FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    private CreateExpenseRequest createRequest() {
        return new CreateExpenseRequest(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "EXP-001",
            "Office supplies",
            "Monthly office supplies",
            ExpenseType.VARIABLE,
            new BigDecimal("100.00"),
            new BigDecimal("16.00"),
            new BigDecimal("116.00"),
            "MXN",
            LocalDate.of(2026, 6, 8),
            LocalDate.of(2026, 6, 30),
            null,
            null,
            null,
            null,
            null,
            null
        );
    }

    private UpdateExpenseRequest updateRequest() {
        return new UpdateExpenseRequest(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "EXP-001",
            "Updated supplies",
            "Updated office supplies",
            ExpenseType.VARIABLE,
            new BigDecimal("100.00"),
            new BigDecimal("16.00"),
            new BigDecimal("116.00"),
            "MXN",
            LocalDate.of(2026, 6, 9),
            LocalDate.of(2026, 6, 30),
            null,
            null,
            null,
            null,
            null
        );
    }

    private ExpenseResponse response(long id) {
        return new ExpenseResponse(
            id,
            7L,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "EXP-" + id,
            "Office supplies",
            "Description",
            ExpenseType.VARIABLE,
            new BigDecimal("100.00"),
            new BigDecimal("16.00"),
            new BigDecimal("116.00"),
            BigDecimal.ZERO,
            new BigDecimal("116.00"),
            "MXN",
            LocalDate.of(2026, 6, 8),
            LocalDate.of(2026, 6, 30),
            null,
            null,
            1L,
            null,
            null,
            ExpenseStatus.DRAFT,
            PaymentStatus.UNPAID,
            null,
            0,
            1L,
            null,
            Instant.parse("2026-06-08T23:00:00Z"),
            null,
            null,
            0L,
            null,
            null, null, false, false
        );
    }
}
