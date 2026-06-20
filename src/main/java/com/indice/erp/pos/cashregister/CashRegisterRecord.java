package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.status.CashRegisterStatus;
import java.time.Instant;

public record CashRegisterRecord(
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
        Instant deletedAt,
        Long version,
        String customFieldsJson,
        String metadataJson) {
}
