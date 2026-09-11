package com.indice.erp.finance.expenses.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReverseExpensePaymentRequest(
    @NotNull Long expectedVersion,
    @NotBlank @Size(max = 500) String reason
) {}
