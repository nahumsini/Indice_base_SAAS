package com.indice.erp.hr.attendance.locations;

/** Stable, non-sensitive reasons; internal location names never enter the public response. */
public final class AttendanceLocationValidationException extends IllegalArgumentException {
    public enum Reason { NOT_CONFIGURED, NOT_ALLOWED, OUTSIDE_RADIUS }

    private final Reason reason;

    public AttendanceLocationValidationException(Reason reason, String internalMessage) {
        super(internalMessage);
        this.reason = java.util.Objects.requireNonNull(reason);
    }

    public Reason reason() { return reason; }
}
