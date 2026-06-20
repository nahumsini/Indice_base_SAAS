package com.indice.erp.pos.context.dto;

public record WarehouseSummary(
        Long id,
        String warehouseCode,
        String name,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        String status) {
}
