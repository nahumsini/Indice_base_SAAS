package com.indice.erp.auth;

import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class LoginAuditService {

    private final JdbcTemplate jdbcTemplate;
    private final boolean enabled;

    @Autowired
    public LoginAuditService(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, true);
    }

    private LoginAuditService(JdbcTemplate jdbcTemplate, boolean enabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.enabled = enabled;
    }

    static LoginAuditService noop() {
        return new LoginAuditService(null, false);
    }

    public void record(
        String email,
        Long userId,
        Long companyId,
        String role,
        boolean success,
        String failureReason,
        LoginAuditContext context
    ) {
        if (!enabled || jdbcTemplate == null) {
            return;
        }
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO user_login_audit
                        (email, user_id, company_id, role, success, failure_reason, ip_address, user_agent, session_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                clean(email, 255),
                userId,
                companyId,
                clean(role, 64),
                success ? 1 : 0,
                success ? null : clean(failureReason, 255),
                clean(context == null ? "" : context.ipAddress(), 64),
                clean(context == null ? "" : context.userAgent(), 512),
                clean(context == null ? "" : context.sessionId(), 128)
            );
        } catch (DataAccessException ignored) {
            // Audit must never block login in older local schemas or test doubles.
        }
    }

    private String clean(String value, int maxLength) {
        var cleaned = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ").trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }
}
