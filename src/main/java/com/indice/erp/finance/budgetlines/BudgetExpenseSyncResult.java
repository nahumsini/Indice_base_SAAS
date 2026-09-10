package com.indice.erp.finance.budgetlines;

import java.util.List;

public record BudgetExpenseSyncResult(boolean enabled, int generated, List<Review> reviews) {
    public record Review(long budgetLineId, String name, String reason) { }
}
