package com.indice.erp.finance.providers.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.providers.ProviderStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProviderRequest(
    Long unitId,
    Long businessId,
    @NotBlank @Size(max = 180) String name,
    @Size(max = 220) String legalName,
    @Size(max = 80) String taxId,
    @Email @Size(max = 180) String email,
    @Size(max = 60) String phone,
    @Size(max = 180) String contactName,
    @Min(0) Integer paymentTermsDays,
    ProviderStatus status,
    @Size(max = 4000) String notes,
    JsonNode customFields,
    JsonNode metadata
) {
}
