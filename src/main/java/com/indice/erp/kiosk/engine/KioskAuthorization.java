package com.indice.erp.kiosk.engine;

public record KioskAuthorization(boolean allowed, String reason) {

    public static KioskAuthorization allow() {
        return new KioskAuthorization(true, null);
    }

    public static KioskAuthorization deny(String reason) {
        return new KioskAuthorization(false, reason);
    }

    public void requireAllowed() {
        if (!allowed) {
            throw new SecurityException(reason == null ? "Kiosk action is not allowed." : reason);
        }
    }
}
