package com.indice.erp.kiosk.engine;

import java.time.Duration;

public enum KioskRateLimitType {
    BOOTSTRAP(120, Duration.ofMinutes(5)),
    DEVICE_PAIRING(8, Duration.ofMinutes(15)),
    EMAIL_VERIFICATION(5, Duration.ofMinutes(15)),
    PIN_VERIFICATION(5, Duration.ofMinutes(15)),
    FACE_VERIFICATION(10, Duration.ofMinutes(15)),
    QUERY(120, Duration.ofMinutes(1)),
    MUTATION(30, Duration.ofMinutes(1)),
    FILE(30, Duration.ofMinutes(5));

    private final int maximumRequests;
    private final Duration window;

    KioskRateLimitType(int maximumRequests, Duration window) {
        this.maximumRequests = maximumRequests;
        this.window = window;
    }

    public int maximumRequests() {
        return maximumRequests;
    }

    public Duration window() {
        return window;
    }
}
