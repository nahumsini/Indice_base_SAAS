package com.indice.erp.hr.announcements;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;

final class HrAnnouncementRows {

    private HrAnnouncementRows() {
    }

    static HrAnnouncementRow map(ResultSet rs) throws SQLException {
        return new HrAnnouncementRow(
            rs.getLong("id"),
            rs.getString("title"),
            rs.getString("announcement_type"),
            rs.getString("audience_type"),
            rs.getString("status"),
            toLocalDateTime(rs.getTimestamp("scheduled_for")),
            toLocalDateTime(rs.getTimestamp("published_at")),
            toLocalDateTime(rs.getTimestamp("created_at")),
            rs.getString("content"),
            rs.getString("author_name")
        );
    }

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
