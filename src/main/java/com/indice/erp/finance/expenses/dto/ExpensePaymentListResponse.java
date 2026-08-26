package com.indice.erp.finance.expenses.dto;

import java.util.List;

public record ExpensePaymentListResponse(List<ExpensePaymentResponse> payments, int count) {
}
