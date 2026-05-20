package com.indice.erp.hr.announcements;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnDeleteSvc {

    private final JdbcTemplate jdbcTemplate;
    private final AnnDeliverSvc deliverSvc;

    public AnnDeleteSvc(JdbcTemplate jdbcTemplate, AnnDeliverSvc deliverSvc) {
        this.jdbcTemplate = jdbcTemplate;
        this.deliverSvc = deliverSvc;
    }

    @Transactional
    public Map<String, Object> delete(HrAnnouncementActor actor, long announcementId) {
        var updated = jdbcTemplate.update(
            """
                UPDATE hr_announcements
                SET deleted_at = CURRENT_TIMESTAMP,
                    deleted_by = ?
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            actor.userId(),
            actor.companyId(),
            announcementId
        );
        if (updated == 0) {
            throw new java.util.NoSuchElementException("Announcement not found.");
        }
        deliverSvc.cancel(actor.companyId(), announcementId);
        return Map.of("success", true);
    }
}
