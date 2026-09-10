package com.indice.erp.finance.expenses;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.expenses.dto.CorrectExpenseRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/finance/expenses")
@RequiresCapability("expenses")
public class ExpenseCorrectionsController {
    private final FinanceRequestGuard guard;
    private final ExpenseCorrectionService corrections;

    public ExpenseCorrectionsController(FinanceRequestGuard guard, ExpenseCorrectionService corrections) {
        this.guard = guard;
        this.corrections = corrections;
    }

    @PostMapping("/{expenseId}/corrections")
    public ResponseEntity<?> correct(HttpSession session, @PathVariable long expenseId,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody CorrectExpenseRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(corrections.correct(access.context(), expenseId, request));
    }
}
