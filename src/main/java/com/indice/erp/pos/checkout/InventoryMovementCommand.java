package com.indice.erp.pos.checkout;

import java.math.BigDecimal;

public record InventoryMovementCommand(
        String movementNumber,
        String groupId,
        Long productId,
        String productName,
        String productSku,
        BigDecimal quantity,
        Long fromWarehouseId,
        String fromWarehouseName,
        Long unitId,
        Long businessId,
        String reference,
        String responsibleName,
        String metadataJson) {
}
