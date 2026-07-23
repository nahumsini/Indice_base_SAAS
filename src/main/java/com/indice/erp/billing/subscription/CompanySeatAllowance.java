package com.indice.erp.billing.subscription;

public record CompanySeatAllowance(
    int allowedSeats,
    int usedSeats,
    int remainingSeats,
    int includedSeats,
    int extraSeats
) {
}
