package com.indice.erp.kiosk.api;

public final class KioskInternalAccessException extends SecurityException {

    private final boolean authenticated;

    public KioskInternalAccessException(boolean authenticated) {
        super(authenticated ? "Forbidden" : "Authentication required");
        this.authenticated = authenticated;
    }

    public boolean authenticated() {
        return authenticated;
    }
}
