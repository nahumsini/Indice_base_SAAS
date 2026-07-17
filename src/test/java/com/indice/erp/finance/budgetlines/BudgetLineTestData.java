package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.budgetlines.dto.BudgetLineResponse;
import com.indice.erp.finance.budgetlines.dto.CreateBudgetLineRequest;
import com.indice.erp.finance.budgetlines.dto.UpdateBudgetLineRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.BudgetHealthStatus;
import com.indice.erp.finance.status.BudgetStatus;
import java.math.BigDecimal;
import java.time.Instant;

final class BudgetLineTestData {

    private BudgetLineTestData() {
    }

    static FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    static CreateBudgetLineRequest createRequest(String name, BigDecimal plannedAmount) {
        return new CreateBudgetLineRequest(
            null, null, 20L, name, "SOFTWARE", plannedAmount, null, null, null, null, null, null,
            "mxn", null, "Software budget line", null, null);
    }

    static UpdateBudgetLineRequest updateRequest(String name, BigDecimal plannedAmount, BudgetStatus status) {
        return new UpdateBudgetLineRequest(
            null, null, 20L, name, "SOFTWARE", plannedAmount, null, null, null, null, null, null,
            "usd", status, "Updated budget line", null, null);
    }

    static BudgetLineRecord record(long id, String name, BigDecimal plannedAmount) {
        return record(id, name, plannedAmount, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    static BudgetLineRecord record(long id, String name, BigDecimal plannedAmount, BigDecimal committed,
            BigDecimal actual, BigDecimal issued, BigDecimal settled) {
        var available = BudgetLineAmounts.availableAmount(plannedAmount, committed, actual, issued, settled);
        return new BudgetLineRecord(
            id, 7L, null, null, 20L, name, "SOFTWARE", plannedAmount, committed, actual, issued, settled,
            available, BudgetLineAmounts.healthStatus(plannedAmount, available), "MXN", BudgetStatus.ACTIVE,
            "Software budget line", 0, 1L, null, Instant.parse("2026-06-08T23:00:00Z"),
            null, null, 0L, null, null);
    }

    static BudgetLineResponse response(long id) {
        return new BudgetLineResponse(
            id, 7L, null, null, 20L, "Software", "SOFTWARE", new BigDecimal("1000.0000"),
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("1000.0000"),
            BudgetHealthStatus.ON_TRACK, "MXN", BudgetStatus.ACTIVE, "Software budget line", 0, 1L, null,
            Instant.parse("2026-06-08T23:00:00Z"), null, null, 0L, null, null);
    }
}
