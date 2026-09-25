package com.indice.erp.pos.square;

import java.util.Locale;

public enum SquareActivationState {
    DISABLED, PILOT, ACTIVE, SUSPENDED;
    public boolean allowsCharges() { return this == PILOT || this == ACTIVE; }
    public static SquareActivationState parse(String value) {
        try { return valueOf(value == null ? "" : value.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("Activation state must be DISABLED, PILOT, ACTIVE, or SUSPENDED.");
        }
    }
}
