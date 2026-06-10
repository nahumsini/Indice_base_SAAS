package com.indice.erp.finance.budgetlines.dto;

import java.util.List;

public record BudgetLineListResponse(List<BudgetLineResponse> budgetLines, int count) {
}
