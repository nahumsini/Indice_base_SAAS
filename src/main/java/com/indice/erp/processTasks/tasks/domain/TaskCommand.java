package com.indice.erp.processTasks.tasks.domain;

import java.time.LocalDate;

public record TaskCommand(
    String title,
    String description,
    Long processId,
    Long projectId,
    Long assignedUserCompanyId,
    String assignedName,
    String status,
    String priority,
    LocalDate startDate,
    LocalDate dueDate,
    String notes,
    Integer completionPercent,
    Integer weighting,
    Boolean audited,
    String auditNotes,
    Long businessId,
    Long unitId
) {
}
