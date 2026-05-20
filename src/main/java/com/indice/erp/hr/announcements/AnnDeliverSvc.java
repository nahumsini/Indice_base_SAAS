package com.indice.erp.hr.announcements;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnDeliverSvc {

    private final JdbcTemplate jdbcTemplate;

    public AnnDeliverSvc(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void sync(long companyId, long announcementId) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_announcement_deliveries
                (company_id, announcement_id, user_company_id)
                SELECT DISTINCT a.company_id, a.id, uc.id
                FROM hr_announcements a
                JOIN user_companies uc
                  ON uc.company_id = a.company_id
                 AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                LEFT JOIN user_work_profiles wp
                  ON wp.company_id = uc.company_id
                 AND wp.user_company_id = uc.id
                 AND LOWER(COALESCE(wp.status, 'active')) IN ('active', 'activo')
                LEFT JOIN hr_announcement_targets t ON t.announcement_id = a.id
                WHERE a.company_id = ?
                  AND a.id = ?
                  AND a.deleted_at IS NULL
                  AND LOWER(COALESCE(a.status, 'draft')) = 'published'
                  AND (
                    LOWER(COALESCE(a.audience_type, 'all')) = 'all'
                    OR (LOWER(a.audience_type) = 'employees' AND t.target_type = 'employee' AND t.target_value = CAST(uc.id AS CHAR))
                    OR (LOWER(a.audience_type) = 'units' AND t.target_type = 'unit' AND t.target_value = CAST(wp.unit_id AS CHAR))
                    OR (LOWER(a.audience_type) = 'departments' AND t.target_type = 'department' AND LOWER(TRIM(t.target_value)) = LOWER(TRIM(wp.department)))
                  )
                ON DUPLICATE KEY UPDATE
                  status = CASE
                    WHEN hr_announcement_deliveries.dismissed_at IS NOT NULL THEN hr_announcement_deliveries.status
                    WHEN hr_announcement_deliveries.read_at IS NULL THEN 'delivered'
                    ELSE 'read'
                  END
                """,
            companyId,
            announcementId
        );
    }

    public void syncAll(List<PublishedAnn> announcements) {
        for (var announcement : announcements) {
            sync(announcement.companyId(), announcement.id());
        }
    }

    public void cancel(long companyId, long announcementId) {
        jdbcTemplate.update(
            """
                UPDATE hr_announcement_deliveries
                SET status = 'cancelled'
                WHERE company_id = ?
                  AND announcement_id = ?
                """,
            companyId,
            announcementId
        );
    }

    public record PublishedAnn(long id, long companyId) {
    }
}
