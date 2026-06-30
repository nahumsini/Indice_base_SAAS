package com.indice.erp.notifications;

public record AppNotificationEvent(
    long companyId,
    long recipientUserCompanyId,
    String sourceModule,
    String sourceType,
    Long sourceId,
    String eventType,
    String eventKey,
    String title,
    String description,
    String actionUrl
) {
}
