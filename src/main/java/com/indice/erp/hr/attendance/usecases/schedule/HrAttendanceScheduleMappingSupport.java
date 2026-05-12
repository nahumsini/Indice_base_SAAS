package com.indice.erp.hr.attendance.usecases.schedule;

import com.indice.erp.hr.attendance.models.ScheduleRule;
import com.indice.erp.hr.attendance.models.ScheduleTemplateDayDefinition;
import com.indice.erp.hr.attendance.models.WorkSiteAssignmentRow;
import com.indice.erp.hr.attendance.usecases.kiosk.HrAttendanceKioskScopeSupport;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.isOvernightSchedule;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseBoolean;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseTime;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseInteger;


public abstract class HrAttendanceScheduleMappingSupport extends HrAttendanceKioskScopeSupport {

    protected HrAttendanceScheduleMappingSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected Map<String, Object> toWorkSiteAssignmentMap(WorkSiteAssignmentRow assignment) {
        if (assignment == null) {
            return null;
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("id", assignment.id());
        body.put("user_company_id", assignment.userCompanyId());
        body.put("location_id", assignment.location().id());
        body.put("location_name", assignment.location().name());
        body.put("location", toLocationMap(assignment.location()));
        body.put("effective_start_date", assignment.effectiveStartDate().toString());
        body.put("effective_end_date", assignment.effectiveEndDate() == null ? null : assignment.effectiveEndDate().toString());
        body.put("status", assignment.status());
        return body;
    }

    protected Map<String, Object> toScheduleRuleMap(ScheduleRule rule) {
        var body = new LinkedHashMap<String, Object>();
        body.put("template_id", rule.templateId());
        body.put("schedule_mode", rule.scheduleMode());
        body.put("block_after_grace_period", false);
        body.put("enforce_location", rule.enforceLocation());
        body.put("location_id", rule.locationId());
        body.put("location_name", rule.locationName());
        body.put("start_time", rule.startTime() == null ? null : rule.startTime().toString());
        body.put("end_time", rule.endTime() == null ? null : rule.endTime().toString());
        body.put("meal_minutes", rule.mealMinutes());
        body.put("rest_minutes", rule.restMinutes());
        body.put("late_after_minutes", rule.lateAfterMinutes());
        body.put("is_rest_day", rule.isRestDay());
        body.put("is_overnight", isOvernightSchedule(rule));
        return body;
    }

    protected Map<String, Object> toTemplateDayMap(ScheduleTemplateDayDefinition day) {
        var body = new LinkedHashMap<String, Object>();
        body.put("day_of_week", day.dayOfWeek());
        body.put("start_time", day.startTime() == null ? null : day.startTime().toString());
        body.put("end_time", day.endTime() == null ? null : day.endTime().toString());
        body.put("meal_minutes", day.mealMinutes());
        body.put("rest_minutes", day.restMinutes());
        body.put("late_after_minutes", day.lateAfterMinutes());
        body.put("is_rest_day", day.isRestDay());
        return body;
    }

    protected List<ScheduleTemplateDayDefinition> parseTemplateDays(Map<String, Object> payload, String scheduleMode) {
        payload = normalizePayload(payload);
        var rawDays = payload.get("days");
        if (!(rawDays instanceof List<?> daysList) || daysList.isEmpty()) {
            throw new IllegalArgumentException("days is required.");
        }

        var definitions = new ArrayList<ScheduleTemplateDayDefinition>();
        var seenDayNumbers = new HashMap<Integer, Boolean>();

        for (var rawDay : daysList) {
            if (!(rawDay instanceof Map<?, ?> rawMap)) {
                throw new IllegalArgumentException("Each days entry must be an object.");
            }

            var normalizedDay = new LinkedHashMap<String, Object>();
            rawMap.forEach((key, value) -> normalizedDay.put(String.valueOf(key), value));

            var dayOfWeek = HrPayloadUtils.parseInteger(normalizedDay, "day_of_week");
            if (dayOfWeek == null || dayOfWeek < DayOfWeek.MONDAY.getValue() || dayOfWeek > DayOfWeek.SUNDAY.getValue()) {
                throw new IllegalArgumentException("day_of_week must be between 1 and 7.");
            }
            if (seenDayNumbers.putIfAbsent(dayOfWeek, Boolean.TRUE) != null) {
                throw new IllegalArgumentException("Only one rule is allowed per template day.");
            }

            var isRestDay = parseBoolean(normalizedDay, "is_rest_day");
            var startTime = parseTime(normalizedDay, "start_time");
            var endTime = parseTime(normalizedDay, "end_time");
            var mealMinutes = HrPayloadUtils.parseInteger(normalizedDay, "meal_minutes", "comida", "meal");
            var restMinutes = HrPayloadUtils.parseInteger(normalizedDay, "rest_minutes", "descanso", "rest");
            var lateAfterMinutes = HrPayloadUtils.parseInteger(normalizedDay, "late_after_minutes");
            if (lateAfterMinutes == null || lateAfterMinutes < 0) {
                throw new IllegalArgumentException("late_after_minutes must be zero or greater.");
            }
            mealMinutes = mealMinutes == null ? 0 : mealMinutes;
            restMinutes = restMinutes == null ? 0 : restMinutes;
            if (mealMinutes < 0) {
                throw new IllegalArgumentException("meal_minutes must be zero or greater.");
            }
            if (restMinutes < 0) {
                throw new IllegalArgumentException("rest_minutes must be zero or greater.");
            }

            var requiresTimes = !"open".equals(scheduleMode) && !isRestDay;
            if (requiresTimes) {
                if (startTime == null || endTime == null) {
                    throw new IllegalArgumentException("start_time and end_time are required when is_rest_day is false.");
                }
                if (endTime.equals(startTime)) {
                    throw new IllegalArgumentException("end_time cannot equal start_time.");
                }
            } else if ("open".equals(scheduleMode) && !isRestDay) {
                if (startTime != null || endTime != null) {
                    throw new IllegalArgumentException("start_time and end_time are not allowed for open schedule days.");
                }
            } else {
                if (isRestDay) {
                    startTime = null;
                    endTime = null;
                }
            }

            definitions.add(new ScheduleTemplateDayDefinition(dayOfWeek, startTime, endTime, mealMinutes, restMinutes, lateAfterMinutes, isRestDay));
        }

        return definitions.stream()
            .sorted(Comparator.comparingInt(ScheduleTemplateDayDefinition::dayOfWeek))
            .toList();
    }

    protected String normalizeScheduleMode(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "strict", "horario estricto", "strict_schedule" -> "strict";
            case "open", "horario abierto", "open_schedule" -> "open";
            default -> throw new IllegalArgumentException("schedule_mode must be strict or open.");
        };
    }
}
