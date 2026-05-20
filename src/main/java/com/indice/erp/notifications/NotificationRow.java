package com.indice.erp.notifications;

import java.time.LocalDateTime;

record NotificationRow(
    long id,
    long announcementId,
    String title,
    String content,
    String announcementType,
    String status,
    LocalDateTime deliveredAt,
    LocalDateTime readAt,
    LocalDateTime publishedAt,
    LocalDateTime createdAt
) {
}
