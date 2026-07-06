package com.indice.erp.finance.payablekiosk.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublicProviderRegistrationRequest(
    @NotBlank @Size(max = 180) String name,
    @Size(max = 220) String legalName,
    @Size(max = 80) String taxId,
    @Email @Size(max = 180) String email,
    @Size(max = 60) String phone,
    @Size(max = 180) String contactName,
    @Size(max = 4000) String notes
) {
}
