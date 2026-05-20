package com.indice.erp.hr.announcements;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAnnouncementPublisher {

    private final JdbcTemplate jdbcTemplate;
    private final AnnDeliverSvc deliverSvc;

    public HrAnnouncementPublisher(JdbcTemplate jdbcTemplate, AnnDeliverSvc deliverSvc) {
        this.jdbcTemplate = jdbcTemplate;
        this.deliverSvc = deliverSvc;
    }

    public int publishDueAnnouncements() {
        var due = jdbcTemplate.query(
            """
                SELECT id, company_id
                FROM hr_announcements
                WHERE LOWER(COALESCE(status, 'draft')) = 'scheduled'
                  AND scheduled_for IS NOT NULL
                  AND scheduled_for <= CURRENT_TIMESTAMP
                  AND deleted_at IS NULL
                """,
            (rs, rowNum) -> new AnnDeliverSvc.PublishedAnn(
                rs.getLong("id"),
                rs.getLong("company_id")
            )
        );
        var updated = jdbcTemplate.update(
            """
                UPDATE hr_announcements
                SET status = 'published',
                    published_at = COALESCE(published_at, CURRENT_TIMESTAMP)
                WHERE LOWER(COALESCE(status, 'draft')) = 'scheduled'
                  AND scheduled_for IS NOT NULL
                  AND scheduled_for <= CURRENT_TIMESTAMP
                  AND deleted_at IS NULL
                """
        );
        deliverSvc.syncAll(due);
        return updated;
    }
}
