package com.indice.erp.finance.budgets.dto;

import java.util.List;

public record BudgetListResponse(List<BudgetResponse> budgets, int count) {
}
