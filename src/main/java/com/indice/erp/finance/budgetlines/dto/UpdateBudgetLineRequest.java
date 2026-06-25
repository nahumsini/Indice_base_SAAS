package com.indice.erp.finance.budgetlines.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.status.BudgetHealthStatus;
import com.indice.erp.finance.status.BudgetStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Null;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateBudgetLineRequest(
    Long unitId,
    Long businessId,
    @NotNull Long budgetId,
    @NotBlank @Size(max = 160) String name,
    @Size(max = 80) String categoryKey,
    @NotNull @DecimalMin("0.0000") BigDecimal plannedAmount,
    @Null BigDecimal committedAmount,
    @Null BigDecimal actualExpenseAmount,
    @Null BigDecimal pettyCashIssuedAmount,
    @Null BigDecimal pettyCashSettledAmount,
    @Null BigDecimal availableAmount,
    @Null BudgetHealthStatus healthStatus,
    @NotBlank @Size(min = 3, max = 3) String currencyCode,
    BudgetStatus status,
    @Size(max = 4000) String description,
    JsonNode customFields,
    JsonNode metadata
) {
}
