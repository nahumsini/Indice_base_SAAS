package com.indice.erp.finance.budgets;

import com.indice.erp.finance.budgets.dto.BudgetResponse;
import com.indice.erp.finance.budgets.dto.CreateBudgetRequest;
import com.indice.erp.finance.budgets.dto.UpdateBudgetRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.BudgetStatus;
import java.time.Instant;
import java.time.LocalDate;

final class BudgetTestData {

    private BudgetTestData() {
    }

    static FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    static CreateBudgetRequest createRequest(String name, LocalDate start, LocalDate end) {
        return new CreateBudgetRequest(null, null, name, "Operating budget", start, end, "mxn", null, null, null);
    }

    static UpdateBudgetRequest updateRequest(String name, LocalDate start, LocalDate end, BudgetStatus status) {
        return new UpdateBudgetRequest(null, null, name, "Updated budget", start, end, "usd", status, null, null);
    }

    static BudgetRecord record(long id, String name) {
        return record(id, name, LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"), BudgetStatus.ACTIVE);
    }

    static BudgetRecord record(long id, String name, LocalDate start, LocalDate end, BudgetStatus status) {
        return new BudgetRecord(
            id, 7L, null, null, name, "Operating budget", start, end, "MXN", status, 1L, null,
            Instant.parse("2026-06-08T23:00:00Z"), null, null, 0L, null, null);
    }

    static BudgetResponse response(long id) {
        return new BudgetResponse(
            id, 7L, null, null, "FY 2026", "Operating budget", LocalDate.parse("2026-01-01"),
            LocalDate.parse("2026-12-31"), "MXN", BudgetStatus.ACTIVE, 1L, null,
            Instant.parse("2026-06-08T23:00:00Z"), null, null, 0L, null, null);
    }
}
