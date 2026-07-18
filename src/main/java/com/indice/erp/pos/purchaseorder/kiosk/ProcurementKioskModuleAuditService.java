package com.indice.erp.pos.purchaseorder.kiosk;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ProcurementKioskModuleAuditService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ProcurementKioskModuleAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void success(
            KioskExecutionContext context,
            String eventType,
            String recordType,
            Long recordId,
            Map<String, ?> detail) {
        if (context.definition() == null) {
            return;
        }
        var session = context.session();
        jdbcTemplate.update(
            """
                INSERT INTO procurement_kiosk_module_audit (
                    event_id, action_id, request_id, company_id, legacy_reference_id,
                    event_type, outcome, actor_type, actor_id,
                    module_record_type, module_record_id, detail_json
                ) VALUES (?, ?, ?, ?, ?, ?, 'SUCCEEDED', ?, ?, ?, ?, ?)
                """,
            UUID.randomUUID().toString(), blank(MDC.get("actionId")), blank(MDC.get("requestId")),
            context.definition().companyId(), context.definition().legacyReferenceId(), eventType,
            session == null ? "PUBLIC" : session.identityType(),
            session == null ? null : session.identityId(), recordType, recordId,
            json(detail == null ? Map.of() : detail)
        );
    }

    public void adminSuccess(
            long companyId,
            long legacyReferenceId,
            long actorId,
            String eventType,
            Map<String, ?> detail) {
        jdbcTemplate.update(
            """
                INSERT INTO procurement_kiosk_module_audit (
                    event_id, request_id, company_id, legacy_reference_id,
                    event_type, outcome, actor_type, actor_id, detail_json
                ) VALUES (?, ?, ?, ?, ?, 'SUCCEEDED', 'USER', ?, ?)
                """,
            UUID.randomUUID().toString(), blank(MDC.get("requestId")), companyId,
            legacyReferenceId, eventType, actorId,
            json(detail == null ? Map.of() : detail)
        );
    }

    public void systemSuccess(
            long companyId,
            long legacyReferenceId,
            String eventType,
            Map<String, ?> detail) {
        jdbcTemplate.update(
            """
                INSERT INTO procurement_kiosk_module_audit (
                    event_id, request_id, company_id, legacy_reference_id,
                    event_type, outcome, actor_type, detail_json
                ) VALUES (?, ?, ?, ?, ?, 'SUCCEEDED', 'SYSTEM', ?)
                """,
            UUID.randomUUID().toString(), blank(MDC.get("requestId")), companyId,
            legacyReferenceId, eventType,
            json(detail == null ? Map.of() : detail));
    }

    public List<Map<String, Object>> list(long companyId, long legacyReferenceId) {
        return jdbcTemplate.query(
            """
                SELECT event_id, action_id, request_id, event_type, outcome,
                       actor_type, actor_id, module_record_type, module_record_id,
                       detail_json, created_at
                FROM procurement_kiosk_module_audit
                WHERE company_id = ? AND legacy_reference_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 200
                """,
            (rs, rowNum) -> {
                var event = new LinkedHashMap<String, Object>();
                event.put("event_id", rs.getString("event_id"));
                put(event, "action_id", rs.getString("action_id"));
                put(event, "request_id", rs.getString("request_id"));
                event.put("event_type", rs.getString("event_type"));
                event.put("outcome", rs.getString("outcome"));
                put(event, "actor_type", rs.getString("actor_type"));
                put(event, "actor_id", rs.getObject("actor_id"));
                put(event, "module_record_type", rs.getString("module_record_type"));
                put(event, "module_record_id", rs.getObject("module_record_id"));
                event.put("detail", jsonMap(rs.getString("detail_json")));
                event.put("source", ProcurementSupplierPortalCapabilities.OWNER_MODULE);
                event.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return Map.copyOf(event);
            },
            companyId, legacyReferenceId
        );
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Procurement kiosk audit detail is invalid.", failure);
        }
    }

    private Map<String, Object> jsonMap(String value) {
        try {
            return value == null || value.isBlank() ? Map.of() : objectMapper.readValue(value, MAP_TYPE);
        } catch (JsonProcessingException failure) {
            return Map.of("unavailable", true);
        }
    }

    private String blank(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private void put(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }
}
