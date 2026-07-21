package com.indice.erp.billing.seats;

public class SeatPurchaseForbiddenException extends RuntimeException {
    public SeatPurchaseForbiddenException(String message) {
        super(message);
    }
}
