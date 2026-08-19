package com.indice.erp.pos.checkout;

public record CustomerSnapshot(
        Long id,
        String name,
        String taxId,
        String customerType) {
}
