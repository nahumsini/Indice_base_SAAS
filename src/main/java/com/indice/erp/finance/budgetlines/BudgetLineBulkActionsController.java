package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.budgetlines.dto.BudgetLineBulkActionRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/finance/budget-lines/bulk-actions")
public class BudgetLineBulkActionsController {
    private final FinanceRequestGuard guard;
    private final BudgetLineBulkActionService service;

    public BudgetLineBulkActionsController(FinanceRequestGuard guard, BudgetLineBulkActionService service) {
        this.guard = guard;
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<?> apply(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody BudgetLineBulkActionRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.apply(access.context(), request));
    }
}
