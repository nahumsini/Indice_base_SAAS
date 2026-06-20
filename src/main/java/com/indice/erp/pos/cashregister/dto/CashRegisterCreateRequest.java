package com.indice.erp.pos.cashregister.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.status.CashRegisterStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CashRegisterCreateRequest(
        @NotNull Long warehouseId,
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name,
        CashRegisterStatus status,
        Boolean active,
        String notes,
        JsonNode customFields,
        JsonNode metadata) {
}
