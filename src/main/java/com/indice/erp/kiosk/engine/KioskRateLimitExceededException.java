package com.indice.erp.kiosk.engine;

public class KioskRateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    public KioskRateLimitExceededException(long retryAfterSeconds) {
        super("Too many kiosk requests. Try again later.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
