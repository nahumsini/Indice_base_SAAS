package com.indice.erp.finance.payablekiosk;

import java.util.Locale;

final class PayableKioskRules {

    private PayableKioskRules() {
    }

    static String normalizeCode(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9-]", "-");
    }

    static String codeFromName(String name) {
        var normalized = normalizeCode(name);
        normalized = normalized.replaceAll("-+", "-").replaceAll("^-|-$", "");
        return normalized.isBlank() ? "payable-kiosk" : normalized;
    }

    static String normalizeStatus(String value) {
        var normalized = value == null ? "ACTIVE" : value.trim().toUpperCase(Locale.ROOT);
        return "INACTIVE".equals(normalized) ? "INACTIVE" : "ACTIVE";
    }

    static String normalizeAccessType(String value) {
        var normalized = value == null ? "MIXED" : value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "PROVIDER", "EMPLOYEE", "PROVIDER_REGISTRATION" -> normalized;
            default -> "MIXED";
        };
    }

    static String normalizeCurrency(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        return normalized.length() == 3 ? normalized : "MXN";
    }

    static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
