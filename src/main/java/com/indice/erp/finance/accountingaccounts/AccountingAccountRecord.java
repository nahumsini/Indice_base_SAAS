package com.indice.erp.finance.accountingaccounts;

import java.time.Instant;

record AccountingAccountRecord(
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
    String customFieldsJson,
    String metadataJson
) {
}
