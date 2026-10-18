package com.indice.erp.sales;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Map;

/** Keeps the legacy wall-clock API while deriving an authoritative UTC instant for reminders. */
final class OpportunitySchedule {
    private OpportunitySchedule() { }

    static void normalize(Map<String, Object> payload, ZoneId zone) {
        // Both camelCase and snake_case aliases are accepted by the legacy repository.
        payload.remove("nextActionScheduledAt");
        payload.remove("next_action_scheduled_at");
        payload.remove("nextActionTimezone");
        payload.remove("next_action_timezone");
        if (!SalesPayloadSupport.contains(payload, "nextActionAt")) return;
        var value = SalesPayloadSupport.value(payload, "nextActionAt");
        String raw = value == null ? "" : value.toString().trim();
        payload.remove("next_action_at");
        payload.put("nextActionScheduledAt", null);
        payload.put("nextActionTimezone", null);
        if (raw.isEmpty()) {
            payload.put("nextActionAt", null);
            return;
        }
        try {
            if (raw.matches("\\d{4}-\\d{2}-\\d{2}")) {
                payload.put("nextActionAt", LocalDate.parse(raw).atStartOfDay());
                return;
            }
            var local = LocalDateTime.parse(raw.replace(' ', 'T'));
            var offsets = zone.getRules().getValidOffsets(local);
            if (offsets.size() != 1) {
                throw new IllegalArgumentException("El horario no existe o es ambiguo por el cambio de hora en " + zone
                        + ". Selecciona otro horario.");
            }
            payload.put("nextActionAt", local);
            payload.put("nextActionScheduledAt", LocalDateTime.ofInstant(local.toInstant(offsets.getFirst()), ZoneOffset.UTC));
            payload.put("nextActionTimezone", zone.getId());
        } catch (DateTimeParseException failure) {
            throw new IllegalArgumentException("Indica una fecha válida y, para recibir el recordatorio, una hora válida.");
        }
    }
}
