package com.indice.erp.billing.storage;

public class StorageQuotaExceededException extends RuntimeException {

    private final StorageQuotaService.StorageSnapshot snapshot;

    public StorageQuotaExceededException(String message, StorageQuotaService.StorageSnapshot snapshot) {
        super(message);
        this.snapshot = snapshot;
    }

    public StorageQuotaService.StorageSnapshot snapshot() {
        return snapshot;
    }
}
