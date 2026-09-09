package com.indice.erp.finance.expenses.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record UpdateExpenseAccountingAccountRequest(
    @Positive Long accountingAccountId,
    @NotNull Long expectedVersion
) {}
