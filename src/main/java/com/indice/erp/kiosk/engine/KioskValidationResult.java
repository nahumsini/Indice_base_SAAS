package com.indice.erp.kiosk.engine;

public record KioskValidationResult(boolean valid, String reason) {

    public static KioskValidationResult success() {
        return new KioskValidationResult(true, null);
    }

    public static KioskValidationResult invalid(String reason) {
        return new KioskValidationResult(false, reason);
    }

    public void requireValid() {
        if (!valid) {
            throw new IllegalArgumentException(reason == null ? "Kiosk action payload is invalid." : reason);
        }
    }
}
