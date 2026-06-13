package com.indice.erp.finance.pettycash;

import java.math.BigDecimal;
import java.time.LocalDate;

record PettyCashSettlementLineCommand(
    Long pettyCashStatementId,
    Long expenseId,
    Long providerId,
    Long accountingAccountId,
    String description,
    String receiptReference,
    BigDecimal subtotalAmount,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    String currencyCode,
    LocalDate expenseDate,
    Integer attachmentCount,
    PettyCashSettlementLineStatus status,
    Long createdByUserId,
    String customFieldsJson,
    String metadataJson
) {
}
