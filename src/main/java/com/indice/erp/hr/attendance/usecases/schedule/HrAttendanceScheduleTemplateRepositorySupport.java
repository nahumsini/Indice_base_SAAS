package com.indice.erp.hr.attendance.usecases.schedule;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.attendance.models.ScheduleTemplateAccumulator;
import com.indice.erp.hr.attendance.models.ScheduleTemplateDayDefinition;
import com.indice.erp.hr.attendance.models.ScheduleTemplateDefinition;
import com.indice.erp.hr.attendance.models.ScheduleTemplateJoinRow;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


public abstract class HrAttendanceScheduleTemplateRepositorySupport extends HrAttendanceScheduleQuerySupport {

    protected HrAttendanceScheduleTemplateRepositorySupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected List<ScheduleTemplateDefinition> loadScheduleTemplates(long companyId) {
        return loadScheduleTemplates(companyId, HrOperationalScope.corporateOffice());
    }

    protected List<ScheduleTemplateDefinition> loadScheduleTemplates(long companyId, HrOperationalScope scope) {
        var normalizedScope = scope == null ? HrOperationalScope.corporateOffice() : scope;
        var sql = new StringBuilder(
            """
                SELECT t.id AS template_id,
                       t.name AS template_name,
                       COALESCE(LOWER(t.status), 'active') AS template_status,
                       COALESCE(LOWER(t.schedule_mode), 'strict') AS schedule_mode,
                       t.block_after_grace_period,
                       t.enforce_location,
                       t.location_id,
                       l.name AS location_name,
                       d.day_of_week,
                       d.start_time,
                       d.end_time,
                       d.meal_minutes,
                       d.rest_minutes,
                       d.late_after_minutes,
                       d.is_rest_day
                FROM attendance_schedule_templates t
                LEFT JOIN attendance_locations l ON l.id = t.location_id
                LEFT JOIN attendance_schedule_template_days d ON d.template_id = t.id
                WHERE t.company_id = ?
                """
        );
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        if (!normalizedScope.isCorporateOffice()) {
            sql.append(" AND (t.location_id IS NULL");
            sql.append(normalizedScope.assignmentPredicate("l.unit_id", "l.business_id", "l.company_id"));
            sql.append(")");
            parameters.addAll(normalizedScope.assignmentParameters());
        }
        sql.append(" ORDER BY t.name ASC, t.id ASC, d.day_of_week ASC");
        var rows = jdbcTemplate.query(
            sql.toString(),
            (rs, rowNum) -> new ScheduleTemplateJoinRow(
                rs.getLong("template_id"),
                safe(rs.getString("template_name")),
                safe(rs.getString("template_status")),
                safe(rs.getString("schedule_mode")),
                rs.getBoolean("block_after_grace_period"),
                rs.getBoolean("enforce_location"),
                getNullableLong(rs, "location_id"),
                safe(rs.getString("location_name")),
                rs.getObject("day_of_week", Integer.class),
                rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class),
                rs.getObject("meal_minutes", Integer.class),
                rs.getObject("rest_minutes", Integer.class),
                rs.getObject("late_after_minutes", Integer.class),
                rs.getObject("is_rest_day", Boolean.class)
            ),
            parameters.toArray()
        );

        var grouped = new LinkedHashMap<Long, ScheduleTemplateAccumulator>();
        for (var row : rows) {
            var accumulator = grouped.computeIfAbsent(
                row.templateId(),
                ignored -> new ScheduleTemplateAccumulator(
                    row.templateId(),
                    row.templateName(),
                    row.templateStatus(),
                    row.scheduleMode(),
                    row.blockAfterGracePeriod(),
                    row.enforceLocation(),
                    row.locationId(),
                    row.locationName(),
                    new ArrayList<>()
                )
            );

            if (row.dayOfWeek() != null) {
                accumulator.days().add(new ScheduleTemplateDayDefinition(
                    row.dayOfWeek(),
                    row.startTime(),
                    row.endTime(),
                    row.mealMinutes() == null ? 0 : row.mealMinutes(),
                    row.restMinutes() == null ? 0 : row.restMinutes(),
                    row.lateAfterMinutes() == null ? 0 : row.lateAfterMinutes(),
                    Boolean.TRUE.equals(row.isRestDay())
                ));
            }
        }

        return grouped.values().stream()
            .map((item) -> new ScheduleTemplateDefinition(
                item.templateId(),
                item.templateName(),
                item.templateStatus(),
                item.scheduleMode(),
                item.blockAfterGracePeriod(),
                item.enforceLocation(),
                item.locationId(),
                item.locationName(),
                List.copyOf(item.days())
            ))
            .toList();
    }

    protected ScheduleTemplateDefinition loadExistingTemplate(long companyId, long templateId) {
        return loadExistingTemplate(companyId, templateId, HrOperationalScope.corporateOffice());
    }

    protected ScheduleTemplateDefinition loadExistingTemplate(long companyId, long templateId, HrOperationalScope scope) {
        return loadScheduleTemplates(companyId, scope).stream()
            .filter((template) -> template.templateId() == templateId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Schedule template not found."));
    }

    protected Map<String, Object> loadScheduleTemplateMap(long companyId, long templateId) {
        return loadScheduleTemplateMap(companyId, templateId, HrOperationalScope.corporateOffice());
    }

    protected Map<String, Object> loadScheduleTemplateMap(long companyId, long templateId, HrOperationalScope scope) {
        var template = loadExistingTemplate(companyId, templateId, scope);
        var body = new LinkedHashMap<String, Object>();
        body.put("id", template.templateId());
        body.put("name", displayScheduleTemplateName(template.templateName()));
        body.put("status", template.status());
        body.put("schedule_mode", template.scheduleMode());
        body.put("block_after_grace_period", false);
        body.put("enforce_location", template.enforceLocation());
        body.put("location_id", template.locationId());
        body.put("location_name", template.locationName());
        body.put("days", template.days().stream().map(this::toTemplateDayMap).toList());
        body.put("users_assigned_count", loadActiveAssignmentCountsByTemplate(companyId, scope).getOrDefault(templateId, 0));
        return body;
    }
}
