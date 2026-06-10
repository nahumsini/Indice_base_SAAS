package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.budgetlines.dto.CreateBudgetLineRequest;
import com.indice.erp.finance.budgetlines.dto.UpdateBudgetLineRequest;
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
@RequestMapping("/api/v1/finance/budget-lines")
public class FinanceBudgetLinesController {

    private final FinanceRequestGuard guard;
    private final BudgetLineService budgetLineService;

    public FinanceBudgetLinesController(FinanceRequestGuard guard, BudgetLineService budgetLineService) {
        this.guard = guard;
        this.budgetLineService = budgetLineService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(budgetLineService.list(access.context()));
    }

    @GetMapping("/{budgetLineId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long budgetLineId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(budgetLineService.get(access.context(), budgetLineId));
    }

    @PostMapping
    public ResponseEntity<?> create(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreateBudgetLineRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetLineService.create(access.context(), request));
    }

    @PutMapping("/{budgetLineId}")
    public ResponseEntity<?> update(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long budgetLineId,
            @Valid @RequestBody UpdateBudgetLineRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(budgetLineService.update(access.context(), budgetLineId, request));
    }

    @DeleteMapping("/{budgetLineId}")
    public ResponseEntity<?> delete(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long budgetLineId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(budgetLineService.delete(access.context(), budgetLineId));
    }
}
