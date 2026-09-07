package com.indice.erp.finance.pettycash;

import java.math.BigDecimal;
import java.time.LocalDate;

record PettyCashMovementCommand(
    Long pettyCashStatementId,
    Long fromPaymentAccountId,
    Long toPaymentAccountId,
    PettyCashMovementType type,
    BigDecimal amount,
    String currencyCode,
    LocalDate movementDate,
    String externalSourceName,
    String entryCategory,
    String counterpartyName,
    String statementDescription,
    String fundingMethod,
    String internalNote,
    String reference,
    Long createdByUserId,
    String customFieldsJson,
    String metadataJson
) {
}
