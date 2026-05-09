package com.indice.erp.processTasks.tasks.support;

import com.indice.erp.processTasks.tasks.domain.TaskCommand;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;

public final class ProcessTaskInput {

    private ProcessTaskInput() {
    }

    public static TaskCommand parseTaskCommand(
        Map<String, Object> payload,
        Set<String> allowedStatuses,
        Set<String> allowedPriorities
    ) {
        var assignedUserCompanyId = optionalLong(payload, "assignedUserCompanyId");

        if (optionalLong(payload, "assignedUserId") != null) {
            throw new IllegalArgumentException("assignedUserId is no longer supported. Use assignedUserCompanyId.");
        }

        return new TaskCommand(
            requiredString(payload, "title"),
            optionalString(payload, "description"),
            optionalLong(payload, "processId"),
            optionalLong(payload, "projectId"),
            assignedUserCompanyId,
            optionalString(payload, "assignedName"),
            requiredAllowedValue(payload, "status", allowedStatuses),
            optionalAllowedValue(payload, "priority", allowedPriorities, "medium"),
            optionalDate(payload, "dueDate"),
            optionalLong(payload, "businessId"),
            optionalLong(payload, "unitId")
        );
    }

    public static String optionalString(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            return null;
        }

        return value.toString().trim();
    }

    public static Long optionalLong(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null) {
            return null;
        }

        if (value instanceof Number numberValue) {
            return numberValue.longValue();
        }

        var normalized = value.toString().trim();
        if (normalized.isEmpty()) {
            return null;
        }

        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(key + " must be a valid integer.");
        }
    }

    private static String requiredString(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            throw new IllegalArgumentException(key + " is required.");
        }

        return value.toString().trim();
    }

    private static LocalDate optionalDate(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null) {
            return null;
        }

        var normalized = value.toString().trim();
        if (normalized.isEmpty()) {
            return null;
        }

        try {
            return LocalDate.parse(normalized);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(key + " must use YYYY-MM-DD format.");
        }
    }

    private static String requiredAllowedValue(Map<String, Object> payload, String key, Set<String> allowedValues) {
        var value = requiredString(payload, key).toLowerCase();
        if (!allowedValues.contains(value)) {
            throw new IllegalArgumentException(key + " must be one of: " + String.join(", ", allowedValues) + ".");
        }

        return value;
    }

    private static String optionalAllowedValue(
        Map<String, Object> payload,
        String key,
        Set<String> allowedValues,
        String fallbackValue
    ) {
        var rawValue = optionalString(payload, key);
        if (rawValue == null) {
            return fallbackValue;
        }

        var value = rawValue.toLowerCase();
        if (!allowedValues.contains(value)) {
            throw new IllegalArgumentException(key + " must be one of: " + String.join(", ", allowedValues) + ".");
        }

        return value;
    }
}
