package com.indice.erp.finance.expenses.dto;

import java.util.List;
import java.time.LocalDate;

public record ExpenseListResponse(List<ExpenseResponse> expenses, int count, LocalDate asOfDate, String timeZone) {
    public ExpenseListResponse(List<ExpenseResponse> expenses, int count) {
        this(expenses, count, null, null);
    }
}
