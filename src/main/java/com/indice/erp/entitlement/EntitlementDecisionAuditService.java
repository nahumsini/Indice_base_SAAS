package com.indice.erp.entitlement;

import com.indice.erp.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class EntitlementDecisionAuditService {

    private static final Duration RETENTION = Duration.ofDays(90);

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public EntitlementDecisionAuditService(JdbcTemplate jdbcTemplate, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    public void record(
        TenantContext tenant,
        CapabilityShadowDecision decision,
        HttpServletRequest request,
        boolean enforced
    ) {
        if (decision.matched() && !enforced) {
            return;
        }
        var now = clock.instant();
        jdbcTemplate.update(
            """
                INSERT INTO entitlement_decision_events (
                    company_id, user_id, user_company_id, policy_mode, decision_type,
                    capability_code, operation_code, legacy_allowed, entitlement_allowed,
                    effective_allowed, decision_source, http_method, request_path,
                    request_id, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            tenant.company_id(),
            tenant.user_id(),
            tenant.user_company_id(),
            decision.policy_mode().name(),
            enforced ? "ENFORCED_DENY" : "SHADOW_MISMATCH",
            decision.capability(),
            decision.operation().name(),
            decision.legacy_allowed(),
            decision.company_allowed(),
            decision.shadow_allowed(),
            limit(decision.source(), 500),
            limit(request.getMethod(), 12),
            limit(request.getRequestURI(), 500),
            limit(MDC.get("requestId"), 80),
            Timestamp.from(now.plus(RETENTION))
        );
    }

    private String limit(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return null;
        }
        var normalized = value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }
}
