package com.indice.erp.billing.lifecycle;

public enum CommercialLifecycleState {
    TRIAL,
    ACTIVE,
    GRACE,
    READ_ONLY,
    SUSPENDED,
    RETENTION,
    PURGE_PENDING;

    public boolean allowsOperationalRead() {
        return this == TRIAL || this == ACTIVE || this == GRACE || this == READ_ONLY;
    }

    public boolean allowsOperationalWrite() {
        return this == TRIAL || this == ACTIVE || this == GRACE;
    }
}
