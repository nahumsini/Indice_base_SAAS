package com.indice.erp.sales.kiosk;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public final class RouteSalesKioskDtos {

    private RouteSalesKioskDtos() {
    }

    public record CreateContactRequest(
            @NotBlank @Size(max = 180) String companyName,
            @Size(max = 180) String contactPerson,
            @Size(max = 40) String phone,
            @Email @Size(max = 240) String email,
            @Valid FiscalProfileRequest fiscal) {
    }

    public record FiscalProfileRequest(
            @Pattern(regexp = "(?i)^[a-z]{2}$") String country,
            @Size(max = 220) String legalName,
            @Size(max = 120) String taxId,
            @Size(max = 140) String registryId,
            @Size(max = 240) String addressLine1,
            @Size(max = 240) String addressLine2,
            @Size(max = 120) String city,
            @Size(max = 120) String state,
            @Size(max = 40) String postalCode,
            @Email @Size(max = 220) String email,
            @Size(max = 180) String regime,
            @Size(max = 32) String cfdiUse,
            @Size(max = 2000) String notes) {
    }

    public record CreateSaleRequest(
            @NotNull @Positive Long contactId,
            @NotNull @Positive Long warehouseId,
            @NotBlank @Size(max = 24) String paymentMethod,
            @Size(max = 180) String paymentReference,
            boolean deliveredNow,
            @Size(max = 2000) String notes,
            @NotEmpty @Size(max = 100) List<@Valid SaleItemRequest> items) {
    }

    public record SaleItemRequest(
            @NotNull @Positive Long productId,
            @NotNull @DecimalMin(value = "0.0001") @DecimalMax(value = "999999999999")
            BigDecimal quantity) {
    }

    public record PaymentEvidencePresignRequest(
            @NotNull @Positive Long saleId,
            @NotBlank @Size(max = 255) String fileName,
            @NotBlank @Size(max = 120) String contentType,
            @NotNull @Positive @Max(15728640) Long sizeBytes) {
    }

    public record PaymentEvidenceRegisterRequest(
            @NotNull @Positive Long saleId,
            @NotBlank @Size(max = 1200) String objectKey,
            @NotBlank @Size(max = 255) String fileName,
            @NotBlank @Size(max = 120) String contentType,
            @NotNull @Positive @Max(15728640) Long sizeBytes) {
    }
}
