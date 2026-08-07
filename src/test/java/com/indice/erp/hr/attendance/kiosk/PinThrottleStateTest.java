package com.indice.erp.hr.attendance.kiosk;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PinThrottleStateTest {

    private static final Instant NOW = Instant.parse("2026-08-07T18:00:00Z");

    @Test
    void attemptWindowExpiresSoOldSharedKioskFailuresDoNotAccumulateForever() {
        var active = new PinThrottleState(4, NOW.minus(Duration.ofMinutes(4)), null);
        var expired = new PinThrottleState(4, NOW.minus(Duration.ofMinutes(5)), null);

        assertFalse(active.isAttemptWindowExpired(NOW, Duration.ofMinutes(5)));
        assertTrue(expired.isAttemptWindowExpired(NOW, Duration.ofMinutes(5)));
    }

    @Test
    void legacyStateWithoutWindowTimestampExpiresImmediately() {
        var legacy = new PinThrottleState(4, null, null);

        assertTrue(legacy.isAttemptWindowExpired(NOW, Duration.ofMinutes(5)));
    }

    @Test
    void lockRemainsActiveOnlyUntilItsDeadline() {
        var state = new PinThrottleState(30, NOW.minusSeconds(30), NOW.plusSeconds(30));

        assertTrue(state.isLocked(NOW));
        assertFalse(state.isLocked(NOW.plusSeconds(30)));
    }
}
