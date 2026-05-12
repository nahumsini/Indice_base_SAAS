package com.indice.erp.hr.attendance.models;

import java.time.LocalTime;


public record ScheduleRule(
    long userCompanyId,
    long templateId,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    LocalTime startTime,
    LocalTime endTime,
    int mealMinutes,
    int restMinutes,
    int lateAfterMinutes,
    boolean isRestDay
) {
}
