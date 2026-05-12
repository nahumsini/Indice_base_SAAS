package com.indice.erp.hr.attendance.models;

import java.util.List;


public record ScheduleTemplateDefinition(
    long templateId,
    String templateName,
    String status,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    List<ScheduleTemplateDayDefinition> days
) {
}
