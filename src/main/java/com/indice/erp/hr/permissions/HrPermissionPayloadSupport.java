package com.indice.erp.hr.permissions;

import com.indice.erp.hr.shared.HrPayloadUtils;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;

public final class HrPermissionPayloadSupport {

    private HrPermissionPayloadSupport() {
    }

    public static PermissionDraft permissionDraft(Map<String, Object> payload) {
        var type = normalizeType(HrPayloadUtils.stringValue(payload, "type", "permission_type", "permissionType"));
        var payrollTreatment = normalizePayrollTreatment(
            HrPayloadUtils.stringValue(payload, "payroll_treatment", "payrollTreatment", "payrollTreatmentCode"),
            type
        );
        var startDate = requiredDate(payload, "start_date", "startDate");
        var endDate = requiredDate(payload, "end_date", "endDate");
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("end_date must be on or after start_date.");
        }
        var halfDay = parseBoolean(payload.get("half_day"));
        if (!halfDay) {
            halfDay = parseBoolean(payload.get("halfDay"));
        }
        var reason = requiredText(HrPayloadUtils.stringValue(payload, "reason"), "reason", 2000);
        return new PermissionDraft(type, payrollTreatment, startDate, endDate, halfDay, reason, requestedDays(startDate, endDate, halfDay));
    }

    public static String reviewNotes(Map<String, Object> payload) {
        return optionalText(HrPayloadUtils.stringValue(payload, "review_notes", "reviewNotes"), 2000);
    }

    private static String normalizeType(String rawType) {
        var normalized = HrPayloadUtils.safe(rawType).trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "vacation", "sick_leave", "personal", "maternity", "bereavement", "unpaid", "other" -> normalized;
            default -> throw new IllegalArgumentException("type is invalid.");
        };
    }

    private static String normalizePayrollTreatment(String rawTreatment, String type) {
        var normalized = HrPayloadUtils.safe(rawTreatment).trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "unpaid".equalsIgnoreCase(type) ? "unpaid" : "paid";
        }
        return switch (normalized) {
            case "paid", "paid_leave", "pagado", "con_goce" -> "paid";
            case "unpaid", "unpaid_leave", "no_pagado", "sin_goce" -> "unpaid";
            default -> throw new IllegalArgumentException("payroll_treatment is invalid.");
        };
    }

    private static LocalDate requiredDate(Map<String, Object> payload, String... keys) {
        var value = HrPayloadUtils.parseDate(payload, keys);
        if (value == null) {
            throw new IllegalArgumentException(keys[0] + " is required.");
        }
        return value;
    }

    private static boolean parseBoolean(Object value) {
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }
        if (value instanceof String stringValue) {
            return "true".equalsIgnoreCase(stringValue.trim());
        }
        return false;
    }

    private static String requiredText(String value, String fieldName, int maxLength) {
        var normalized = HrPayloadUtils.safe(value).trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private static String optionalText(String value, int maxLength) {
        var normalized = HrPayloadUtils.safe(value).trim();
        if (normalized.isBlank()) {
            return null;
        }
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private static BigDecimal requestedDays(LocalDate startDate, LocalDate endDate, boolean halfDay) {
        var totalDays = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        return BigDecimal.valueOf(halfDay ? totalDays - 0.5d : totalDays);
    }

    public record PermissionDraft(
        String type,
        String payrollTreatment,
        LocalDate startDate,
        LocalDate endDate,
        boolean halfDay,
        String reason,
        BigDecimal requestedDays
    ) {
    }
}
