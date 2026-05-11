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
    LocalDate dueDate,
    Long businessId,
    Long unitId
) {
}
