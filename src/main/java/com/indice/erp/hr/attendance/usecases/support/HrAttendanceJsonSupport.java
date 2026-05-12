package com.indice.erp.hr.attendance.usecases.support;

import com.fasterxml.jackson.core.type.TypeReference;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeEventType;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


public abstract class HrAttendanceJsonSupport extends HrAttendanceCoreSupport {

    protected HrAttendanceJsonSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }

    protected String toJson(Object value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("metadata must be valid JSON.");
        }
    }

    protected String mergeMetadataJson(String baseJson, Map<String, Object> additions) {
        var merged = new LinkedHashMap<String, Object>();
        merged.putAll(parseJsonMap(baseJson));
        merged.putAll(additions);
        return toJson(merged);
    }

    protected String metadataTextValue(Object value) {
        if (value == null) {
            return null;
        }
        var normalized = String.valueOf(value).trim();
        return normalized.isBlank() || "null".equalsIgnoreCase(normalized) ? null : normalized;
    }

    protected String displayScheduleTemplateName(String name) {
        if (name == null) {
            return null;
        }
        return name.startsWith("Spring Default Schedule")
            ? "Default Schedule" + name.substring("Spring Default Schedule".length())
            : name;
    }

    protected String normalizeEventKind(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        normalized = normalized.replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "", "check_in", "ingreso", "entrada" -> "check_in";
            case "check_out", "salida" -> "check_out";
            case "break_out", "lunch_out" -> "break_out";
            case "break_in", "lunch_in" -> "break_in";
            case "auth_attempt" -> "auth_attempt";
            case "manual_override", "override" -> "manual_override";
            case "correction", "correccion" -> "correction";
            default -> throw new IllegalArgumentException("Unsupported event_kind.");
        };
    }

    protected String normalizeEventTypeForStorage(String eventKind) {
        return switch (eventKind) {
            case "check_in", "check_out", "break_out", "break_in", "auth_attempt", "manual_override", "correction" -> eventKind;
            default -> throw new IllegalArgumentException("Unsupported event type.");
        };
    }

    protected String normalizePublicKioskEventType(String value) {
        var normalized = normalizeEventType(value);
        return switch (normalized) {
            case "check_in", "check_out" -> normalized;
            default -> throw new IllegalArgumentException("Public kiosk event_type must be check_in or check_out.");
        };
    }
}
