package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.status.CashRegisterStatus;
import java.time.Instant;
import java.math.BigDecimal;

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
        BigDecimal retainedCashAmount,
        Long createdByUserId,
        Long updatedByUserId,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt,
        Long version,
        String customFieldsJson,
        String metadataJson) {
    public CashRegisterRecord(
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
        this(id, companyId, unitId, businessId, warehouseId, warehouseName, code, name, status,
            active, notes, BigDecimal.ZERO, createdByUserId, updatedByUserId, createdAt, updatedAt,
            deletedAt, version, customFieldsJson, metadataJson);
    }
}
