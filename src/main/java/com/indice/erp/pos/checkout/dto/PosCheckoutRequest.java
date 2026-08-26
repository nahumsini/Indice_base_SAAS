package com.indice.erp.pos.checkout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PosCheckoutRequest(
        @NotNull Long cashRegisterId,
        Long customerId,
        Long preticketId,
        Long restaurantOrderId,
        @NotBlank String currencyCode,
        @NotEmpty List<@Valid PosCheckoutItemRequest> items,
        @NotEmpty List<@Valid PosCheckoutPaymentRequest> payments,
        String notes) {

    public PosCheckoutRequest(
            Long cashRegisterId,
            Long customerId,
            Long preticketId,
            String currencyCode,
            List<PosCheckoutItemRequest> items,
            List<PosCheckoutPaymentRequest> payments,
            String notes) {
        this(cashRegisterId, customerId, preticketId, null, currencyCode, items, payments, notes);
    }

    public PosCheckoutRequest(
            Long cashRegisterId,
            Long customerId,
            String currencyCode,
            List<PosCheckoutItemRequest> items,
            List<PosCheckoutPaymentRequest> payments,
            String notes) {
        this(cashRegisterId, customerId, null, null, currencyCode, items, payments, notes);
    }
}
