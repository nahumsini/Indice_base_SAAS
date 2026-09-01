package com.indice.erp.pos.square;

import java.util.Locale;

public enum SquareTerminalPaymentStatus {
    WAITING,
    APPROVED,
    DECLINED,
    CANCELLED,
    UNCERTAIN;

    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }

    static SquareTerminalPaymentStatus fromSquare(String status, String cancelReason) {
        var normalized = clean(status);
        if ("COMPLETED".equals(normalized)) return APPROVED;
        if ("PENDING".equals(normalized) || "IN_PROGRESS".equals(normalized)
                || "CANCEL_REQUESTED".equals(normalized)) return WAITING;
        if ("CANCELED".equals(normalized) || "CANCELLED".equals(normalized)) {
            return clean(cancelReason).contains("DECLIN") ? DECLINED : CANCELLED;
        }
        return UNCERTAIN;
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
