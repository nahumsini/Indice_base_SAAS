package com.indice.erp.finance.pettycash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.pettycash.PettyCashMovementType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePettyCashMovementRequest(
    Long pettyCashStatementId,
    Long fromPaymentAccountId,
    Long toPaymentAccountId,
    @NotNull PettyCashMovementType type,
    @NotNull @DecimalMin("0.01") BigDecimal amount,
    @NotBlank @Size(min = 3, max = 3) String currencyCode,
    @NotNull LocalDate movementDate,
    @Size(max = 180) String externalSourceName,
    @Size(max = 48) String entryCategory,
    @Size(max = 180) String counterpartyName,
    @Size(max = 240) String statementDescription,
    @Size(max = 80) String fundingMethod,
    @Size(max = 500) String internalNote,
    @Size(max = 220) String reference,
    JsonNode customFields,
    JsonNode metadata
) {
}
