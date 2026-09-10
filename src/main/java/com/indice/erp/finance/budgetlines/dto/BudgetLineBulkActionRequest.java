package com.indice.erp.finance.budgetlines.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record BudgetLineBulkActionRequest(
    @NotNull Action action,
    @NotEmpty @Size(max = 200) List<@NotNull @Valid Selection> rows,
    @Positive Long targetId,
    @Size(max = 500) String reason
) {
    public enum Action { DELETE, UNIT, BUSINESS, PROVIDER, ACCOUNTING_ACCOUNT }
    public record Selection(@Positive long id, @NotNull @PositiveOrZero Long expectedVersion) {}
}
