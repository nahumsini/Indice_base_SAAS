package com.indice.erp.finance.expenses.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record RecordExpensePaymentRequest(
    @NotNull @DecimalMin("0.01") BigDecimal amount,
    @NotNull Long paymentAccountId,
    @NotNull LocalDate paymentDate,
    @Size(max = 120) String idempotencyKey
) {
}
