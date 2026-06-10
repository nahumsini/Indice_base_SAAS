package com.indice.erp.finance.expenses;

import java.math.BigDecimal;
import java.time.LocalDate;

record ExpenseDraftCommand(
    Long unitId,
    Long businessId,
    Long providerId,
    Long budgetLineId,
    Long accountingAccountId,
    Long paymentAccountId,
    String folio,
    String concept,
    String description,
    ExpenseType expenseType,
    BigDecimal subtotalAmount,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    BigDecimal balanceAmount,
    String currencyCode,
    LocalDate expenseDate,
    LocalDate dueDate,
    Long requestedByUserId,
    Long approvedByUserId,
    Long performedByUserId,
    Long createdByUserId,
    Long updatedByUserId,
    String customFieldsJson,
    String metadataJson
) {
}
