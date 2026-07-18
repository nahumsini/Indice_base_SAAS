package com.indice.erp.kiosk.engine;

public class KioskEngineDisabledException extends RuntimeException {
    public KioskEngineDisabledException() {
        super("Kiosk Engine v2 is disabled.");
    }
}
