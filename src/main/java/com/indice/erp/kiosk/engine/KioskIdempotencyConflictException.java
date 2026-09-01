package com.indice.erp.kiosk.engine;

/**
 * Stable public contract for an idempotent kiosk mutation that cannot be
 * accepted with the current retry key.
 */
public final class KioskIdempotencyConflictException extends RuntimeException {

    public enum Reason {
        REQUEST_MISMATCH,
        IN_PROGRESS
    }

    private final Reason reason;

    private KioskIdempotencyConflictException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public static KioskIdempotencyConflictException requestMismatch() {
        return new KioskIdempotencyConflictException(
            Reason.REQUEST_MISMATCH,
            "Idempotency-Key was already used with another request."
        );
    }

    public static KioskIdempotencyConflictException inProgress() {
        return new KioskIdempotencyConflictException(
            Reason.IN_PROGRESS,
            "An action with this Idempotency-Key is already processing."
        );
    }

    public Reason reason() {
        return reason;
    }

    public String code() {
        return switch (reason) {
            case REQUEST_MISMATCH -> "KIOSK_IDEMPOTENCY_MISMATCH";
            case IN_PROGRESS -> "KIOSK_IDEMPOTENCY_IN_PROGRESS";
        };
    }
}
