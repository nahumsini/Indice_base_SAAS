package com.indice.erp.finance.pettycash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.pettycash.PettyCashSettlementLineStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePettyCashSettlementLineRequest(
    Long pettyCashStatementId,
    Long expenseId,
    Long providerId,
    Long accountingAccountId,
    @NotBlank @Size(max = 220) String description,
    @Size(max = 160) String receiptReference,
    @DecimalMin("0.00") BigDecimal subtotalAmount,
    @DecimalMin("0.00") BigDecimal taxAmount,
    @NotNull @DecimalMin("0.01") BigDecimal totalAmount,
    @NotBlank @Size(min = 3, max = 3) String currencyCode,
    @NotNull LocalDate expenseDate,
    @Min(0) Integer attachmentCount,
    PettyCashSettlementLineStatus status,
    JsonNode customFields,
    JsonNode metadata
) {
}
