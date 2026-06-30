package com.indice.erp.processTasks.tasks.domain;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TaskMutationRecord(
    long id,
    Long assignedUserCompanyId,
    String status,
    LocalDateTime startedAt,
    LocalDateTime completedAt,
    LocalDateTime cancelledAt,
    Long completedByUserId,
    Long completedByUserCompanyId,
    String completionNotes,
    LocalDate startDate,
    String notes,
    Integer completionPercent,
    Integer weighting,
    boolean audited,
    String auditNotes,
    LocalDateTime auditedAt,
    Long auditedByUserCompanyId
) {
}
