package com.indice.erp.finance.accountingaccounts;

record AccountingAccountCommand(
    Long unitId,
    Long businessId,
    String code,
    String name,
    AccountingAccountGroup groupKey,
    String description,
    AccountingAccountStatus status,
    Long createdByUserId,
    Long updatedByUserId,
    String customFieldsJson,
    String metadataJson
) {
}
