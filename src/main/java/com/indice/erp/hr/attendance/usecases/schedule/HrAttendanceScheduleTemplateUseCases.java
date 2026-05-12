package com.indice.erp.hr.attendance.usecases.schedule;

import com.indice.erp.hr.attendance.usecases.locations.HrAttendanceLocationDeleteUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.sql.Types;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.support.AttendanceInput.parseBoolean;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendanceScheduleTemplateUseCases extends HrAttendanceLocationDeleteUseCases {

    protected HrAttendanceScheduleTemplateUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> listScheduleTemplates(long companyId) {
        var templates = loadScheduleTemplates(companyId);
        var assignedCountsByTemplate = loadActiveAssignmentCountsByTemplate(companyId);

        var body = new LinkedHashMap<String, Object>();
        body.put("items", templates.stream().map((template) -> {
            var item = new LinkedHashMap<String, Object>();
            item.put("id", template.templateId());
            item.put("name", displayScheduleTemplateName(template.templateName()));
            item.put("status", template.status());
            item.put("schedule_mode", template.scheduleMode());
            item.put("block_after_grace_period", false);
            item.put("enforce_location", template.enforceLocation());
            item.put("location_id", template.locationId());
            item.put("location_name", template.locationName());
            item.put("users_assigned_count", assignedCountsByTemplate.getOrDefault(template.templateId(), 0));
            item.put("days", template.days().stream().map(this::toTemplateDayMap).toList());
            return item;
        }).toList());
        return body;
    }

    @Transactional
    public Map<String, Object> saveScheduleTemplate(long companyId, long userId, Long templateId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var name = stringValue(payload, "name", "nombre");
        if (name.isBlank()) {
            throw new IllegalArgumentException("name is required.");
        }

        var status = normalizeManagedStatus(stringValue(payload, "status"));
        var scheduleMode = normalizeScheduleMode(stringValue(payload, "schedule_mode", "mode", "way"));
        var blockAfterGracePeriod = false;
        var enforceLocation = parseBoolean(payload, "enforce_location")
            || parseBoolean(payload, "restrict_to_location")
            || parseBoolean(payload, "no_permitir_fuera_ubicacion");
        var locationId = normalizeOptionalForeignKey(parseLong(payload, "location_id", "allowed_location_id", "ubicacion_id"));
        if (enforceLocation && locationId == null) {
            throw new IllegalArgumentException("location_id is required when enforce_location is enabled.");
        }
        if (locationId != null) {
            loadLocation(companyId, locationId);
        }

        var days = parseTemplateDays(payload, scheduleMode);
        ensureUniqueTemplateName(companyId, templateId, name);

        if (templateId == null || templateId <= 0) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO attendance_schedule_templates
                        (company_id, name, status, schedule_mode, block_after_grace_period, enforce_location, location_id, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                statement.setString(2, name);
                statement.setString(3, status);
                statement.setString(4, scheduleMode);
                statement.setBoolean(5, blockAfterGracePeriod);
                statement.setBoolean(6, enforceLocation);
                if (locationId == null) {
                    statement.setNull(7, Types.BIGINT);
                } else {
                    statement.setLong(7, locationId);
                }
                statement.setLong(8, userId);
                return statement;
            }, keyHolder);
            templateId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        } else {
            var updated = jdbcTemplate.update(
                """
                    UPDATE attendance_schedule_templates
                    SET name = ?,
                        status = ?,
                        schedule_mode = ?,
                        block_after_grace_period = ?,
                        enforce_location = ?,
                        location_id = ?
                    WHERE id = ? AND company_id = ?
                    """,
                name,
                status,
                scheduleMode,
                blockAfterGracePeriod,
                enforceLocation,
                locationId,
                templateId,
                companyId
            );
            if (updated == 0) {
                throw new NoSuchElementException("Schedule template not found.");
            }

            jdbcTemplate.update("DELETE FROM attendance_schedule_template_days WHERE template_id = ?", templateId);
        }

        for (var day : days) {
            jdbcTemplate.update(
                """
                    INSERT INTO attendance_schedule_template_days
                    (template_id, day_of_week, start_time, end_time, meal_minutes, rest_minutes, late_after_minutes, is_rest_day)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                templateId,
                day.dayOfWeek(),
                day.startTime() == null ? null : day.startTime(),
                day.endTime() == null ? null : day.endTime(),
                day.mealMinutes(),
                day.restMinutes(),
                day.lateAfterMinutes(),
                day.isRestDay()
            );
        }

        return Map.of("template", loadScheduleTemplateMap(companyId, templateId));
    }

    protected void ensureUniqueTemplateName(long companyId, Long templateId, String name) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM attendance_schedule_templates
                WHERE company_id = ?
                  AND LOWER(name) = LOWER(?)
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            name,
            templateId,
            templateId
        );

        if (count != null && count > 0) {
            throw new IllegalArgumentException("Schedule template name must be unique.");
        }
    }
}
