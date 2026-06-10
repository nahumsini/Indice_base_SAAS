package com.indice.erp.finance.accountingaccounts.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.accountingaccounts.AccountingAccountGroup;
import com.indice.erp.finance.accountingaccounts.AccountingAccountStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateAccountingAccountRequest(
    Long unitId,
    Long businessId,
    @NotBlank @Size(max = 80) String code,
    @NotBlank @Size(max = 180) String name,
    @NotNull AccountingAccountGroup groupKey,
    @Size(max = 4000) String description,
    AccountingAccountStatus status,
    JsonNode customFields,
    JsonNode metadata
) {
}
