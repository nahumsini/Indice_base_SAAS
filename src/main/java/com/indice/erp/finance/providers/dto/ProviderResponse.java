package com.indice.erp.finance.providers.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.providers.ProviderStatus;
import java.time.Instant;

public record ProviderResponse(
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
    JsonNode customFields,
    JsonNode metadata
) {
}
