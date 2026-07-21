package com.indice.erp.billing.seats;

public class SeatCapacityExceededException extends RuntimeException {

    private final SeatService.SeatSnapshot snapshot;

    public SeatCapacityExceededException(String message, SeatService.SeatSnapshot snapshot) {
        super(message);
        this.snapshot = snapshot;
    }

    public SeatService.SeatSnapshot snapshot() {
        return snapshot;
    }
}
