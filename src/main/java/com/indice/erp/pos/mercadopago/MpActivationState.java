package com.indice.erp.pos.mercadopago;

import java.util.Locale;

public enum MpActivationState {
    DISABLED, PILOT, ACTIVE, SUSPENDED;

    public boolean allowsCharges() { return this == PILOT || this == ACTIVE; }

    public static MpActivationState parse(String value) {
        try {
            return valueOf(value == null ? "" : value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Activation state must be DISABLED, PILOT, ACTIVE, or SUSPENDED.");
        }
    }
}
