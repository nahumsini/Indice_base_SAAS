package com.indice.erp.hr.announcements;

import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

record HrAnnouncementPayload(
    String title,
    String type,
    String content,
    String audienceType,
    String status,
    LocalDateTime scheduledFor
) {
    static HrAnnouncementPayload from(Map<String, Object> payload) {
        var status = determineStatus(payload);
        var scheduledFor = parseDateTime(payload, "scheduled_for");
        if ("scheduled".equals(status) && scheduledFor == null) {
            throw new IllegalArgumentException("scheduled_for is required when status is scheduled.");
        }

        var title = stringValue(payload, "title", "titulo");
        var content = stringValue(payload, "content", "contenido");
        if (title.isBlank() || content.isBlank()) {
            throw new IllegalArgumentException("title and content are required.");
        }

        return new HrAnnouncementPayload(
            title,
            normalizeType(stringValue(payload, "type", "tipo")),
            content,
            normalizeAudienceType(stringValue(payload, "audience_type", "destinatarios")),
            status,
            scheduledFor
        );
    }

    static String normalizeStatus(String value) {
        return switch (normalize(value)) {
            case "publicado", "published" -> "published";
            case "programado", "scheduled" -> "scheduled";
            case "borrador", "draft" -> "draft";
            default -> throw new IllegalArgumentException("Unsupported announcement status.");
        };
    }

    static String normalizeType(String value) {
        return switch (normalize(value)) {
            case "general" -> "general";
            case "urgente", "urgent" -> "urgent";
            case "recordatorio", "reminder" -> "reminder";
            case "celebracion", "celebration" -> "celebration";
            default -> throw new IllegalArgumentException("Unsupported announcement type.");
        };
    }

    static String normalizeAudienceType(String value) {
        return switch (normalize(value)) {
            case "todos", "all", "todo_el_personal" -> "all";
            case "por-unidad", "units", "unit", "unidades" -> "units";
            case "por-departamento", "departments", "department", "departamentos" -> "departments";
            case "especificos", "employees", "employee", "colaboradores_especificos" -> "employees";
            default -> throw new IllegalArgumentException("Unsupported audience type.");
        };
    }

    private static String determineStatus(Map<String, Object> payload) {
        var explicitStatus = stringValue(payload, "status", "estado");
        if (!explicitStatus.isBlank()) {
            return normalizeStatus(explicitStatus);
        }
        var publicationType = stringValue(payload, "publicacionTipo", "publication_type");
        return "programado".equalsIgnoreCase(publicationType) || "scheduled".equalsIgnoreCase(publicationType)
            ? "scheduled"
            : "published";
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
