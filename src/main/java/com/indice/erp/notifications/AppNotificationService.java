package com.indice.erp.notifications;

import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppNotificationService {

    private final JdbcTemplate jdbcTemplate;

    public AppNotificationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void publish(AppNotificationEvent event) {
        if (event == null || event.recipientUserCompanyId() <= 0 || isBlank(event.eventKey()) || isBlank(event.title())) {
            return;
        }

        jdbcTemplate.update(
            """
                INSERT INTO app_notifications
                (company_id, recipient_user_company_id, source_module, source_type, source_id,
                 event_type, event_key, title, description, action_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  title = VALUES(title),
                  description = VALUES(description),
                  action_url = VALUES(action_url),
                  dismissed_at = NULL,
                  dismissed_by = NULL,
                  status = CASE
                    WHEN read_at IS NULL THEN 'delivered'
                    ELSE status
                  END
                """,
            event.companyId(),
            event.recipientUserCompanyId(),
            safe(event.sourceModule(), "general"),
            safe(event.sourceType(), "record"),
            event.sourceId(),
            safe(event.eventType(), "general"),
            event.eventKey().trim(),
            event.title().trim(),
            event.description(),
            event.actionUrl()
        );
    }

    public Long userCompanyIdForUser(long companyId, Long userId) {
        if (userId == null || userId <= 0) {
            return null;
        }
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM user_companies
                WHERE company_id = ?
                  AND user_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                ORDER BY id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId,
            userId
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private String safe(String value, String fallback) {
        var normalized = Objects.toString(value, "").trim();
        return normalized.isBlank() ? fallback : normalized;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}
