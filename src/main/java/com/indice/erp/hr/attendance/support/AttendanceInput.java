package com.indice.erp.hr.attendance.support;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeAttendanceStatus;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeEventType;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeImageContentType;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeNullableAttendanceStatus;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeRequiredHoursPerDay;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseBoolean;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseDecimalRequired;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseTime;
import static com.indice.erp.hr.attendance.support.AttendanceInput.validatePreferredTimeRange;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public final class AttendanceInput {

    private static final List<String> ATTENDANCE_STATUSES = List.of(
        "on_time",
        "late",
        "leave",
        "rest",
        "absence",
        "pending",
        "not_scheduled"
    );

    private AttendanceInput() {
    }

    public static boolean parseBoolean(Map<String, Object> payload, String key) {
        var value = payload == null ? null : payload.get(key);
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        if (value instanceof String string) {
            var normalized = string.trim().toLowerCase(Locale.ROOT);
            return switch (normalized) {
                case "true", "1", "yes", "si", "sí" -> true;
                case "", "false", "0", "no" -> false;
                default -> throw new IllegalArgumentException(key + " must be boolean.");
            };
        }
        return false;
    }

    public static LocalTime parseTime(Map<String, Object> payload, String key) {
        var raw = stringValue(payload, key);
        if (raw.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(raw);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(key + " must use HH:MM[:SS] format.");
        }
    }

    public static BigDecimal parseDecimalRequired(Map<String, Object> payload, String key) {
        var raw = stringValue(payload, key);
        if (raw.isBlank()) {
            throw new IllegalArgumentException(key + " is required.");
        }
        try {
            return new BigDecimal(raw).setScale(7, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(key + " must be a valid decimal.");
        }
    }

    public static BigDecimal normalizeRequiredHoursPerDay(BigDecimal value) {
        var resolved = value == null ? new BigDecimal("8.00") : value;
        if (resolved.compareTo(BigDecimal.ZERO) <= 0 || resolved.compareTo(new BigDecimal("24.00")) > 0) {
            throw new IllegalArgumentException("required_hours_per_day must be greater than zero and no more than 24.");
        }
        return resolved.setScale(2, RoundingMode.HALF_UP);
    }

    public static void validatePreferredTimeRange(LocalTime startTime, LocalTime endTime) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("required_start_time and required_end_time are required.");
        }
        if (endTime.equals(startTime)) {
            throw new IllegalArgumentException("required_end_time cannot equal required_start_time.");
        }
    }

    public static String normalizeImageContentType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "image/jpeg", "image/jpg" -> "image/jpeg";
            case "image/png" -> "image/png";
            case "image/webp" -> "image/webp";
            default -> throw new IllegalArgumentException("content_type must be image/jpeg, image/png, or image/webp.");
        };
    }

    public static String normalizeEventType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "check_in", "ingreso", "entrada" -> "check_in";
            case "check_out", "salida" -> "check_out";
            case "break_out", "salida_descanso", "lunch_out" -> "break_out";
            case "break_in", "regreso_descanso", "lunch_in" -> "break_in";
            default -> throw new IllegalArgumentException("event_type must be check_in, check_out, break_out, or break_in.");
        };
    }

    public static String normalizeAttendanceStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        normalized = normalized.replace('-', '_').replace(' ', '_');
        normalized = switch (normalized) {
            case "a_tiempo", "presente", "asistencia" -> "on_time";
            case "retardo", "late" -> "late";
            case "permiso", "leave" -> "leave";
            case "descanso", "rest" -> "rest";
            case "falta", "absence" -> "absence";
            case "pendiente", "scheduled", "pending" -> "pending";
            case "sin_horario", "not_scheduled", "unassigned" -> "not_scheduled";
            default -> normalized;
        };

        if (!ATTENDANCE_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported attendance status.");
        }
        return normalized;
    }

    public static String normalizeNullableAttendanceStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return normalizeAttendanceStatus(value);
    }
}
