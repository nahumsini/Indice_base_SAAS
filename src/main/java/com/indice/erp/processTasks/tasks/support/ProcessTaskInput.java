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
        var statusValue = normalizedRequiredValue(payload, "status");
        var audited = optionalBoolean(payload, "audited");

        if (optionalLong(payload, "assignedUserId") != null) {
            throw new IllegalArgumentException("assignedUserId is no longer supported. Use assignedUserCompanyId.");
        }

        if ("audited".equals(statusValue) && audited == null) {
            audited = true;
        }

        var status = "audited".equals(statusValue)
            ? "completed"
            : requireAllowedValue(statusValue, "status", allowedStatuses);

        return new TaskCommand(
            requiredString(payload, "title"),
            optionalString(payload, "description"),
            optionalLong(payload, "processId"),
            optionalLong(payload, "projectId"),
            assignedUserCompanyId,
            optionalString(payload, "assignedName"),
            status,
            optionalAllowedValue(payload, "priority", allowedPriorities, "medium"),
            optionalDate(payload, "startDate"),
            optionalDate(payload, "dueDate"),
            optionalString(payload, "notes"),
            optionalInteger(payload, "completionPercent", "completion"),
            optionalInteger(payload, "weighting"),
            audited,
            optionalString(payload, "auditNotes"),
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

    public static Boolean optionalBoolean(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null) {
            return null;
        }

        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }

        var normalized = value.toString().trim().toLowerCase();
        if (normalized.isEmpty()) {
            return null;
        }

        return switch (normalized) {
            case "true", "1", "yes", "y", "si" -> true;
            case "false", "0", "no", "n" -> false;
            default -> throw new IllegalArgumentException(key + " must be a valid boolean.");
        };
    }

    public static Integer optionalInteger(Map<String, Object> payload, String key, String... aliases) {
        var effectiveKey = key;
        Object value = payload.get(key);

        if (value == null && !payload.containsKey(key)) {
            for (String alias : aliases) {
                if (payload.containsKey(alias)) {
                    effectiveKey = alias;
                    value = payload.get(alias);
                    break;
                }
            }
        }

        if (value == null) {
            return null;
        }

        if (value instanceof Number numberValue) {
            return validateIntegerRange(effectiveKey, numberValue.intValue());
        }

        var normalized = value.toString().trim();
        if (normalized.isEmpty()) {
            return null;
        }

        try {
            return validateIntegerRange(effectiveKey, Integer.parseInt(normalized));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(effectiveKey + " must be a valid integer.");
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
        return requireAllowedValue(normalizedRequiredValue(payload, key), key, allowedValues);
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

        var value = normalizeValue(rawValue);
        if (!allowedValues.contains(value)) {
            throw new IllegalArgumentException(key + " must be one of: " + String.join(", ", allowedValues) + ".");
        }

        return value;
    }

    private static String requireAllowedValue(String value, String key, Set<String> allowedValues) {
        if (!allowedValues.contains(value)) {
            throw new IllegalArgumentException(key + " must be one of: " + String.join(", ", allowedValues) + ".");
        }

        return value;
    }

    private static String normalizedRequiredValue(Map<String, Object> payload, String key) {
        return normalizeValue(requiredString(payload, key));
    }

    private static String normalizeValue(String value) {
        return value.trim().toLowerCase().replace('-', '_');
    }

    private static Integer validateIntegerRange(String key, Integer value) {
        if ("completionPercent".equals(key) || "completion".equals(key)) {
            if (value < 0 || value > 100) {
                throw new IllegalArgumentException(key + " must be between 0 and 100.");
            }
        }

        if ("weighting".equals(key) && (value < 0 || value > 5)) {
            throw new IllegalArgumentException(key + " must be between 0 and 5.");
        }

        return value;
    }
}
