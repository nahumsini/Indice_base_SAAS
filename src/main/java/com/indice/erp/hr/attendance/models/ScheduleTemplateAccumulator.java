package com.indice.erp.hr.attendance.models;

import java.util.List;


public record ScheduleTemplateAccumulator(
    long templateId,
    String templateName,
    String templateStatus,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    List<ScheduleTemplateDayDefinition> days
) {
}
