package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import com.indice.erp.hr.announcements.HrAnnouncementPublisher;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class NotificationQueryService {

    private final JdbcTemplate jdbcTemplate;
    private final HrAnnouncementPublisher publisher;
    private final NotificationSyncSvc syncSvc;
    private final OperationalNotificationSyncService operationalSyncService;
    private final NotificationResponseFactory responseFactory;

    NotificationQueryService(
        JdbcTemplate jdbcTemplate,
        HrAnnouncementPublisher publisher,
        NotificationSyncSvc syncSvc,
        OperationalNotificationSyncService operationalSyncService,
        NotificationResponseFactory responseFactory
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.publisher = publisher;
        this.syncSvc = syncSvc;
        this.operationalSyncService = operationalSyncService;
        this.responseFactory = responseFactory;
    }

    Map<String, Object> list(HrAnnouncementActor actor) {
        publisher.publishDueAnnouncements();
        syncSvc.syncVisible(actor);
        syncSvc.syncProcessTaskSignals(actor);
        operationalSyncService.sync(actor);

        var items = new ArrayList<Map<String, Object>>();
        items.addAll(jdbcTemplate.query(sql() + " ORDER BY d.delivered_at DESC, d.id DESC LIMIT 50",
            (rs, rowNum) -> NotificationRows.map(rs),
            actor.companyId(),
            actor.userCompanyId()
        ).stream().map(responseFactory::item).toList());
        items.addAll(jdbcTemplate.query(appSql() + " ORDER BY created_at DESC, id DESC LIMIT 50",
            (rs, rowNum) -> mapAppNotification(rs),
            actor.companyId(),
            actor.userCompanyId()
        ).stream().map(responseFactory::appItem).toList());

        var sortedItems = items.stream()
            .sorted(Comparator.comparing(
                item -> parseCreatedAt(item.get("created_at")),
                Comparator.nullsLast(Comparator.reverseOrder())
            ))
            .limit(50)
            .toList();

        return responseFactory.combinedListBody(sortedItems);
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

    Map<String, Object> loadOneApp(HrAnnouncementActor actor, long appNotificationId) {
        var rows = jdbcTemplate.query(appSql() + " AND id = ?",
            (rs, rowNum) -> mapAppNotification(rs),
            actor.companyId(),
            actor.userCompanyId(),
            appNotificationId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Notification not found.");
        }
        return responseFactory.appItem(rows.getFirst());
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

    private String appSql() {
        return """
            SELECT id,
                   source_module,
                   source_type,
                   source_id,
                   event_type,
                   title,
                   description,
                   status,
                   read_at,
                   created_at,
                   action_url
            FROM app_notifications
            WHERE company_id = ?
              AND recipient_user_company_id = ?
              AND dismissed_at IS NULL
              AND LOWER(COALESCE(status, 'delivered')) NOT IN ('cancelled', 'dismissed')
            """;
    }

    private AppNotificationRow mapAppNotification(ResultSet rs) throws SQLException {
        return new AppNotificationRow(
            rs.getLong("id"),
            rs.getString("source_module"),
            rs.getString("source_type"),
            rs.getObject("source_id", Long.class),
            rs.getString("event_type"),
            rs.getString("title"),
            rs.getString("description"),
            rs.getString("status"),
            time(rs, "read_at"),
            time(rs, "created_at"),
            rs.getString("action_url")
        );
    }

    private LocalDateTime time(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private LocalDateTime parseCreatedAt(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return LocalDateTime.parse(String.valueOf(value));
        } catch (RuntimeException ignored) {
            return null;
        }
    }
}
