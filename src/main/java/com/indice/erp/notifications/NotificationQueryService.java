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
import java.util.function.Consumer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class NotificationQueryService {

    private final JdbcTemplate jdbcTemplate;
    private final HrAnnouncementPublisher publisher;
    private final NotificationSyncSvc syncSvc;
    private final OperationalNotificationSyncService operationalSyncService;
    private final NotificationResponseFactory responseFactory;
    private final NotificationAccessService access;
    private final NotificationPreferencesService preferences;

    NotificationQueryService(
        JdbcTemplate jdbcTemplate,
        HrAnnouncementPublisher publisher,
        NotificationSyncSvc syncSvc,
        OperationalNotificationSyncService operationalSyncService,
        NotificationResponseFactory responseFactory,
        NotificationAccessService access,
        NotificationPreferencesService preferences
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.publisher = publisher;
        this.syncSvc = syncSvc;
        this.operationalSyncService = operationalSyncService;
        this.responseFactory = responseFactory;
        this.access = access;
        this.preferences = preferences;
    }

    Map<String, Object> list(HrAnnouncementActor actor) {
        var scope = access.scope(actor);
        if (scope.allowed("human_resources", "general")) {
            publisher.publishDueAnnouncements();
            syncSvc.syncVisible(actor);
        }
        if (scope.allowed("processes_tasks", "task_due_today")) syncSvc.syncProcessTaskSignals(actor);
        operationalSyncService.sync(actor);

        var items = new ArrayList<Map<String, Object>>();
        visitVisible(actor, 50, items::add);

        var sortedItems = items.stream()
            .sorted(Comparator.comparing(
                item -> parseCreatedAt(item.get("created_at")),
                Comparator.nullsLast(Comparator.reverseOrder())
            ))
            .limit(50)
            .toList();

        return responseFactory.combinedListBody(sortedItems);
    }

    /** Filter before the display limit, so muted or revoked rows cannot hide older allowed notices. */
    void visitVisible(HrAnnouncementActor actor, int perSourceLimit, Consumer<Map<String,Object>> visitor) {
        var scope = access.scope(actor);
        var saved = preferences.saved(actor);
        if (scope.allowed("human_resources", "general")) {
            int accepted=0;
            for (int offset=0; accepted<perSourceLimit; offset+=100) {
                var rows=jdbcTemplate.query(sql()+" ORDER BY d.delivered_at DESC, d.id DESC LIMIT 100 OFFSET ?",
                    (rs,n)->NotificationRows.map(rs),actor.companyId(),actor.userCompanyId(),offset);
                for (var row:rows) if (scope.announcement(row) && saved.shows("human_resources",row.announcementType())) {
                    visitor.accept(responseFactory.item(row));
                    if (++accepted==perSourceLimit) break;
                }
                if (rows.size()<100) break;
            }
        }
        int accepted=0;
        for (int offset=0; accepted<perSourceLimit; offset+=100) {
            var rows=jdbcTemplate.query(appSql()+" ORDER BY created_at DESC, id DESC LIMIT 100 OFFSET ?",
                (rs,n)->mapAppNotification(rs),actor.companyId(),actor.userCompanyId(),offset);
            for (var row:rows) if (scope.app(row) && saved.shows(row.sourceModule(),row.eventType())) {
                visitor.accept(responseFactory.appItem(row));
                if (++accepted==perSourceLimit) break;
            }
            if (rows.size()<100) break;
        }
    }

    Map<String, Object> loadOne(HrAnnouncementActor actor, long notificationId) {
        var rows = jdbcTemplate.query(sql() + " AND d.id = ?",
            (rs, rowNum) -> NotificationRows.map(rs),
            actor.companyId(),
            actor.userCompanyId(),
            notificationId
        );
        if (rows.isEmpty() || !access.scope(actor).announcement(rows.getFirst())) {
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
        if (rows.isEmpty() || !access.scope(actor).app(rows.getFirst())) {
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
