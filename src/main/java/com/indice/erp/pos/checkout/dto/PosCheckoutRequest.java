package com.indice.erp.pos.checkout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PosCheckoutRequest(
        @NotNull Long cashRegisterId,
        Long customerId,
        @NotBlank String currencyCode,
        @NotEmpty List<@Valid PosCheckoutItemRequest> items,
        @NotEmpty List<@Valid PosCheckoutPaymentRequest> payments,
        String notes) {
}
