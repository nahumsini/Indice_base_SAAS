package com.indice.erp.finance.paymentaccounts.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.paymentaccounts.PaymentAccountStatus;
import com.indice.erp.finance.paymentaccounts.PaymentAccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Null;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdatePaymentAccountRequest(
    Long unitId,
    Long businessId,
    @NotBlank @Size(max = 160) String name,
    @NotNull PaymentAccountType type,
    @NotBlank @Size(min = 3, max = 3) String currencyCode,
    @Null BigDecimal openingBalance,
    @Null BigDecimal currentBalance,
    PaymentAccountStatus status,
    @Size(max = 4000) String description,
    JsonNode customFields,
    JsonNode metadata
) {
}
