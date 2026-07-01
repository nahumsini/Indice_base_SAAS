package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.RecordExpensePaymentRequest;
import com.indice.erp.finance.expenses.dto.RejectExpenseRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance/expenses")
public class FinanceExpensesController {

    private final FinanceRequestGuard guard;
    private final ExpenseService expenseService;

    public FinanceExpensesController(FinanceRequestGuard guard, ExpenseService expenseService) {
        this.guard = guard;
        this.expenseService = expenseService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.list(access.context()));
    }

    @GetMapping("/{expenseId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long expenseId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.get(access.context(), expenseId));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreateExpenseRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(expenseService.createDraft(access.context(), request));
    }

    @PutMapping("/{expenseId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long expenseId,
            @Valid @RequestBody UpdateExpenseRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.updateDraft(access.context(), expenseId, request));
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long expenseId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.deleteDraft(access.context(), expenseId));
    }

    @PostMapping("/{expenseId}/submit")
    public ResponseEntity<?> submit(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long expenseId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.submitForApproval(access.context(), expenseId));
    }

    @PostMapping("/{expenseId}/approve")
    public ResponseEntity<?> approve(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long expenseId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.approve(access.context(), expenseId));
    }

    @PostMapping("/{expenseId}/reject")
    public ResponseEntity<?> reject(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long expenseId,
            @RequestBody(required = false) RejectExpenseRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.reject(access.context(), expenseId,
            request == null ? new RejectExpenseRequest(null) : request));
    }

    @PostMapping("/{expenseId}/cancel")
    public ResponseEntity<?> cancel(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long expenseId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.cancel(access.context(), expenseId));
    }

    @PostMapping("/{expenseId}/record-payment")
    public ResponseEntity<?> recordPayment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long expenseId,
            @Valid @RequestBody RecordExpensePaymentRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.recordPayment(access.context(), expenseId, request));
    }

    @PostMapping("/{expenseId}/close")
    public ResponseEntity<?> close(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long expenseId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(expenseService.close(access.context(), expenseId));
    }
}
