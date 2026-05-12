package com.indice.erp.hr.attendance.models;

import java.time.LocalTime;


public record ScheduleTemplateDayDefinition(
    int dayOfWeek,
    LocalTime startTime,
    LocalTime endTime,
    int mealMinutes,
    int restMinutes,
    int lateAfterMinutes,
    boolean isRestDay
) {
}
