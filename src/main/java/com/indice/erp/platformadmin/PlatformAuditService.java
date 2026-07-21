package com.indice.erp.platformadmin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PlatformAuditService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public PlatformAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public void record(
        long actorUserId,
        String action,
        String targetType,
        String targetReference,
        Long companyId,
        String outcome,
        Map<String, ?> detail
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO platform_audit_events (
                    actor_user_id, action_code, target_type, target_reference,
                    company_id, outcome, request_id, detail_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
                """,
            actorUserId,
            action,
            targetType,
            blankToNull(targetReference),
            companyId,
            outcome,
            blankToNull(MDC.get("requestId")),
            json(detail),
            java.sql.Timestamp.from(clock.instant().plus(730, ChronoUnit.DAYS))
        );
    }

    private String json(Map<String, ?> detail) {
        try {
            return objectMapper.writeValueAsString(detail == null ? Map.of() : detail);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
