package com.indice.erp.hr.attendance.models;

import java.time.LocalDate;
import java.time.LocalTime;


public record ScheduleWindow(
    long templateId,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    int dayOfWeek,
    LocalTime startTime,
    LocalTime endTime,
    int mealMinutes,
    int restMinutes,
    int lateAfterMinutes,
    boolean isRestDay
) {
}
