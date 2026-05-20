package com.indice.erp.hr.announcements;

import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AnnVisSvc {

    private final JdbcTemplate jdbcTemplate;

    public AnnVisSvc(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void requireVisible(HrAnnouncementActor actor, long announcementId) {
        if (!isVisible(actor, announcementId)) {
            throw new NoSuchElementException("Announcement not found.");
        }
    }

    public void requireCompanyAnnouncement(long companyId, long announcementId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_announcements
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            Integer.class,
            companyId,
            announcementId
        );
        if (count == null || count == 0) {
            throw new NoSuchElementException("Announcement not found.");
        }
    }

    private boolean isVisible(HrAnnouncementActor actor, long announcementId) {
        if (actor.managementAccess()) {
            requireCompanyAnnouncement(actor.companyId(), announcementId);
            return true;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(DISTINCT a.id)
                FROM hr_announcements a
                LEFT JOIN hr_announcement_targets t ON t.announcement_id = a.id
                WHERE a.company_id = ?
                  AND a.id = ?
                  AND a.deleted_at IS NULL
                  AND LOWER(COALESCE(a.status, 'draft')) = 'published'
                  AND (
                    LOWER(COALESCE(a.audience_type, 'all')) = 'all'
                    OR (LOWER(a.audience_type) = 'employees' AND t.target_type = 'employee' AND t.target_value = ?)
                    OR (LOWER(a.audience_type) = 'units' AND t.target_type = 'unit' AND t.target_value = ?)
                    OR (LOWER(a.audience_type) = 'departments' AND t.target_type = 'department' AND LOWER(TRIM(t.target_value)) = LOWER(TRIM(?)))
                  )
                """,
            Integer.class,
            actor.companyId(),
            announcementId,
            String.valueOf(actor.userCompanyId()),
            actor.unitTargetValue(),
            actor.normalizedDepartment()
        );
        return count != null && count > 0;
    }
}
