package com.indice.erp.finance.expenses.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import com.indice.erp.finance.expenses.dto.ExpenseBulkActionRequest.Selection;

public record ExpenseBulkStatusRequest(
    @NotNull Target target,
    @NotEmpty @Size(max = 200) List<@NotNull @Valid Selection> rows,
    @Positive Long paymentAccountId,
    @NotNull LocalDate effectiveDate,
    @NotBlank @Size(max = 80) String requestKey
) {
    public enum Target { PAID, PENDING, OVERDUE }
}
