package com.indice.erp.finance.budgetlines;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.finance.FinanceRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/finance/expenses/budget-obligations")
@RequiresCapability("expenses")
public class BudgetExpenseController {
    private final FinanceRequestGuard guard;
    private final BudgetExpenseSynchronizationService synchronization;

    BudgetExpenseController(FinanceRequestGuard guard, BudgetExpenseSynchronizationService synchronization) {
        this.guard = guard; this.synchronization = synchronization;
    }

    @PostMapping("/synchronize")
    public ResponseEntity<?> synchronize(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(synchronization.synchronize(access.context()));
    }

    @GetMapping("/reviews")
    public ResponseEntity<?> reviews(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(synchronization.reviews(access.context()));
    }
}
