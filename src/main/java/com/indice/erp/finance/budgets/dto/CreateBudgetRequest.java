package com.indice.erp.finance.budgets.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.status.BudgetStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateBudgetRequest(
    Long unitId,
    Long businessId,
    @NotBlank @Size(max = 160) String name,
    @Size(max = 4000) String description,
    @NotNull LocalDate periodStart,
    @NotNull LocalDate periodEnd,
    @NotBlank @Size(min = 3, max = 3) String currencyCode,
    BudgetStatus status,
    JsonNode customFields,
    JsonNode metadata
) {
}
