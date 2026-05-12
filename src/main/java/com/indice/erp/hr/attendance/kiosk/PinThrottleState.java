package com.indice.erp.hr.attendance.kiosk;

import java.time.Instant;


record PinThrottleState(
    int failedAttempts,
    Instant lockedUntil
) {
    boolean isLocked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }
}
