package com.indice.erp.pos.customerdisplay;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Bounded connection audit for the high-frequency read-only display channel. */
@Service
public class CustomerDisplayAuditService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public CustomerDisplayAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void recordConnection(
            KioskExecutionContext context,
            CustomerDisplayDeviceRecord device) {
        if (context.definition() == null) {
            return;
        }
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, request_id, kiosk_definition_id, historical_kiosk_id,
                    company_id, owner_module, event_type, outcome, actor_type,
                    capability_key, module_reference, technical_detail_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, 'CUSTOMER_DISPLAY_CONNECTED', 'SUCCEEDED',
                          'PUBLIC_DEVICE', ?, ?, ?, ?)
                """,
            UUID.randomUUID().toString(), blankToNull(MDC.get("requestId")),
            context.definition().id(), context.definition().id(), context.definition().companyId(),
            PointOfSaleKioskCapabilities.OWNER_MODULE,
            PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_STATE_READ + "@1",
            "customer-display:" + device.id(),
            json(Map.of(
                "channel", context.channel(),
                "cash_register_id", device.cashRegisterId()
            )),
            Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS))
        );
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Customer display audit could not be serialized.", failure);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
