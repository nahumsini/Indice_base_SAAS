package com.indice.erp.notifications;

import java.time.LocalDateTime;

record AppNotificationRow(
    long id,
    String sourceModule,
    String sourceType,
    Long sourceId,
    String eventType,
    String title,
    String description,
    String status,
    LocalDateTime readAt,
    LocalDateTime createdAt,
    String actionUrl
) {
}
