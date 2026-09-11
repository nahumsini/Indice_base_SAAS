package com.indice.erp.finance.expenses.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ExpensePaymentResponse(
    Long id,
    Long expenseId,
    Long paymentAccountId,
    String paymentAccountName,
    String paymentAccountType,
    BigDecimal amount,
    String currencyCode,
    LocalDate paymentDate,
    String source,
    Long registeredByUserId,
    String registeredByName,
    Instant createdAt,
    Instant reversedAt,
    Long reversedByUserId,
    String reversalReason
) {
}
