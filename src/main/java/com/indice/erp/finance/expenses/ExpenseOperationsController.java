package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.expenses.dto.ImportExpensesRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpensesBatchRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseAccountingAccountRequest;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/finance/expenses")
@RequiresCapability("expenses")
public class ExpenseOperationsController {
    private final FinanceRequestGuard guard;
    private final ExpenseImportService imports;
    private final ExpenseAccountingClassificationService classification;
    private final ExpenseBulkActionService bulk;

    public ExpenseOperationsController(FinanceRequestGuard guard, ExpenseImportService imports,
            ExpenseAccountingClassificationService classification, ExpenseBulkActionService bulk) {
        this.guard = guard;
        this.imports = imports;
        this.classification = classification;
        this.bulk = bulk;
    }
    @PostMapping("/bulk-actions")
    public ResponseEntity<?> bulkAction(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody com.indice.erp.finance.expenses.dto.ExpenseBulkActionRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(bulk.apply(access.context(), request));
    }
    @PostMapping("/import")
    public ResponseEntity<?> importExpenses(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody ImportExpensesRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(imports.importExpenses(access.context(), request));
    }
    @PatchMapping("/{expenseId}/accounting-account")
    public ResponseEntity<?> updateAccountingAccount(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @PathVariable long expenseId, @Valid @RequestBody UpdateExpenseAccountingAccountRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(classification.update(access.context(), expenseId, request));
    }

    @PutMapping("/batch")
    public ResponseEntity<?> updateExpenses(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody UpdateExpensesBatchRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(imports.updateExpenses(access.context(), request));
    }
}
