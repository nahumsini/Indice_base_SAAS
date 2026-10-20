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
        if (notificationId < 0) queryService.loadOneApp(actor, Math.abs(notificationId));
        else queryService.loadOne(actor, notificationId);
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
        int[] updated = {0};
        queryService.visitVisible(actor, Integer.MAX_VALUE, item -> {
            if (Boolean.TRUE.equals(item.get("is_unread"))) {
                markRead(actor, ((Number)item.get("id")).longValue());
                updated[0]++;
            }
        });
        return Map.of("updated_count", updated[0]);
    }

    @Transactional
    Map<String, Object> dismiss(HrAnnouncementActor actor, long notificationId) {
        if (notificationId < 0) queryService.loadOneApp(actor, Math.abs(notificationId));
        else queryService.loadOne(actor, notificationId);
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
