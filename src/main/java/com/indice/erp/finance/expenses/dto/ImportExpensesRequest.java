package com.indice.erp.finance.expenses.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ImportExpensesRequest(
    @NotBlank @Size(max = 80) String requestKey,
    @NotNull @Size(min = 1, max = 200) List<@NotNull @Valid CreateExpenseRequest> expenses
) {}
