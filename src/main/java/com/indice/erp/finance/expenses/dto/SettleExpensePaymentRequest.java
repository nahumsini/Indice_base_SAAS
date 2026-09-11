package com.indice.erp.finance.expenses.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** The owner calculates the remaining balance; a missing date means today's business date. */
public record SettleExpensePaymentRequest(
    @Positive Long paymentAccountId,
    LocalDate paymentDate,
    @NotBlank @Size(max = 100) String idempotencyKey
) {
}
