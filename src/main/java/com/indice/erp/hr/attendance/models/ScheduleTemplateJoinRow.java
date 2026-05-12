package com.indice.erp.hr.attendance.models;

import java.time.LocalTime;


public record ScheduleTemplateJoinRow(
    long templateId,
    String templateName,
    String templateStatus,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    Integer dayOfWeek,
    LocalTime startTime,
    LocalTime endTime,
    Integer mealMinutes,
    Integer restMinutes,
    Integer lateAfterMinutes,
    Boolean isRestDay
) {
}
