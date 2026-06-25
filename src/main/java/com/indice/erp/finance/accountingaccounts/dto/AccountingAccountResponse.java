package com.indice.erp.finance.accountingaccounts.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.accountingaccounts.AccountingAccountGroup;
import com.indice.erp.finance.accountingaccounts.AccountingAccountStatus;
import java.time.Instant;

public record AccountingAccountResponse(
    Long id,
    Long companyId,
    Long unitId,
    Long businessId,
    String code,
    String name,
    AccountingAccountGroup groupKey,
    String description,
    AccountingAccountStatus status,
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
