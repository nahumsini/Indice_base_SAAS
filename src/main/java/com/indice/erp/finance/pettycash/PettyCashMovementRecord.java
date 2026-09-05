package com.indice.erp.finance.pettycash;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record PettyCashMovementRecord(
    Long id,
    Long companyId,
    Long pettyCashFundId,
    Long pettyCashStatementId,
    Long fromPaymentAccountId,
    Long toPaymentAccountId,
    String externalSourceName,
    PettyCashMovementType type,
    BigDecimal amount,
    String currencyCode,
    LocalDate movementDate,
    String reference,
    Long createdByUserId,
    Long updatedByUserId,
    Instant createdAt,
    Instant updatedAt,
    Instant deletedAt,
    Long version,
    String customFieldsJson,
    String metadataJson
) {
}
