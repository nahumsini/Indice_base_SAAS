package com.indice.erp.finance.pettycash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.pettycash.PettyCashMovementType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record PettyCashMovementResponse(
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
    JsonNode customFields,
    JsonNode metadata
) {
}
