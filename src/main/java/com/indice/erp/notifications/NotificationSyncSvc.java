package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class NotificationSyncSvc {

    private final JdbcTemplate jdbcTemplate;

    NotificationSyncSvc(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    void syncVisible(HrAnnouncementActor actor) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_announcement_deliveries
                (company_id, announcement_id, user_company_id)
                SELECT DISTINCT a.company_id, a.id, ?
                FROM hr_announcements a
                LEFT JOIN hr_announcement_targets t ON t.announcement_id = a.id
                WHERE a.company_id = ?
                  AND a.deleted_at IS NULL
                  AND LOWER(COALESCE(a.status, 'draft')) = 'published'
                  AND (
                    LOWER(COALESCE(a.audience_type, 'all')) = 'all'
                    OR (LOWER(a.audience_type) = 'employees' AND t.target_type = 'employee' AND t.target_value = ?)
                    OR (LOWER(a.audience_type) = 'units' AND t.target_type = 'unit' AND t.target_value = ?)
                    OR (LOWER(a.audience_type) = 'departments' AND t.target_type = 'department' AND LOWER(TRIM(t.target_value)) = LOWER(TRIM(?)))
                  )
                ON DUPLICATE KEY UPDATE
                  status = CASE
                    WHEN hr_announcement_deliveries.dismissed_at IS NOT NULL THEN hr_announcement_deliveries.status
                    WHEN hr_announcement_deliveries.read_at IS NULL THEN 'delivered'
                    ELSE 'read'
                  END
                """,
            actor.userCompanyId(),
            actor.companyId(),
            String.valueOf(actor.userCompanyId()),
            actor.unitTargetValue(),
            actor.normalizedDepartment()
        );
    }
}
