package com.indice.erp.notifications;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class NotificationResponseFactory {

    Map<String, Object> listBody(List<NotificationRow> rows) {
        var unreadCount = rows.stream().filter(row -> row.readAt() == null).count();
        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows.stream().map(this::item).toList());
        body.put("summary", Map.of(
            "total_count", rows.size(),
            "unread_count", unreadCount
        ));
        return body;
    }

    Map<String, Object> combinedListBody(List<Map<String, Object>> items) {
        var unreadCount = items.stream().filter(item -> Boolean.TRUE.equals(item.get("is_unread"))).count();
        var body = new LinkedHashMap<String, Object>();
        body.put("items", items);
        body.put("summary", Map.of(
            "total_count", items.size(),
            "unread_count", unreadCount
        ));
        return body;
    }

    Map<String, Object> item(NotificationRow row) {
        var item = new LinkedHashMap<String, Object>();
        item.put("id", row.id());
        item.put("source_type", "announcement");
        item.put("source_id", row.announcementId());
        item.put("title", safe(row.title()));
        item.put("description", safe(row.content()));
        item.put("module_slug", "human_resources");
        item.put("source_subtype", normalize(row.announcementType(), "general"));
        item.put("status", normalize(row.status(), "delivered"));
        item.put("is_unread", row.readAt() == null);
        item.put("read_at", iso(row.readAt()));
        item.put("created_at", iso(first(row.deliveredAt(), row.publishedAt(), row.createdAt())));
        item.put("action_url", "/human-resources/announcements");
        return item;
    }

    Map<String, Object> appItem(AppNotificationRow row) {
        var item = new LinkedHashMap<String, Object>();
        item.put("id", -row.id());
        item.put("source_type", normalize(row.sourceType(), "record"));
        item.put("source_id", row.sourceId());
        item.put("title", safe(row.title()));
        item.put("description", safe(row.description()));
        item.put("module_slug", normalize(row.sourceModule(), "general"));
        item.put("source_subtype", normalize(row.eventType(), "general"));
        item.put("status", normalize(row.status(), "delivered"));
        item.put("is_unread", row.readAt() == null);
        item.put("read_at", iso(row.readAt()));
        item.put("created_at", iso(row.createdAt()));
        item.put("action_url", row.actionUrl());
        return item;
    }

    private LocalDateTime first(LocalDateTime... values) {
        for (var value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String iso(LocalDateTime value) {
        return value == null ? null : value.toString();
    }

    private String normalize(String value, String fallback) {
        var normalized = safe(value).trim().toLowerCase();
        return normalized.isBlank() ? fallback : normalized;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
