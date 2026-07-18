package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KioskActionAuditService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public KioskActionAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String beginAction(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            String idempotencyKey) {
        requireResolved(context);
        var actionId = UUID.randomUUID().toString();
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_actions (
                    action_id, session_id, kiosk_definition_id, company_id, capability_key,
                    capability_version, idempotency_key, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUESTED')
                """,
            actionId,
            context.session() == null ? null : context.session().sessionId(),
            context.definition().id(),
            context.definition().companyId(),
            capability.key(),
            capability.version(),
            idempotencyKey
        );
        insertEvent(actionId, context, request, capability, "KIOSK_ACTION_REQUESTED", "REQUESTED", null, null);
        return actionId;
    }

    /*
     * Success participates in the module action transaction: if the critical
     * audit write fails, the functional mutation must not commit. The initial
     * REQUESTED event stays in its own transaction so a rolled-back action is
     * still observable and can later be reconciled.
     */
    @Transactional
    public void recordSuccess(
            String actionId,
            String requestId,
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            Map<String, Object> response,
            boolean replayed) {
        var status = replayed ? "REPLAYED" : "SUCCEEDED";
        var moduleReference = moduleReference(response);
        jdbcTemplate.update(
            """
                UPDATE kiosk_actions
                SET completed_at = CURRENT_TIMESTAMP, status = ?, module_reference = ?,
                    session_id = COALESCE(session_id, ?),
                    public_result_json = ?, error_code = NULL
                WHERE action_id = ?
                """,
            status, moduleReference,
            context.session() == null ? null : context.session().sessionId(),
            json(minimalPublicResult(context, capability, response, moduleReference)), actionId
        );
        insertEvent(actionId, context, request, capability, "KIOSK_ACTION_COMPLETED", status,
            requestId, moduleReference);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(
            String actionId,
            String requestId,
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            RuntimeException failure) {
        jdbcTemplate.update(
            """
                UPDATE kiosk_actions
                SET completed_at = CURRENT_TIMESTAMP, status = 'FAILED', error_code = ?
                WHERE action_id = ?
                """,
            failure.getClass().getSimpleName(), actionId
        );
        insertEvent(actionId, context, request, capability, "KIOSK_ACTION_FAILED", "FAILED",
            requestId, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRejected(
            String requestId,
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            RuntimeException failure) {
        if (context.definition() == null) {
            return;
        }
        insertEvent(null, context, request, capability, "KIOSK_ACTION_REJECTED", "FAILED",
            requestId, failure.getClass().getSimpleName());
    }

    private void insertEvent(
            String actionId,
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            String eventType,
            String outcome,
            String requestId,
            String moduleReference) {
        requireResolved(context);
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, request_id, action_id, session_id, kiosk_definition_id,
                    historical_kiosk_id, company_id, owner_module, event_type, outcome,
                    actor_type, actor_id, capability_key, module_reference,
                    technical_detail_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            UUID.randomUUID().toString(), blankToNull(requestId), actionId,
            context.session() == null ? null : context.session().sessionId(),
            context.definition().id(), context.definition().id(), context.definition().companyId(),
            context.ownerModule(), eventType, outcome,
            context.session() == null ? null : context.session().identityType(),
            context.session() == null ? null : context.session().identityId(),
            capability.versionedKey(), moduleReference,
            json(Map.of(
                "channel", context.channel(),
                "resource_id", request.resourceId() == null ? "" : request.resourceId()
            )),
            Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS))
        );
    }

    private void requireResolved(KioskExecutionContext context) {
        if (context.definition() == null) {
            throw new IllegalStateException("Kiosk definition must be resolved before auditing an action.");
        }
    }

    @SuppressWarnings("unchecked")
    private String moduleReference(Map<String, Object> response) {
        if (response == null) {
            return null;
        }
        for (var key : new String[] {"id", "task_id", "reference"}) {
            var value = response.get(key);
            if (value != null) {
                return String.valueOf(value);
            }
        }
        var task = response.get("task");
        if (task instanceof Map<?, ?> taskMap && taskMap.get("id") != null) {
            return "task:" + taskMap.get("id");
        }
        return null;
    }

    private Map<String, Object> minimalPublicResult(
            KioskExecutionContext context,
            KioskCapabilityDescriptor capability,
            Map<String, Object> response,
            String moduleReference) {
        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("success", true);
        result.put("capability", capability.versionedKey());
        if (moduleReference != null) {
            result.put("moduleReference", moduleReference);
        }
        if (context.session() != null) {
            result.put("kioskSessionId", context.session().sessionId());
        }
        var items = response == null ? null : response.get("items");
        if (items instanceof java.util.Collection<?> collection) {
            result.put("itemCount", collection.size());
        }
        return result;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Kiosk audit value is not serializable.", ex);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
