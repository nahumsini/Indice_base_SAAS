package com.indice.erp.finance.expenses;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.expenses.dto.ReverseExpensePaymentRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/finance/expenses")
@RequiresCapability("expenses")
public class ExpensePaymentReversalController {
    private final FinanceRequestGuard guard;
    private final ExpensePaymentReversalService reversals;

    public ExpensePaymentReversalController(FinanceRequestGuard guard, ExpensePaymentReversalService reversals) {
        this.guard = guard;
        this.reversals = reversals;
    }

    @PostMapping("/{expenseId}/payments/{paymentId}/reversal")
    public ResponseEntity<?> reverse(HttpSession session, @PathVariable long expenseId, @PathVariable long paymentId,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody ReverseExpensePaymentRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(reversals.reverse(access.context(), expenseId, paymentId, request));
    }
}
