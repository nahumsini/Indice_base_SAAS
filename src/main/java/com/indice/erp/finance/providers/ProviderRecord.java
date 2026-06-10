package com.indice.erp.finance.providers;

import java.time.Instant;

record ProviderRecord(
    Long id,
    Long companyId,
    Long unitId,
    Long businessId,
    String name,
    String legalName,
    String taxId,
    String email,
    String phone,
    String contactName,
    Integer paymentTermsDays,
    ProviderStatus status,
    String notes,
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
