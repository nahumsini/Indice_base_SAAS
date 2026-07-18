package com.indice.erp.kiosk.engine;

public enum KioskDefinitionStatus {
    ACTIVE,
    DISABLED,
    EXPIRED,
    REVOKED,
    DELETED;

    public boolean operational() {
        return this == ACTIVE;
    }

    public boolean terminal() {
        return this == REVOKED || this == DELETED;
    }
}
