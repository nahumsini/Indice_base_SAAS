package com.indice.erp.finance.expenses.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateExpensesBatchRequest(
    @NotNull @Size(min = 1, max = 200) List<@NotNull @Valid Row> expenses
) {
    public record Row(@Positive long id, @NotNull Long expectedVersion, @NotNull @Valid UpdateExpenseRequest expense) {}
}
