package com.indice.erp.kiosk.engine;

public class KioskUnavailableException extends java.util.NoSuchElementException {

    public KioskUnavailableException() {
        super("Kiosk not found.");
    }
}
