package com.indice.erp.finance.pettycash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.pettycash.PettyCashStatementStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record PettyCashStatementResponse(
    Long id,
    Long companyId,
    Long pettyCashFundId,
    String folio,
    String periodKey,
    LocalDate periodStart,
    LocalDate periodEnd,
    LocalDate cutOffDate,
    BigDecimal openingBalanceAmount,
    BigDecimal assignedAmount,
    BigDecimal additionalDepositAmount,
    BigDecimal declaredClosingBalanceAmount,
    BigDecimal estimatedUsageAmount,
    BigDecimal verifiedExpenseAmount,
    BigDecimal returnedAmount,
    BigDecimal shortageAmount,
    BigDecimal carryForwardAmount,
    String currencyCode,
    PettyCashStatementStatus status,
    Long responsibleUserId,
    Long reviewedByUserId,
    Integer attachmentCount,
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
