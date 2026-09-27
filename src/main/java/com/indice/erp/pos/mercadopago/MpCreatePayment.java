package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.checkout.dto.PosCheckoutItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record MpCreatePayment(
        @NotBlank @Size(max = 64) String idempotencyKey,
        @NotNull Long cashRegisterId,
        Long customerId,
        Long preticketId,
        Long restaurantOrderId,
        @NotBlank @Size(min = 3, max = 3) String currencyCode,
        @NotEmpty @Size(max = 200) List<@Valid PosCheckoutItemRequest> items,
        @Size(max = 2000) String notes) {
}
