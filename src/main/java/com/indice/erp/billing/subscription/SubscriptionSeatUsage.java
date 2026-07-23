package com.indice.erp.billing.subscription;

public record SubscriptionSeatUsage(
    int allowedSeats,
    int activeSeats,
    int pendingInvitations,
    int usedSeats,
    int remainingSeats,
    boolean enforced
) {
    public static SubscriptionSeatUsage notEnforced(int activeSeats, int pendingInvitations) {
        return new SubscriptionSeatUsage(0, activeSeats, pendingInvitations, activeSeats + pendingInvitations, 0, false);
    }
}
