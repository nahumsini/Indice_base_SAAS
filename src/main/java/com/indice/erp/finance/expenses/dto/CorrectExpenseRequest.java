package com.indice.erp.finance.expenses.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CorrectExpenseRequest(
    @NotNull @Min(0) Long expectedVersion,
    @NotNull @Valid UpdateExpenseRequest expense
) {}
