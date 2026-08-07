package com.indice.erp.hr.attendance.kiosk;

import java.time.Duration;
import java.time.Instant;


record PinThrottleState(
    int failedAttempts,
    Instant windowStartedAt,
    Instant lockedUntil
) {
    boolean isLocked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    boolean isAttemptWindowExpired(Instant now, Duration attemptWindow) {
        return windowStartedAt == null || !windowStartedAt.plus(attemptWindow).isAfter(now);
    }
}
