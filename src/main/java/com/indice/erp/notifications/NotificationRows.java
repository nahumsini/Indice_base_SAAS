package com.indice.erp.notifications;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;

final class NotificationRows {

    private NotificationRows() {
    }

    static NotificationRow map(ResultSet rs) throws SQLException {
        return new NotificationRow(
            rs.getLong("id"),
            rs.getLong("announcement_id"),
            rs.getString("title"),
            rs.getString("content"),
            rs.getString("announcement_type"),
            rs.getString("delivery_status"),
            time(rs, "delivered_at"),
            time(rs, "read_at"),
            time(rs, "published_at"),
            time(rs, "created_at")
        );
    }

    private static LocalDateTime time(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
