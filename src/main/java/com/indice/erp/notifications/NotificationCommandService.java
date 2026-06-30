package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.AnnReadSvc;
import com.indice.erp.hr.announcements.HrAnnouncementActor;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class NotificationCommandService {

    private final JdbcTemplate jdbcTemplate;
    private final AnnReadSvc readSvc;
    private final NotificationQueryService queryService;

    NotificationCommandService(JdbcTemplate jdbcTemplate, AnnReadSvc readSvc, NotificationQueryService queryService) {
        this.jdbcTemplate = jdbcTemplate;
        this.readSvc = readSvc;
        this.queryService = queryService;
    }

    @Transactional
    Map<String, Object> markRead(HrAnnouncementActor actor, long notificationId) {
        if (notificationId < 0) {
            var appNotificationId = Math.abs(notificationId);
            var updated = jdbcTemplate.update(
                """
                    UPDATE app_notifications
                    SET status = 'read',
                        read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
                    WHERE company_id = ?
                      AND recipient_user_company_id = ?
                      AND id = ?
                      AND dismissed_at IS NULL
                    """,
                actor.companyId(),
                actor.userCompanyId(),
                appNotificationId
            );
            if (updated == 0) {
                throw new NoSuchElementException("Notification not found.");
            }
            return queryService.loadOneApp(actor, appNotificationId);
        }

        var announcementId = announcementId(actor, notificationId);
        readSvc.markRead(actor, announcementId);
        return queryService.loadOne(actor, notificationId);
    }

    @Transactional
    Map<String, Object> markAllRead(HrAnnouncementActor actor) {
        var updated = jdbcTemplate.update(
            """
                UPDATE hr_announcement_deliveries
                SET status = 'read',
                    read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND dismissed_at IS NULL
                  AND read_at IS NULL
                  AND LOWER(COALESCE(status, 'delivered')) NOT IN ('cancelled', 'dismissed')
                """,
            actor.companyId(),
            actor.userCompanyId()
        );
        var appUpdated = jdbcTemplate.update(
            """
                UPDATE app_notifications
                SET status = 'read',
                    read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
                WHERE company_id = ?
                  AND recipient_user_company_id = ?
                  AND dismissed_at IS NULL
                  AND read_at IS NULL
                  AND LOWER(COALESCE(status, 'delivered')) NOT IN ('cancelled', 'dismissed')
                """,
            actor.companyId(),
            actor.userCompanyId()
        );
        jdbcTemplate.update(
            """
                INSERT INTO hr_announcement_reads
                (company_id, announcement_id, user_company_id, user_id)
                SELECT d.company_id, d.announcement_id, d.user_company_id, ?
                FROM hr_announcement_deliveries d
                JOIN hr_announcements a ON a.id = d.announcement_id AND a.company_id = d.company_id
                WHERE d.company_id = ?
                  AND d.user_company_id = ?
                  AND d.dismissed_at IS NULL
                  AND d.read_at IS NOT NULL
                  AND a.deleted_at IS NULL
                ON DUPLICATE KEY UPDATE read_at = read_at
                """,
            actor.userId(),
            actor.companyId(),
            actor.userCompanyId()
        );
        return Map.of("updated_count", updated + appUpdated);
    }

    @Transactional
    Map<String, Object> dismiss(HrAnnouncementActor actor, long notificationId) {
        if (notificationId < 0) {
            var updated = jdbcTemplate.update(
                """
                    UPDATE app_notifications
                    SET status = 'dismissed',
                        dismissed_at = CURRENT_TIMESTAMP,
                        dismissed_by = ?
                    WHERE company_id = ?
                      AND recipient_user_company_id = ?
                      AND id = ?
                      AND dismissed_at IS NULL
                    """,
                actor.userId(),
                actor.companyId(),
                actor.userCompanyId(),
                Math.abs(notificationId)
            );
            if (updated == 0) {
                throw new NoSuchElementException("Notification not found.");
            }
            return Map.of("success", true);
        }

        var updated = jdbcTemplate.update(
            """
                UPDATE hr_announcement_deliveries
                SET status = 'dismissed',
                    dismissed_at = CURRENT_TIMESTAMP,
                    dismissed_by = ?
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND id = ?
                  AND dismissed_at IS NULL
                """,
            actor.userId(),
            actor.companyId(),
            actor.userCompanyId(),
            notificationId
        );
        if (updated == 0) {
            throw new NoSuchElementException("Notification not found.");
        }
        return Map.of("success", true);
    }

    private long announcementId(HrAnnouncementActor actor, long notificationId) {
        var rows = jdbcTemplate.query(
            """
                SELECT announcement_id
                FROM hr_announcement_deliveries
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND id = ?
                  AND dismissed_at IS NULL
                  AND LOWER(COALESCE(status, 'delivered')) NOT IN ('cancelled', 'dismissed')
                """,
            (rs, rowNum) -> rs.getLong("announcement_id"),
            actor.companyId(),
            actor.userCompanyId(),
            notificationId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Notification not found.");
        }
        return rows.getFirst();
    }
}
