package com.indice.erp.hr;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

final class HrPayloadUtils {

    private HrPayloadUtils() {
    }

    static String stringValue(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value instanceof String string && !string.isBlank()) {
                return string.trim();
            }
            if (value instanceof Number number) {
                return String.valueOf(number);
            }
        }
        return "";
    }

    static Long parseLong(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value instanceof Number number) {
                return number.longValue();
            }
            if (value instanceof String string && !string.isBlank()) {
                try {
                    return Long.parseLong(string.trim());
                } catch (NumberFormatException ex) {
                    throw new IllegalArgumentException(key + " must be numeric.");
                }
            }
        }
        return null;
    }

    static Integer parseInteger(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value instanceof Number number) {
                return number.intValue();
            }
            if (value instanceof String string && !string.isBlank()) {
                try {
                    return Integer.parseInt(string.trim());
                } catch (NumberFormatException ex) {
                    throw new IllegalArgumentException(key + " must be numeric.");
                }
            }
        }
        return null;
    }

    static BigDecimal parseBigDecimal(Map<String, Object> payload, String... keys) {
        var raw = stringValue(payload, keys);
        if (raw.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(raw);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(keys[0] + " must be a valid number.");
        }
    }

    static LocalDate parseDate(Map<String, Object> payload, String... keys) {
        var raw = stringValue(payload, keys);
        if (raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(keys[0] + " must use YYYY-MM-DD format.");
        }
    }

    static LocalDateTime parseDateTime(Map<String, Object> payload, String... keys) {
        var raw = stringValue(payload, keys);
        if (raw.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDateTime.parse(raw.replace(" ", "T"));
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException(keys[0] + " must use ISO local date-time format.");
            }
        }
    }

    static List<String> stringList(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value instanceof List<?> list) {
                var result = new ArrayList<String>();
                for (var item : list) {
                    if (item == null) {
                        continue;
                    }
                    var normalized = String.valueOf(item).trim();
                    if (!normalized.isBlank()) {
                        result.add(normalized);
                    }
                }
                return result;
            }
        }
        return List.of();
    }

    static List<Long> longList(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value instanceof List<?> list) {
                var result = new ArrayList<Long>();
                for (var item : list) {
                    if (item instanceof Number number) {
                        result.add(number.longValue());
                    } else if (item instanceof String string && !string.isBlank()) {
                        try {
                            result.add(Long.parseLong(string.trim()));
                        } catch (NumberFormatException ex) {
                            throw new IllegalArgumentException(key + " must contain numeric values.");
                        }
                    }
                }
                return result;
            }
        }
        return List.of();
    }

    static String safe(String value) {
        return value == null ? "" : value;
    }

    static String nullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
