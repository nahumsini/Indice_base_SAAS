package com.indice.erp.hr.attendance.kiosk;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AttendanceKioskModuleAuditService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AttendanceKioskModuleAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
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
                INSERT INTO hr_kiosk_module_audit (
                    event_id, action_id, company_id,
                    kiosk_definition_id, legacy_reference_id,
                    event_type, outcome, actor_type, actor_id,
                    module_record_type, module_record_id, detail_json
                ) VALUES (?, ?, ?, ?, ?, ?, 'SUCCEEDED', ?, ?, ?, ?, ?)
                """,
            UUID.randomUUID().toString(), MDC.get("actionId"), context.definition().companyId(),
            context.definition().id(), context.definition().legacyReferenceId(), eventType,
            session == null ? "PUBLIC" : session.identityType(),
            session == null ? null : session.identityId(), recordType, recordId,
            json(detail == null ? Map.of() : detail)
        );
    }

    public List<Map<String, Object>> list(long companyId, long legacyReferenceId) {
        return jdbcTemplate.query(
            """
                SELECT event_id, action_id, event_type, outcome, actor_type, actor_id,
                       module_record_type, module_record_id, detail_json, created_at
                FROM hr_kiosk_module_audit
                WHERE company_id = ? AND legacy_reference_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 200
                """,
            (rs, rowNum) -> {
                var item = new java.util.LinkedHashMap<String, Object>();
                item.put("event_id", rs.getString("event_id"));
                item.put("action_id", rs.getString("action_id"));
                item.put("event_type", rs.getString("event_type"));
                item.put("outcome", rs.getString("outcome"));
                item.put("actor_type", rs.getString("actor_type"));
                item.put("actor_id", rs.getObject("actor_id"));
                item.put("module_record_type", rs.getString("module_record_type"));
                item.put("module_record_id", rs.getObject("module_record_id"));
                item.put("detail", rs.getString("detail_json"));
                item.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return item;
            },
            companyId, legacyReferenceId
        );
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ignored) {
            return "{}";
        }
    }
}
