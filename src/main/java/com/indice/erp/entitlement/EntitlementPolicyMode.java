package com.indice.erp.entitlement;

import java.util.Locale;

public enum EntitlementPolicyMode {
    LEGACY,
    DISABLED,
    SHADOW,
    ENFORCE;

    public static EntitlementPolicyMode fromDatabase(String value) {
        if (value == null || value.isBlank()) {
            return LEGACY;
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return LEGACY;
        }
    }
}
