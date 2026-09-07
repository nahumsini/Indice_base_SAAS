package com.indice.erp.finance.pettycash;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record PettyCashSettlementLineRecord(
    Long id,
    Long companyId,
    Long pettyCashFundId,
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
    Long updatedByUserId,
    String cancellationReason,
    Long cancelledByUserId,
    Instant cancelledAt,
    Instant createdAt,
    Instant updatedAt,
    Instant deletedAt,
    Long version,
    String customFieldsJson,
    String metadataJson
) {
}
