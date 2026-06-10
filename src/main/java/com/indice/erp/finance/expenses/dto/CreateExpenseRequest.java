package com.indice.erp.finance.expenses.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.expenses.ExpenseType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateExpenseRequest(
    Long unitId,
    Long businessId,
    Long providerId,
    Long budgetLineId,
    Long accountingAccountId,
    Long paymentAccountId,
    @NotBlank @Size(max = 80) String folio,
    @NotBlank @Size(max = 220) String concept,
    String description,
    @NotNull ExpenseType expenseType,
    @NotNull @DecimalMin("0.0") BigDecimal subtotalAmount,
    @NotNull @DecimalMin("0.0") BigDecimal taxAmount,
    @NotNull @DecimalMin("0.0") BigDecimal totalAmount,
    @NotBlank @Size(min = 3, max = 3) String currencyCode,
    @NotNull LocalDate expenseDate,
    LocalDate dueDate,
    Long requestedByUserId,
    Long approvedByUserId,
    Long performedByUserId,
    JsonNode customFields,
    JsonNode metadata
) {
}
