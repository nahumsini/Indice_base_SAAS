package com.indice.erp.kiosk.api;

/** Identifies a recoverable browser-session validation mismatch on a public kiosk. */
public class KioskCsrfException extends RuntimeException {

    public KioskCsrfException() {
        super("Kiosk browser validation expired.");
    }
}
