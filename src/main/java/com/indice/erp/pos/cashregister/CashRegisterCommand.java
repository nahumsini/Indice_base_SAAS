package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.status.CashRegisterStatus;

record CashRegisterCommand(
        Long unitId,
        Long businessId,
        Long warehouseId,
        String code,
        String name,
        CashRegisterStatus status,
        boolean active,
        String notes,
        Long createdByUserId,
        Long updatedByUserId,
        String customFieldsJson,
        String metadataJson) {
}
