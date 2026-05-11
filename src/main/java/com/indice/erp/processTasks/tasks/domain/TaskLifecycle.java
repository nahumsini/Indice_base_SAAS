package com.indice.erp.processTasks.tasks.domain;

import java.time.LocalDateTime;

public record TaskLifecycle(
    LocalDateTime startedAt,
    LocalDateTime completedAt,
    LocalDateTime cancelledAt,
    Long completedByUserId,
    Long completedByUserCompanyId,
    String completionNotes
) {
}
