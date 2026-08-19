package com.indice.erp.pos.checkout;

public record ProductSnapshot(
        Long id,
        String sku,
        String name,
        String type,
        String category,
        boolean inventoryReady) {

    public ProductSnapshot(Long id, String sku, String name, String type, boolean inventoryReady) {
        this(id, sku, name, type, null, inventoryReady);
    }

    public boolean stockTracked() {
        if (!inventoryReady) {
            return false;
        }
        var normalizedType = type == null ? "" : type.trim().toLowerCase(java.util.Locale.ROOT);
        return !normalizedType.contains("service")
            && !normalizedType.contains("digital")
            && !normalizedType.contains("subscription");
    }
}
