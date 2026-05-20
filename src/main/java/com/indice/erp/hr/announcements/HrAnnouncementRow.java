package com.indice.erp.hr.announcements;

import java.time.LocalDateTime;

record HrAnnouncementRow(
    long id,
    String title,
    String type,
    String audienceType,
    String status,
    LocalDateTime scheduledFor,
    LocalDateTime publishedAt,
    LocalDateTime createdAt,
    String content,
    String authorName
) {
}
