package com.indice.erp.finance.providers;

record ProviderCommand(
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
    String customFieldsJson,
    String metadataJson
) {
}
