package com.indice.erp.processTasks.kiosk;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Functional module audit correlated with the Engine action/request identifiers. */
@Service
public class ProcessTaskKioskModuleAuditService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ProcessTaskKioskModuleAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> list(long companyId, long historicalKioskId) {
        return jdbcTemplate.query(
            """
                SELECT id, task_id, event_type, request_id, action_id, module_reference,
                       actor_user_company_id, snapshot_json, created_at
                FROM process_task_kiosk_audit_events
                WHERE company_id = ? AND historical_kiosk_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 200
                """,
            (rs, rowNum) -> {
                var event = new LinkedHashMap<String, Object>();
                event.put("event_id", "module:" + rs.getLong("id"));
                event.put("event_type", rs.getString("event_type"));
                event.put("outcome", "SUCCEEDED");
                put(event, "request_id", rs.getString("request_id"));
                put(event, "action_id", rs.getString("action_id"));
                event.put("module_reference", rs.getString("module_reference"));
                event.put("actor_type", "EMPLOYEE");
                event.put("actor_id", rs.getLong("actor_user_company_id"));
                event.put("task_id", rs.getLong("task_id"));
                event.put("source", "PROCESS_TASKS");
                event.put("snapshot", jsonMap(rs.getString("snapshot_json")));
                event.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return Map.copyOf(event);
            },
            companyId, historicalKioskId
        );
    }

    void record(
            ProcessTaskPublicKioskContext context,
            long taskId,
            String eventType,
            Map<String, Object> snapshot) {
        jdbcTemplate.update(
            """
                INSERT INTO process_task_kiosk_audit_events (
                    company_id, historical_kiosk_id, task_id, event_type,
                    request_id, action_id, module_reference,
                    actor_user_id, actor_user_company_id, snapshot_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            context.kiosk().companyId(), context.kiosk().id(), taskId, eventType,
            blankToNull(MDC.get("requestId")), blankToNull(MDC.get("actionId")),
            "task:" + taskId, context.employee().userId(), context.employee().userCompanyId(),
            json(snapshot == null ? Map.of() : snapshot)
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Process task kiosk audit snapshot is invalid.", ex);
        }
    }

    private Map<String, Object> jsonMap(String value) {
        try {
            return value == null || value.isBlank() ? Map.of() : objectMapper.readValue(value, MAP_TYPE);
        } catch (JsonProcessingException ex) {
            return Map.of("unavailable", true);
        }
    }

    private void put(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }
}
