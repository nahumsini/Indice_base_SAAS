package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.status.CashRegisterStatus;
import java.math.BigDecimal;

record CashRegisterCommand(
        Long unitId,
        Long businessId,
        Long warehouseId,
        String code,
        String name,
        CashRegisterStatus status,
        boolean active,
        String notes,
        BigDecimal retainedCashAmount,
        Long createdByUserId,
        Long updatedByUserId,
        String customFieldsJson,
        String metadataJson) {
}
