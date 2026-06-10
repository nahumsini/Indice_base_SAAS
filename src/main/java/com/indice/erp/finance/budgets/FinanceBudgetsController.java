package com.indice.erp.finance.budgets;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.budgets.dto.CreateBudgetRequest;
import com.indice.erp.finance.budgets.dto.UpdateBudgetRequest;
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
@RequestMapping("/api/v1/finance/budgets")
public class FinanceBudgetsController {

    private final FinanceRequestGuard guard;
    private final BudgetService budgetService;

    public FinanceBudgetsController(FinanceRequestGuard guard, BudgetService budgetService) {
        this.guard = guard;
        this.budgetService = budgetService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(budgetService.list(access.context()));
    }

    @GetMapping("/{budgetId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long budgetId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(budgetService.get(access.context(), budgetId));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreateBudgetRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.create(access.context(), request));
    }

    @PutMapping("/{budgetId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long budgetId,
            @Valid @RequestBody UpdateBudgetRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(budgetService.update(access.context(), budgetId, request));
    }

    @DeleteMapping("/{budgetId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long budgetId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(budgetService.delete(access.context(), budgetId));
    }
}
