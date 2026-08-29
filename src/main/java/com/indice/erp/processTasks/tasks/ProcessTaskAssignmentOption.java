package com.indice.erp.processTasks.tasks;

public record ProcessTaskAssignmentOption(
    long userCompanyId,
    long userId,
    String name,
    Long unitId,
    String unitName,
    Long businessId,
    String businessName
) {
}
