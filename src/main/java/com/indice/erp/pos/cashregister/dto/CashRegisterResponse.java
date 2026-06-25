package com.indice.erp.pos.cashregister.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.status.CashRegisterStatus;
import java.time.Instant;

public record CashRegisterResponse(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long warehouseId,
        String warehouseName,
        String code,
        String name,
        CashRegisterStatus status,
        boolean active,
        String notes,
        Long createdByUserId,
        Long updatedByUserId,
        Instant createdAt,
        Instant updatedAt,
        Long version,
        JsonNode customFields,
        JsonNode metadata) {
}
