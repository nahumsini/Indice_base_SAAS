package com.indice.erp.hr.attendance.policy;

import java.util.Locale;

public final class AttendanceEmployeeNumberPolicy {

    private AttendanceEmployeeNumberPolicy() {
    }

    public static String format(String prefix, int padding, long nextNumber) {
        var effectivePadding = Math.max(padding, 4);
        var digits = String.format(Locale.ROOT, "%0" + effectivePadding + "d", nextNumber);
        return normalizePrefix(prefix) + "-" + digits;
    }

    public static String normalizePrefix(String prefix) {
        var normalizedPrefix = prefix == null ? "" : prefix.trim().toUpperCase(Locale.ROOT);
        while (normalizedPrefix.endsWith("-")) {
            normalizedPrefix = normalizedPrefix.substring(0, normalizedPrefix.length() - 1).trim();
        }
        return normalizedPrefix.isBlank() ? "EMP" : normalizedPrefix;
    }
}
