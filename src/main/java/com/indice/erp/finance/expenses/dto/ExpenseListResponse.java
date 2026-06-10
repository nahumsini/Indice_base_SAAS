package com.indice.erp.finance.expenses.dto;

import java.util.List;

public record ExpenseListResponse(List<ExpenseResponse> expenses, int count) {
}
