package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import com.indice.erp.hr.announcements.HrAnnouncementPublisher;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class NotificationQueryService {

    private final JdbcTemplate jdbcTemplate;
    private final HrAnnouncementPublisher publisher;
    private final NotificationSyncSvc syncSvc;
    private final NotificationResponseFactory responseFactory;

    NotificationQueryService(
        JdbcTemplate jdbcTemplate,
        HrAnnouncementPublisher publisher,
        NotificationSyncSvc syncSvc,
        NotificationResponseFactory responseFactory
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.publisher = publisher;
        this.syncSvc = syncSvc;
        this.responseFactory = responseFactory;
    }

    Map<String, Object> list(HrAnnouncementActor actor) {
        publisher.publishDueAnnouncements();
        syncSvc.syncVisible(actor);
        return responseFactory.listBody(jdbcTemplate.query(sql() + " ORDER BY d.delivered_at DESC, d.id DESC LIMIT 50",
            (rs, rowNum) -> NotificationRows.map(rs),
            actor.companyId(),
            actor.userCompanyId()
        ));
    }

    Map<String, Object> loadOne(HrAnnouncementActor actor, long notificationId) {
        var rows = jdbcTemplate.query(sql() + " AND d.id = ?",
            (rs, rowNum) -> NotificationRows.map(rs),
            actor.companyId(),
            actor.userCompanyId(),
            notificationId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Notification not found.");
        }
        return responseFactory.item(rows.getFirst());
    }

    private String sql() {
        return """
            SELECT d.id,
                   d.announcement_id,
                   a.title,
                   a.content,
                   a.announcement_type,
                   d.status AS delivery_status,
                   d.delivered_at,
                   d.read_at,
                   a.published_at,
                   a.created_at
            FROM hr_announcement_deliveries d
            JOIN hr_announcements a ON a.id = d.announcement_id AND a.company_id = d.company_id
            WHERE d.company_id = ?
              AND d.user_company_id = ?
              AND d.dismissed_at IS NULL
              AND LOWER(COALESCE(d.status, 'delivered')) NOT IN ('cancelled', 'dismissed')
              AND a.deleted_at IS NULL
              AND LOWER(COALESCE(a.status, 'draft')) = 'published'
            """;
    }
}
