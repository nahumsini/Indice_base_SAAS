package com.indice.erp.hr.attendance;

import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.hr.attendance.policy.AttendanceEditPolicy;
import com.indice.erp.hr.attendance.policy.AttendanceEmployeeNumberPolicy;
import com.indice.erp.hr.attendance.policy.AttendanceStatusPolicy;
import com.indice.erp.hr.attendance.util.AttendanceDateParser;
import com.indice.erp.hr.shared.HrPayloadUtils;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrAttendanceService {

    private static final List<String> ATTENDANCE_STATUSES = List.of(
        "on_time",
        "late",
        "leave",
        "rest",
        "absence",
        "pending",
        "not_scheduled"
    );
    private static final List<String> PUBLIC_KIOSK_AUTH_METHODS = List.of("pin");
    private static final int PUBLIC_KIOSK_PIN_FAILURE_LIMIT = 5;
    private static final Duration PUBLIC_KIOSK_PIN_LOCK_DURATION = Duration.ofMinutes(15);
    private static final Duration EARLY_CHECK_IN_ALLOWANCE = Duration.ofMinutes(15);
    private static final String PUBLIC_KIOSK_PIN_THROTTLE_METADATA_KEY = "_pin_throttle";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JdbcTemplate jdbcTemplate;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final HrFaceService hrFaceService;
    private final GoogleMapsCoordinateExtractor googleMapsCoordinateExtractor;
    private final boolean enforceLocationRadius;
    private final String kioskIdentificationTokenSecret;
    private final int kioskIdentificationTokenTtlSeconds;
    private final int kioskInactivityTimeoutSeconds;

    public HrAttendanceService(
        JdbcTemplate jdbcTemplate,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        HrFaceService hrFaceService,
        GoogleMapsCoordinateExtractor googleMapsCoordinateExtractor,
        @Value("${app.hr.attendance.enforce-location-radius:false}") boolean enforceLocationRadius,
        @Value("${app.hr.kiosk.identification-token-secret:indice-kiosk-identification-secret}") String kioskIdentificationTokenSecret,
        @Value("${app.hr.kiosk.identification-token-ttl-seconds:120}") int kioskIdentificationTokenTtlSeconds,
        @Value("${app.hr.kiosk.inactivity-timeout-seconds:60}") int kioskInactivityTimeoutSeconds
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
        this.hrFaceService = hrFaceService;
        this.googleMapsCoordinateExtractor = googleMapsCoordinateExtractor;
        this.enforceLocationRadius = enforceLocationRadius;
        this.kioskIdentificationTokenSecret = kioskIdentificationTokenSecret == null || kioskIdentificationTokenSecret.isBlank()
            ? "indice-kiosk-identification-secret"
            : kioskIdentificationTokenSecret;
        this.kioskIdentificationTokenTtlSeconds = Math.max(kioskIdentificationTokenTtlSeconds, 30);
        this.kioskInactivityTimeoutSeconds = Math.max(kioskInactivityTimeoutSeconds, 15);
    }

    public Map<String, Object> listDashboard(long companyId, LocalDate date) {
        return buildDashboard(companyId, date, listAttendanceEmployees(companyId));
    }

    @Transactional
    public Map<String, Object> selfDashboard(long companyId, long userId, LocalDate date) {
        return buildDashboard(companyId, date, List.of(resolveSessionAttendanceEmployee(companyId, userId)));
    }

    @Transactional
    public long resolveSelfEmployeeId(long companyId, long userId) {
        return resolveSessionAttendanceEmployee(companyId, userId).id();
    }

    private Map<String, Object> buildDashboard(long companyId, LocalDate date, List<AttendanceEmployee> employees) {
        var dailyRecordsByEmployee = loadDailyRecords(companyId, date);
        var scheduleRulesByEmployee = loadScheduleRules(companyId, date);
        var locations = listLocations(companyId);

        var items = new ArrayList<Map<String, Object>>();
        var employeesPayload = new ArrayList<Map<String, Object>>();
        int onTimeCount = 0;
        int lateCount = 0;
        int leaveCount = 0;
        int restCount = 0;
        int absenceCount = 0;

        for (var employee : employees) {
            var dailyRecord = dailyRecordsByEmployee.get(employee.id());
            var scheduleRule = scheduleRulesByEmployee.get(employee.id());
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule, date);
            var editLockReason = attendanceEditLockReason(employee, date);

            switch (effectiveStatus) {
                case "on_time" -> onTimeCount++;
                case "late" -> lateCount++;
                case "leave" -> leaveCount++;
                case "rest" -> restCount++;
                case "pending", "not_scheduled" -> {
                }
                default -> absenceCount++;
            }

            var item = new LinkedHashMap<String, Object>();
            item.put("employee_id", employee.id());
            item.put("employee_number", employee.employeeNumber());
            item.put("employee_name", employee.fullName());
            item.put("position_title", employee.positionTitle());
            item.put("department", employee.department());
            item.put("unit_id", employee.unitId());
            item.put("unit_name", employee.unitName());
            item.put("business_id", employee.businessId());
            item.put("business_name", employee.businessName());
            item.put("hire_date", dateString(employee.hireDate()));
            item.put("attendance_editable", editLockReason == null);
            item.put("edit_lock_reason", editLockReason);
            item.put("status", effectiveStatus);
            item.put("system_status", resolveSystemStatus(dailyRecord, scheduleRule, date));
            item.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            item.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            item.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            item.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            item.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
            item.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : calculateMinutesLate(scheduleRule, null));
            item.put("first_photo_url", dailyRecord != null ? signedPhotoUrl(dailyRecord.firstPhotoObjectKey()) : null);
            item.put("last_photo_url", dailyRecord != null ? signedPhotoUrl(dailyRecord.lastPhotoObjectKey()) : null);
            items.add(item);

            var employeePayload = new LinkedHashMap<String, Object>();
            employeePayload.put("id", employee.id());
            employeePayload.put("employee_number", employee.employeeNumber());
            employeePayload.put("full_name", employee.fullName());
            employeePayload.put("position_title", employee.positionTitle());
            employeePayload.put("department", employee.department());
            employeePayload.put("unit_id", employee.unitId());
            employeePayload.put("unit_name", employee.unitName());
            employeePayload.put("hire_date", dateString(employee.hireDate()));
            employeePayload.put("status", employee.status());
            employeesPayload.add(employeePayload);
        }

        var summary = new LinkedHashMap<String, Object>();
        summary.put("total_employees", employees.size());
        summary.put("on_time_count", onTimeCount);
        summary.put("late_count", lateCount);
        summary.put("leave_count", leaveCount);
        summary.put("rest_count", restCount);
        summary.put("absence_count", absenceCount);
        summary.put("locations_count", locations.size());
        summary.put("kiosk_enabled", !locations.isEmpty());

        var body = new LinkedHashMap<String, Object>();
        body.put("date", date.toString());
        body.put("summary", summary);
        body.put("items", items);
        body.put("employees", employeesPayload);
        body.put("locations", locations.stream().map(this::toLocationMap).toList());
        return body;
    }

    public Map<String, Object> employeeCalendar(long companyId, long employeeId, YearMonth month) {
        var employee = loadAttendanceEmployee(companyId, employeeId);
        var startDate = month.atDay(1);
        var endDate = month.atEndOfMonth();
        var dailyRecords = loadDailyRecords(companyId, employeeId, startDate, endDate);
        var scheduleWindows = loadScheduleWindows(companyId, employeeId, startDate, endDate);
        var activeWorkSitesByDate = loadActiveWorkSiteAssignments(companyId, employeeId, startDate, endDate);

        var days = new ArrayList<Map<String, Object>>();
        for (var currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
            var dailyRecord = dailyRecords.get(currentDate);
            var scheduleRule = resolveScheduleRule(scheduleWindows, currentDate);
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule, currentDate);
            var editLockReason = attendanceEditLockReason(employee, currentDate);

            var day = new LinkedHashMap<String, Object>();
            day.put("date", currentDate.toString());
            day.put("day", currentDate.getDayOfMonth());
            day.put("attendance_editable", editLockReason == null);
            day.put("edit_lock_reason", editLockReason);
            day.put("effective_status", effectiveStatus);
            day.put("system_status", resolveSystemStatus(dailyRecord, scheduleRule, currentDate));
            day.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            day.put("entry_registered", dailyRecord != null && dailyRecord.firstCheckInAt() != null);
            day.put("exit_registered", dailyRecord != null && dailyRecord.lastCheckOutAt() != null);
            day.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            day.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            day.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : 0);
            day.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            day.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
            day.put("schedule_rule", scheduleRule == null ? null : toScheduleRuleMap(scheduleRule));
            var activeWorkSite = activeWorkSitesByDate.get(currentDate);
            day.put("active_work_site", activeWorkSite == null ? null : toWorkSiteAssignmentMap(activeWorkSite));
            day.put("first_photo_url", dailyRecord != null ? signedPhotoUrl(dailyRecord.firstPhotoObjectKey()) : null);
            day.put("last_photo_url", dailyRecord != null ? signedPhotoUrl(dailyRecord.lastPhotoObjectKey()) : null);
            day.put("notes", dailyRecord != null ? dailyRecord.notes() : null);
            days.add(day);
        }

        var body = new LinkedHashMap<String, Object>();
        var employeePayload = new LinkedHashMap<String, Object>();
        employeePayload.put("id", employee.id());
        employeePayload.put("full_name", employee.fullName());
        employeePayload.put("position_title", employee.positionTitle());
        employeePayload.put("department", employee.department());
        employeePayload.put("hire_date", dateString(employee.hireDate()));
        body.put("employee", employeePayload);
        body.put("month", month.toString());
        body.put("items", days);
        return body;
    }

    @Transactional
    public Map<String, Object> selfCalendar(long companyId, long userId, YearMonth month) {
        var employee = resolveSessionAttendanceEmployee(companyId, userId);
        return employeeCalendar(companyId, employee.id(), month);
    }

    public Map<String, Object> controlOverview(long companyId, LocalDate date) {
        var employees = listAttendanceEmployees(companyId);
        var locations = listLocations(companyId);
        var templates = loadScheduleTemplates(companyId);
        var currentAssignments = loadCurrentAssignments(companyId, date);
        var scheduleRulesByEmployee = loadScheduleRules(companyId, date);
        var dailyRecordsByEmployee = loadDailyRecords(companyId, date);
        var allowedLocationsByEmployee = loadAllowedLocationsByEmployee(companyId);
        var businessLocationsByBusiness = groupLocationsByBusiness(locations);
        var activeWorkSitesByEmployee = loadActiveWorkSiteAssignments(companyId, date);
        var accessProfilesByEmployee = loadAccessProfilesByEmployee(companyId);
        var kioskDevices = listKioskDevicesRows(companyId);
        var recentEvents = loadRecentControlActivity(companyId, date, 25);
        var latestEventByEmployee = new HashMap<Long, ControlActivityRow>();
        int authSuccessCount = 0;
        int authFailureCount = 0;
        int overrideCount = 0;

        for (var recentEvent : recentEvents) {
            latestEventByEmployee.putIfAbsent(recentEvent.employeeId(), recentEvent);
            if ("auth_attempt".equals(recentEvent.eventKind())) {
                if ("success".equals(recentEvent.resultStatus()) || "overridden".equals(recentEvent.resultStatus())) {
                    authSuccessCount++;
                } else if ("failure".equals(recentEvent.resultStatus()) || "rejected".equals(recentEvent.resultStatus())) {
                    authFailureCount++;
                }
            }
            if ("manual_override".equals(recentEvent.authMethod()) || "overridden".equals(recentEvent.resultStatus())) {
                overrideCount++;
            }
        }

        var assignedCountsByTemplate = new HashMap<Long, Integer>();
        currentAssignments.values().forEach((assignment) ->
            assignedCountsByTemplate.merge(assignment.templateId(), 1, Integer::sum)
        );

        int assignedEmployeesCount = 0;
        int unassignedEmployeesCount = 0;
        int lateTodayCount = 0;
        int manualCorrectionsCount = 0;
        int recordsTodayCount = 0;

        var assignmentsPayload = new ArrayList<Map<String, Object>>();
        for (var employee : employees) {
            var assignment = currentAssignments.get(employee.id());
            var scheduleRule = scheduleRulesByEmployee.get(employee.id());
            var dailyRecord = dailyRecordsByEmployee.get(employee.id());
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule, date);
            var systemStatus = resolveSystemStatus(dailyRecord, scheduleRule, date);
            var editLockReason = attendanceEditLockReason(employee, date);

            if (assignment == null) {
                unassignedEmployeesCount++;
            } else {
                assignedEmployeesCount++;
            }

            if ("late".equals(effectiveStatus)) {
                lateTodayCount++;
            }

            if (dailyRecord != null && !HrPayloadUtils.isBlank(dailyRecord.correctedStatus())) {
                manualCorrectionsCount++;
            }

            if (dailyRecord != null && (dailyRecord.firstCheckInAt() != null || dailyRecord.lastCheckOutAt() != null)) {
                recordsTodayCount++;
            }

            var item = new LinkedHashMap<String, Object>();
            item.put("employee_id", employee.id());
            item.put("employee_number", employee.employeeNumber());
            item.put("employee_name", employee.fullName());
            item.put("position_title", employee.positionTitle());
            item.put("department", employee.department());
            item.put("employee_status", employee.status());
            item.put("unit_id", employee.unitId());
            item.put("unit_name", employee.unitName());
            item.put("business_id", employee.businessId());
            item.put("business_name", employee.businessName());
            item.put("hire_date", dateString(employee.hireDate()));
            item.put("attendance_editable", editLockReason == null);
            item.put("edit_lock_reason", editLockReason);
            item.put("schedule_template_id", assignment != null ? assignment.templateId() : null);
            item.put("schedule_template_name", assignment != null ? displayScheduleTemplateName(assignment.templateName()) : null);
            item.put("effective_start_date", assignment != null ? assignment.effectiveStartDate().toString() : null);
            item.put("effective_end_date", assignment != null && assignment.effectiveEndDate() != null
                ? assignment.effectiveEndDate().toString()
                : null);
            item.put("today_rule", scheduleRule == null ? null : toScheduleRuleMap(scheduleRule));
            item.put("today_status", effectiveStatus);
            item.put("system_status", systemStatus);
            item.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            item.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            item.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            item.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            item.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
            item.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : calculateMinutesLate(scheduleRule, null));
            item.put(
                "allowed_locations",
                allowedLocationsByEmployee.getOrDefault(employee.id(), List.of()).stream().map(this::toLocationMap).toList()
            );
            item.put(
                "business_locations",
                employee.businessId() == null
                    ? List.of()
                    : businessLocationsByBusiness.getOrDefault(employee.businessId(), List.of()).stream().map(this::toLocationMap).toList()
            );
            var activeWorkSite = activeWorkSitesByEmployee.get(employee.id());
            item.put("active_work_site", activeWorkSite == null ? null : toWorkSiteAssignmentMap(activeWorkSite));
            var accessProfile = accessProfilesByEmployee.get(employee.id());
            item.put("access_profile", accessProfile == null ? null : toAccessProfileMap(accessProfile));
            var latestEvent = latestEventByEmployee.get(employee.id());
            item.put("latest_event", latestEvent == null ? null : toControlActivityMap(latestEvent));
            assignmentsPayload.add(item);
        }

        var templatesPayload = new ArrayList<Map<String, Object>>();
        for (var template : templates) {
            var body = new LinkedHashMap<String, Object>();
            body.put("id", template.templateId());
            body.put("name", displayScheduleTemplateName(template.templateName()));
            body.put("status", template.status());
            body.put("employees_assigned_count", assignedCountsByTemplate.getOrDefault(template.templateId(), 0));
            body.put("days", template.days().stream().map(this::toTemplateDayMap).toList());
            templatesPayload.add(body);
        }

        var summary = new LinkedHashMap<String, Object>();
        summary.put("employees_count", employees.size());
        summary.put("locations_count", locations.size());
        summary.put("templates_count", templates.size());
        summary.put("assigned_employees_count", assignedEmployeesCount);
        summary.put("unassigned_employees_count", unassignedEmployeesCount);
        summary.put("late_today_count", lateTodayCount);
        summary.put("manual_corrections_count", manualCorrectionsCount);
        summary.put("records_today_count", recordsTodayCount);
        summary.put("auth_success_count", authSuccessCount);
        summary.put("auth_failure_count", authFailureCount);
        summary.put("override_count", overrideCount);

        var body = new LinkedHashMap<String, Object>();
        body.put("date", date.toString());
        body.put("summary", summary);
        body.put("locations", locations.stream().map(this::toLocationMap).toList());
        body.put("templates", templatesPayload);
        body.put("kiosk_devices", kioskDevices.stream().map(this::toKioskDeviceMap).toList());
        body.put("assignments", assignmentsPayload);
        body.put("recent_events", recentEvents.stream().map(this::toControlActivityMap).toList());
        return body;
    }

    public Map<String, Object> scheduleCandidates(
        long companyId,
        LocalDate startDate,
        LocalDate endDate,
        int page,
        int size,
        String search,
        Long unitId,
        Long businessId,
        boolean availableOnly
    ) {
        var safePage = Math.max(1, page);
        var safeSize = Math.max(5, Math.min(size, 50));
        var normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        var normalizedUnitId = unitId != null && unitId > 0 ? unitId : null;
        var normalizedBusinessId = businessId != null && businessId > 0 ? businessId : null;
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("effective_end_date must be on or after effective_start_date.");
        }
        var baseWhere = scheduleCandidateBaseWhere();

        var filteredWhere = new StringBuilder(baseWhere);
        var filteredParams = scheduleCandidateBaseParams(companyId, startDate, endDate);
        appendScheduleCandidateFilters(filteredWhere, filteredParams, normalizedSearch, normalizedUnitId, normalizedBusinessId);

        Integer availableCountValue = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employees e LEFT JOIN units u ON u.id = e.unit_id LEFT JOIN businesses b ON b.id = e.business_id WHERE " + filteredWhere,
            Integer.class,
            filteredParams.toArray()
        );
        var allFilteredWhere = new StringBuilder(scheduleCandidateEmployeeBaseWhere());
        var allFilteredParams = scheduleCandidateEmployeeBaseParams(companyId);
        appendScheduleCandidateFilters(allFilteredWhere, allFilteredParams, normalizedSearch, normalizedUnitId, normalizedBusinessId);
        Integer allFilteredEmployeesCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employees e LEFT JOIN units u ON u.id = e.unit_id LEFT JOIN businesses b ON b.id = e.business_id WHERE " + allFilteredWhere,
            Integer.class,
            allFilteredParams.toArray()
        );
        var availableCount = availableCountValue == null ? 0 : availableCountValue;
        var allFilteredCount = allFilteredEmployeesCount == null ? 0 : allFilteredEmployeesCount;
        var totalCount = availableOnly ? availableCount : allFilteredCount;
        var totalPages = Math.max(1, (int) Math.ceil((double) totalCount / safeSize));
        safePage = Math.min(safePage, totalPages);
        var offset = (safePage - 1) * safeSize;

        var listWhere = availableOnly ? filteredWhere : allFilteredWhere;
        var listParams = availableOnly ? filteredParams : allFilteredParams;
        var itemsParams = new ArrayList<>(listParams);
        itemsParams.add(safeSize);
        itemsParams.add(offset);
        var pageEmployees = jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       e.hire_date AS hire_date,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       u.id AS unit_id,
                       u.name AS unit_name,
                       b.id AS business_id,
                       b.name AS business_name
                FROM hr_employees e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE %s
                ORDER BY full_name ASC, e.id ASC
                LIMIT ? OFFSET ?
                """.formatted(listWhere),
            (rs, rowNum) -> mapAttendanceEmployee(rs),
            itemsParams.toArray()
        );
        var currentAssignments = loadCurrentAssignments(companyId, startDate);
        var scheduleRulesByEmployee = loadScheduleRules(companyId, startDate);
        var dailyRecordsByEmployee = loadDailyRecords(companyId, startDate);
        var activeWorkSitesByEmployee = loadActiveWorkSiteAssignments(companyId, startDate);
        var items = pageEmployees.stream()
            .map((employee) -> toScheduleCandidateMap(
                companyId,
                employee,
                startDate,
                endDate,
                currentAssignments.get(employee.id()),
                scheduleRulesByEmployee.get(employee.id()),
                dailyRecordsByEmployee.get(employee.id()),
                activeWorkSitesByEmployee.get(employee.id())
            ))
            .toList();

        var unitOptions = jdbcTemplate.query(
            """
                SELECT id, name
                FROM units
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "id", rs.getLong("id"),
                "name", safe(rs.getString("name"))
            ),
            companyId
        );

        var businessOptions = jdbcTemplate.query(
            """
                SELECT b.id, b.name, u.id AS unit_id, u.name AS unit_name
                FROM businesses b
                LEFT JOIN units u ON u.id = b.unit_id
                WHERE (b.company_id = ? OR b.company_id IS NULL)
                  AND (b.status = 'active' OR b.status IS NULL OR b.status = '')
                ORDER BY b.name ASC
                """,
            (rs, rowNum) -> {
                var option = new LinkedHashMap<String, Object>();
                option.put("id", rs.getLong("id"));
                option.put("name", safe(rs.getString("name")));
                option.put("unit_id", getNullableLong(rs, "unit_id"));
                option.put("unit_name", safe(rs.getString("unit_name")));
                return option;
            },
            companyId
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("date", startDate.toString());
        body.put("effective_end_date", endDate == null ? null : endDate.toString());
        body.put("items", items);
        body.put("page", safePage);
        body.put("size", safeSize);
        body.put("total_count", totalCount);
        body.put("total_pages", totalPages);
        body.put("available_count", availableCount);
        body.put("busy_count", Math.max(0, allFilteredCount - availableCount));
        body.put("unit_options", unitOptions);
        body.put("business_options", businessOptions);
        return body;
    }

    public Map<String, Object> listKioskDevices(long companyId) {
        return Map.of("items", listKioskDevicesRows(companyId).stream().map(this::toKioskDeviceMap).toList());
    }

    @Transactional
    public Map<String, Object> saveKioskDevice(long companyId, long userId, Long kioskDeviceId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var code = stringValue(payload, "code");
        var name = stringValue(payload, "name", "nombre");
        if (code.isBlank() || name.isBlank()) {
            throw new IllegalArgumentException("code and name are required.");
        }

        var status = normalizeManagedStatus(stringValue(payload, "status"));
        var unitId = normalizeOptionalForeignKey(parseLong(payload, "unit_id"));
        var businessId = normalizeOptionalForeignKey(parseLong(payload, "business_id"));
        var locationId = normalizeOptionalForeignKey(parseLong(payload, "location_id"));
        validateOperationalScope(companyId, unitId, businessId, locationId);
        ensureUniqueKioskCode(companyId, kioskDeviceId, code);

        var metadataJson = toJson(payload.get("metadata"));
        KioskDeviceRow existingKioskDevice = null;
        var publicAccessToken = generateUniqueKioskPublicAccessToken();
        if (kioskDeviceId != null && kioskDeviceId > 0) {
            existingKioskDevice = loadKioskDevice(companyId, kioskDeviceId);
            publicAccessToken = existingKioskDevice.publicAccessToken();
            metadataJson = mergeKioskInternalMetadata(metadataJson, existingKioskDevice.metadataJson());
        }
        if (kioskDeviceId == null || kioskDeviceId <= 0) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            var insertPublicAccessToken = publicAccessToken;
            var insertMetadataJson = metadataJson;
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO hr_kiosk_devices
                        (company_id, unit_id, business_id, location_id, code, name, status, public_access_token, metadata_json, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                setNullableLong(statement, 2, unitId);
                setNullableLong(statement, 3, businessId);
                setNullableLong(statement, 4, locationId);
                statement.setString(5, code);
                statement.setString(6, name);
                statement.setString(7, status);
                statement.setString(8, insertPublicAccessToken);
                statement.setString(9, insertMetadataJson);
                statement.setLong(10, userId);
                return statement;
            }, keyHolder);
            kioskDeviceId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        } else {
            var updated = jdbcTemplate.update(
                """
                    UPDATE hr_kiosk_devices
                    SET unit_id = ?,
                        business_id = ?,
                        location_id = ?,
                        code = ?,
                        name = ?,
                        status = ?,
                        public_access_token = ?,
                        metadata_json = CAST(? AS JSON)
                    WHERE id = ? AND company_id = ?
                    """,
                unitId,
                businessId,
                locationId,
                code,
                name,
                status,
                publicAccessToken,
                metadataJson,
                kioskDeviceId,
                companyId
            );
            if (updated == 0) {
                throw new NoSuchElementException("Kiosk device not found.");
            }
        }

        return Map.of("kiosk_device", toKioskDeviceMap(loadKioskDevice(companyId, kioskDeviceId)));
    }

    @Transactional
    public Map<String, Object> rotateKioskPublicAccessToken(long companyId, long kioskDeviceId) {
        loadKioskDevice(companyId, kioskDeviceId);
        var nextToken = generateUniqueKioskPublicAccessToken();
        var updated = jdbcTemplate.update(
            """
                UPDATE hr_kiosk_devices
                SET public_access_token = ?
                WHERE id = ? AND company_id = ?
                """,
            nextToken,
            kioskDeviceId,
            companyId
        );
        if (updated == 0) {
            throw new NoSuchElementException("Kiosk device not found.");
        }

        var kioskDevice = loadKioskDevice(companyId, kioskDeviceId);
        clearPublicKioskPinFailures(kioskDevice);
        return Map.of("kiosk_device", toKioskDeviceMap(loadKioskDevice(companyId, kioskDeviceId)));
    }

    public Map<String, Object> publicKioskBootstrap(String deviceToken) {
        var kioskDevice = loadKioskDeviceByPublicAccessToken(deviceToken);
        var location = requirePublicKioskLocation(kioskDevice);
        var authMethods = determinePublicKioskAuthMethods(kioskDevice.companyId());

        var body = new LinkedHashMap<String, Object>();
        body.put("kiosk_device", Map.of(
            "id", kioskDevice.id(),
            "code", kioskDevice.code(),
            "name", kioskDevice.name()
        ));
        body.put("location", toLocationMap(location));
        body.put("auth_methods", authMethods);
        body.put("inactivity_timeout_seconds", kioskInactivityTimeoutSeconds);
        return body;
    }

    @Transactional(noRollbackFor = { IllegalArgumentException.class, KioskPinThrottleException.class })
    public Map<String, Object> publicKioskIdentify(String deviceToken, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var kioskDevice = loadKioskDeviceByPublicAccessToken(deviceToken);
        var location = requirePublicKioskLocation(kioskDevice);
        var requestedAuthMethod = stringValue(payload, "auth_method", "method_type");
        var authMethod = normalizePublicKioskAuthMethod(requestedAuthMethod.isBlank() ? "pin" : requestedAuthMethod);
        var credentialPayload = nullable(stringValue(payload, "credential_payload", "credential", "pin", "badge_code"));
        if (credentialPayload == null || credentialPayload.isBlank()) {
            throw new IllegalArgumentException("credential_payload is required.");
        }

        ensurePublicKioskPinAttemptAllowed(kioskDevice);
        var resolvedMethod = resolvePublicKioskAccessMethod(kioskDevice.companyId(), authMethod, credentialPayload);
        if (resolvedMethod == null) {
            recordPublicKioskPinFailure(kioskDevice);
            throw new IllegalArgumentException("Credential validation failed.");
        }
        clearPublicKioskPinFailures(kioskDevice);

        var employee = loadAttendanceEmployee(kioskDevice.companyId(), resolvedMethod.employeeId());
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("This employee is terminated and cannot record attendance.");
        }

        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        if (eventTimestamp == null) {
            eventTimestamp = LocalDateTime.now();
        }

        var authAttemptMetadata = mergeMetadataJson(
            toJson(payload.get("metadata")),
            Map.of(
                "public_kiosk", true,
                "employee_id", employee.id(),
                "event_kind", "auth_attempt"
            )
        );
        var authAttemptId = appendAttendanceEvent(
            kioskDevice.companyId(),
            employee.id(),
            "auth_attempt",
            eventTimestamp,
            eventTimestamp.toLocalDate(),
            location.id(),
            kioskDevice.id(),
            location.latitude(),
            location.longitude(),
            null,
            "kiosk_public",
            authMethod,
            "success",
            "auth_attempt",
            authAttemptMetadata,
            null,
            null,
            0L
        );

        var expiresAtEpochSeconds = Instant.now().getEpochSecond() + kioskIdentificationTokenTtlSeconds;
        var activityDate = resolveOperationalAttendanceDate(kioskDevice.companyId(), employee.id(), eventTimestamp, "check_out");
        var scheduleRule = loadScheduleRule(kioskDevice.companyId(), employee.id(), activityDate);
        var dailyRecord = loadDailyRecord(kioskDevice.companyId(), employee.id(), activityDate);
        var body = new LinkedHashMap<String, Object>();
        body.put("auth_attempt_event_id", authAttemptId);
        body.put("auth_method", authMethod);
        body.put("employee", Map.of(
            "id", employee.id(),
            "employee_number", employee.employeeNumber(),
            "full_name", employee.fullName(),
            "position_title", employee.positionTitle(),
            "department", employee.department()
        ));
        body.put(
            "identification_token",
            createPublicKioskIdentificationToken(deviceToken, employee.id(), authMethod, expiresAtEpochSeconds)
        );
        body.put("expires_at", Instant.ofEpochSecond(expiresAtEpochSeconds).toString());
        body.put("today_activity", toPublicKioskDayActivity(activityDate, dailyRecord, scheduleRule));
        return body;
    }

    @Transactional
    public Map<String, Object> publicKioskPunch(String deviceToken, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var kioskDevice = loadKioskDeviceByPublicAccessToken(deviceToken);
        requirePublicKioskLocation(kioskDevice);
        var identificationToken = stringValue(payload, "identification_token");
        if (identificationToken.isBlank()) {
            throw new IllegalArgumentException("identification_token is required.");
        }

        var tokenClaims = verifyPublicKioskIdentificationToken(deviceToken, identificationToken);
        var employee = loadAttendanceEmployee(kioskDevice.companyId(), tokenClaims.employeeId());
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("This employee is terminated and cannot record attendance.");
        }

        var eventType = normalizePublicKioskEventType(stringValue(payload, "event_type", "event_kind"));
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        if (eventTimestamp == null) {
            eventTimestamp = LocalDateTime.now();
        }
        validateOperationalEventDate(eventType, eventTimestamp);

        var latitude = parseDecimalRequired(payload, "latitude");
        var longitude = parseDecimalRequired(payload, "longitude");
        var faceVerificationSessionId = normalizeOptionalForeignKey(parseLong(payload, "face_verification_session_id"));
        var photoObjectKey = normalizeAttendancePhotoObjectKey(kioskDevice.companyId(), employee.id(), stringValue(payload, "photo_url"));
        var hasFaceVerification = faceVerificationSessionId != null;
        var hasFallbackPhoto = photoObjectKey != null && !photoObjectKey.isBlank();

        if (!hasFaceVerification && !hasFallbackPhoto) {
            throw new IllegalArgumentException("Face verification or fallback photo is required.");
        }
        if (hasFaceVerification) {
            hrFaceService.consumeSuccessfulVerificationSession(kioskDevice.companyId(), employee.id(), faceVerificationSessionId);
        }

        var attendanceDate = resolveOperationalAttendanceDate(kioskDevice.companyId(), employee.id(), eventTimestamp, eventType);
        var scheduleRule = loadScheduleRule(kioskDevice.companyId(), employee.id(), attendanceDate);
        var activeWorkSite = loadActiveWorkSiteAssignment(kioskDevice.companyId(), employee.id(), attendanceDate);
        var location = resolveScheduleRegistrationLocation(
            kioskDevice.companyId(),
            employee,
            scheduleRule,
            eventType,
            kioskDevice.locationId(),
            latitude,
            longitude,
            activeWorkSite
        );
        validateScheduleRegistrationPolicy(scheduleRule, eventType, eventTimestamp, attendanceDate);
        validateOperationalEventTransition(kioskDevice.companyId(), employee.id(), attendanceDate, eventTimestamp, eventType);

        var metadataJson = mergeMetadataJson(
            toJson(payload.get("metadata")),
            Map.of(
                "public_kiosk", true,
                "identified_employee_id", employee.id(),
                "pin_verified", true,
                "identity_evidence", hasFaceVerification ? "face_verified" : "photo_fallback",
                "requires_review", !hasFaceVerification
            )
        );
        var operationalEventId = appendAttendanceEvent(
            kioskDevice.companyId(),
            employee.id(),
            eventType,
            eventTimestamp,
            attendanceDate,
            location.id(),
            kioskDevice.id(),
            latitude,
            longitude,
            photoObjectKey,
            "kiosk_public",
            tokenClaims.authMethod(),
            "success",
            eventType,
            metadataJson,
            null,
            null,
            0L
        );

        var dailyRecord = rebuildDailyRecordProjection(kioskDevice.companyId(), employee.id(), attendanceDate);
        var result = new LinkedHashMap<String, Object>();
        result.put("event_id", operationalEventId);
        result.put("employee_id", employee.id());
        result.put("event_kind", eventType);
        result.put("auth_method", tokenClaims.authMethod());
        result.put("result_status", "success");
        result.put("status", resolveEffectiveStatus(dailyRecord, scheduleRule, attendanceDate));
        result.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
        result.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
        result.put("location", toLocationMap(location));
        result.put("active_work_site", activeWorkSite == null ? null : toWorkSiteAssignmentMap(activeWorkSite));
        result.put("photo_object_key", photoObjectKey);
        result.put("identity_evidence", hasFaceVerification ? "face_verified" : "photo_fallback");
        result.put("today_activity", toPublicKioskDayActivity(attendanceDate, dailyRecord, scheduleRule));
        return result;
    }

    public Map<String, Object> createPublicKioskPhotoUpload(String deviceToken, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var context = requirePublicKioskIdentificationContext(deviceToken, payload);
        var normalizedPayload = new LinkedHashMap<String, Object>(payload);
        normalizedPayload.put("employee_id", context.employee().id());
        return createPhotoUpload(context.kioskDevice().companyId(), normalizedPayload);
    }

    public Map<String, Object> createPublicKioskFaceVerificationSession(String deviceToken, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var context = requirePublicKioskIdentificationContext(deviceToken, payload);
        return hrFaceService.createVerificationSession(
            context.kioskDevice().companyId(),
            0L,
            Map.of("employee_id", context.employee().id())
        );
    }

    public Map<String, Object> createPublicKioskFaceVerificationCaptureUpload(
        String deviceToken,
        long sessionId,
        Map<String, Object> payload
    ) {
        payload = normalizePayload(payload);
        var context = requirePublicKioskIdentificationContext(deviceToken, payload);
        ensureFaceVerificationSessionBelongsTo(context.kioskDevice().companyId(), context.employee().id(), sessionId);
        return hrFaceService.createVerificationCaptureUpload(context.kioskDevice().companyId(), sessionId, payload);
    }

    public Map<String, Object> completePublicKioskFaceVerificationSession(
        String deviceToken,
        long sessionId,
        Map<String, Object> payload
    ) {
        payload = normalizePayload(payload);
        var context = requirePublicKioskIdentificationContext(deviceToken, payload);
        ensureFaceVerificationSessionBelongsTo(context.kioskDevice().companyId(), context.employee().id(), sessionId);
        return hrFaceService.completeVerificationSession(context.kioskDevice().companyId(), 0L, sessionId);
    }

    public Map<String, Object> listAccessProfiles(long companyId) {
        var profiles = listAccessProfilesRows(companyId);
        return Map.of("items", profiles.stream().map(this::toAccessProfileMap).toList());
    }

    @Transactional
    public Map<String, Object> saveAccessProfile(long companyId, long userId, Long profileId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var employeeId = parseLong(payload, "employee_id");
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("employee_id is required.");
        }

        var employee = loadAttendanceEmployee(companyId, employeeId);
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("Terminated employees cannot receive kiosk access.");
        }

        var status = normalizeManagedStatus(stringValue(payload, "status"));
        var defaultMethod = normalizeEnabledAuthMethod(stringValue(payload, "default_method"));
        var metadataJson = toJson(payload.get("metadata"));
        var lastEnrolledAt = parseDateTime(payload, "last_enrolled_at");

        if (profileId == null || profileId <= 0) {
            ensureUniqueAccessProfile(companyId, employeeId, null);
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO hr_employee_access_profiles
                        (company_id, employee_id, status, default_method, last_enrolled_at, metadata_json, created_by)
                        VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                statement.setLong(2, employeeId);
                statement.setString(3, status);
                statement.setString(4, defaultMethod);
                if (lastEnrolledAt == null) {
                    statement.setNull(5, Types.TIMESTAMP);
                } else {
                    statement.setTimestamp(5, Timestamp.valueOf(lastEnrolledAt));
                }
                statement.setString(6, metadataJson);
                statement.setLong(7, userId);
                return statement;
            }, keyHolder);
            profileId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        } else {
            var existing = loadAccessProfile(companyId, profileId);
            ensureUniqueAccessProfile(companyId, employeeId, profileId);
            var updated = jdbcTemplate.update(
                """
                    UPDATE hr_employee_access_profiles
                    SET employee_id = ?,
                        status = ?,
                        default_method = ?,
                        last_enrolled_at = ?,
                        metadata_json = CAST(? AS JSON)
                    WHERE id = ? AND company_id = ?
                    """,
                employeeId,
                status,
                defaultMethod,
                lastEnrolledAt == null ? existing.lastEnrolledAt() == null ? null : Timestamp.valueOf(existing.lastEnrolledAt()) : Timestamp.valueOf(lastEnrolledAt),
                metadataJson,
                profileId,
                companyId
            );
            if (updated == 0) {
                throw new NoSuchElementException("Employee access profile not found.");
            }
        }

        return Map.of("access_profile", toAccessProfileMap(loadAccessProfile(companyId, profileId)));
    }

    public Map<String, Object> listAccessMethods(long companyId) {
        var items = loadAccessMethods(companyId, null).stream().map(this::toAccessMethodMap).toList();
        return Map.of("items", items);
    }

    @Transactional
    public Map<String, Object> saveAccessMethod(long companyId, Long methodId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var accessProfileId = parseLong(payload, "access_profile_id");
        if (accessProfileId == null || accessProfileId <= 0) {
            throw new IllegalArgumentException("access_profile_id is required.");
        }

        var profile = loadAccessProfile(companyId, accessProfileId);
        var methodType = normalizeEnabledAuthMethod(stringValue(payload, "method_type"));
        var status = normalizeManagedStatus(stringValue(payload, "status"));
        var priority = HrPayloadUtils.parseInteger(payload, "priority");
        if (priority == null || priority < 0) {
            priority = 100;
        }

        var credentialRef = nullable(stringValue(payload, "credential_ref", "badge_code", "credential"));
        var secretRaw = nullable(stringValue(payload, "secret", "pin", "password"));
        var metadataJson = toJson(payload.get("metadata"));

        if ("badge".equals(methodType) && credentialRef == null) {
            throw new IllegalArgumentException("credential_ref is required for badge methods.");
        }
        if ("pin".equals(methodType)) {
            if (secretRaw != null) {
                credentialRef = pinCredentialReference(companyId, secretRaw);
            } else if (methodId != null && methodId > 0) {
                credentialRef = loadAccessMethod(companyId, methodId).credentialRef();
            }
        } else if (!"badge".equals(methodType)) {
            credentialRef = null;
        }
        if (!"pin".equals(methodType) && !"password".equals(methodType)) {
            secretRaw = null;
        }

        ensureUniqueAccessMethod(companyId, methodId, methodType, credentialRef);
        final int finalPriority = priority;
        final String finalCredentialRef = credentialRef;
        final String finalMetadataJson = metadataJson;
        final String finalStatus = status;
        final String finalMethodType = methodType;

        if (methodId == null || methodId <= 0) {
            var secretHash = resolveSecretHashForAccessMethod(null, methodType, secretRaw);
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO hr_employee_access_methods
                        (company_id, access_profile_id, method_type, credential_ref, secret_hash, status, priority, metadata_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                statement.setLong(2, accessProfileId);
                statement.setString(3, finalMethodType);
                statement.setString(4, finalCredentialRef);
                statement.setString(5, secretHash);
                statement.setString(6, finalStatus);
                statement.setInt(7, finalPriority);
                statement.setString(8, finalMetadataJson);
                return statement;
            }, keyHolder);
            methodId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        } else {
            var existing = loadAccessMethod(companyId, methodId);
            if (existing.accessProfileId() != accessProfileId) {
                throw new IllegalArgumentException("Access method does not belong to the selected access profile.");
            }
            var secretHash = resolveSecretHashForAccessMethod(existing, methodType, secretRaw);

            var updated = jdbcTemplate.update(
                """
                    UPDATE hr_employee_access_methods
                    SET method_type = ?,
                        credential_ref = ?,
                        secret_hash = ?,
                        status = ?,
                        priority = ?,
                        metadata_json = CAST(? AS JSON)
                    WHERE id = ? AND company_id = ?
                    """,
                methodType,
                credentialRef,
                secretHash,
                status,
                priority,
                metadataJson,
                methodId,
                companyId
            );
            if (updated == 0) {
                throw new NoSuchElementException("Employee access method not found.");
            }
        }

        var refreshedProfile = loadAccessProfile(companyId, profile.id());
        return Map.of("access_method", toAccessMethodMap(loadAccessMethod(companyId, methodId)), "access_profile", toAccessProfileMap(refreshedProfile));
    }

    public void ensureDefaultAccessProfile(long companyId, long employeeId, long createdBy) {
        var existingProfile = loadAccessProfileByEmployee(companyId, employeeId);
        if (existingProfile != null) {
            return;
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_employee_access_profiles
                    (company_id, employee_id, status, default_method, last_enrolled_at, metadata_json, created_by)
                    VALUES (?, ?, 'active', 'pin', ?, CAST(? AS JSON), ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, employeeId);
            statement.setTimestamp(3, Timestamp.valueOf(LocalDateTime.now()));
            statement.setString(4, "{\"supports_face_recognition\":false}");
            statement.setLong(5, createdBy);
            return statement;
        }, keyHolder);
    }

    public Map<String, Object> listControlLocations(long companyId) {
        var body = new LinkedHashMap<String, Object>();
        body.put("items", loadLocationRows(companyId, false).stream().map(this::toLocationMap).toList());
        return body;
    }

    @Transactional
    public Map<String, Object> replaceEmployeeAllowedLocations(
        long companyId,
        long userId,
        long employeeId,
        Map<String, Object> payload
    ) {
        payload = normalizePayload(payload);
        var employee = loadAttendanceEmployee(companyId, employeeId);
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("Terminated employees cannot receive attendance locations.");
        }

        var locationIds = HrPayloadUtils.longList(payload, "location_ids", "allowed_location_ids");
        var uniqueLocationIds = locationIds.stream()
            .filter((locationId) -> locationId != null && locationId > 0)
            .distinct()
            .toList();

        var locations = new ArrayList<LocationRow>();
        for (var locationId : uniqueLocationIds) {
            locations.add(loadLocation(companyId, locationId));
        }

        jdbcTemplate.update(
            """
                UPDATE hr_employee_allowed_locations
                SET status = 'inactive'
                WHERE company_id = ?
                  AND employee_id = ?
                """,
            companyId,
            employeeId
        );

        for (var location : locations) {
            ensureEmployeeAllowedLocation(companyId, userId, employeeId, location.id());
        }

        return Map.of(
            "employee_id", employeeId,
            "allowed_locations", loadAllowedLocations(companyId, employeeId).stream().map(this::toLocationMap).toList()
        );
    }

    @Transactional
    public Map<String, Object> bulkAssignActiveWorkSite(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var locationId = normalizeOptionalForeignKey(parseLong(payload, "location_id", "work_site_location_id"));
        if (locationId == null) {
            throw new IllegalArgumentException("location_id is required.");
        }
        var location = loadLocation(companyId, locationId);
        validateLocationCanBeAssigned(location);
        var templateId = normalizeOptionalForeignKey(parseLong(payload, "template_id", "schedule_template_id"));
        ScheduleTemplateDefinition template = null;
        if (templateId != null) {
            template = loadExistingTemplate(companyId, templateId);
            if (!"active".equals(template.status())) {
                throw new IllegalArgumentException("Only active schedule templates can be assigned.");
            }
            validateScheduleTemplateWorkSiteCompatibility(template, location);
        }

        var employeeIds = HrPayloadUtils.longList(payload, "employee_ids");
        var singleEmployeeId = parseLong(payload, "employee_id");
        if (employeeIds.isEmpty() && singleEmployeeId != null) {
            employeeIds = List.of(singleEmployeeId);
        }
        var uniqueEmployeeIds = employeeIds.stream()
            .filter((employeeId) -> employeeId != null && employeeId > 0)
            .distinct()
            .toList();
        if (uniqueEmployeeIds.isEmpty()) {
            throw new IllegalArgumentException("employee_ids is required.");
        }
        if (uniqueEmployeeIds.size() > 1) {
            throw new IllegalArgumentException("A contract site can only be assigned to one employee at a time.");
        }

        var effectiveStartDate = HrPayloadUtils.parseDate(payload, "effective_start_date", "start_date");
        if (effectiveStartDate == null) {
            throw new IllegalArgumentException("effective_start_date is required.");
        }
        var effectiveEndDate = HrPayloadUtils.parseDate(payload, "effective_end_date", "end_date");
        if (effectiveEndDate != null && effectiveEndDate.isBefore(effectiveStartDate)) {
            throw new IllegalArgumentException("effective_end_date must be on or after effective_start_date.");
        }
        if (hasActiveWorkSiteLocationAssignmentOverlap(companyId, location.id(), effectiveStartDate, effectiveEndDate)) {
            throw new IllegalArgumentException("This contract site is already assigned to another employee in this date range.");
        }

        var assignments = new ArrayList<Map<String, Object>>();
        for (var employeeId : uniqueEmployeeIds) {
            var employee = loadAttendanceEmployee(companyId, employeeId);
            if ("terminated".equals(employee.status())) {
                throw new IllegalArgumentException("Terminated employees cannot receive contract site assignments.");
            }

            validateEmployeeIsFreeForAssignment(companyId, employeeId, effectiveStartDate, effectiveEndDate);
            ensureEmployeeAllowedLocation(companyId, userId, employeeId, location.id());
            var assignmentId = insertWorkSiteAssignment(
                companyId,
                userId,
                employeeId,
                location.id(),
                effectiveStartDate,
                effectiveEndDate
            );
            if (template != null) {
                jdbcTemplate.update(
                    """
                        INSERT INTO hr_employee_schedule_assignments
                        (company_id, employee_id, template_id, effective_start_date, effective_end_date, status, created_by)
                        VALUES (?, ?, ?, ?, ?, 'active', ?)
                        """,
                    companyId,
                    employeeId,
                    template.templateId(),
                    effectiveStartDate,
                    effectiveEndDate,
                    userId
                );
            }

            var assignment = new LinkedHashMap<String, Object>();
            assignment.put("id", assignmentId);
            assignment.put("employee_id", employeeId);
            assignment.put("employee_name", employee.fullName());
            assignment.put("location_id", location.id());
            assignment.put("location_name", location.name());
            assignment.put("location", toLocationMap(location));
            assignment.put("template_id", template == null ? null : template.templateId());
            assignment.put("template_name", template == null ? null : displayScheduleTemplateName(template.templateName()));
            assignment.put("effective_start_date", effectiveStartDate.toString());
            assignment.put("effective_end_date", effectiveEndDate == null ? null : effectiveEndDate.toString());
            assignment.put("status", "active");
            assignments.add(assignment);
        }

        return Map.of(
            "assigned_count", assignments.size(),
            "location", toLocationMap(location),
            "assignments", assignments
        );
    }

    @Transactional
    public Map<String, Object> clearEmployeeWorkAssignments(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var employeeId = parseLong(payload, "employee_id");
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("employee_id is required.");
        }
        var date = HrPayloadUtils.parseDate(payload, "date", "effective_start_date", "start_date");
        if (date == null) {
            throw new IllegalArgumentException("date is required.");
        }

        var employee = loadAttendanceEmployee(companyId, employeeId);
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("Terminated employees cannot have work assignments updated.");
        }

        var scheduleAssignmentsCleared = closeOverlappingAssignments(companyId, userId, employeeId, date, date);
        var workSiteAssignmentsCleared = closeOverlappingWorkSiteAssignments(companyId, userId, employeeId, date, date);

        return Map.of(
            "employee_id", employeeId,
            "employee_name", employee.fullName(),
            "date", date.toString(),
            "schedule_assignments_cleared", scheduleAssignmentsCleared,
            "work_site_assignments_cleared", workSiteAssignmentsCleared
        );
    }

    public Map<String, Object> extractCoordinatesFromMapLink(Map<String, Object> payload) {
        return googleMapsCoordinateExtractor.extractCoordinatesFromMapLink(normalizePayload(payload));
    }

    @Transactional
    public Map<String, Object> saveLocation(long companyId, long userId, Long locationId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var name = stringValue(payload, "name", "nombre");
        if (name.isBlank()) {
            throw new IllegalArgumentException("name is required.");
        }

        var latitude = parseDecimalRequired(payload, "latitude");
        var longitude = parseDecimalRequired(payload, "longitude");
        var radiusMeters = HrPayloadUtils.parseInteger(payload, "radius_meters", "radius");
        if (radiusMeters == null || radiusMeters <= 0) {
            throw new IllegalArgumentException("radius_meters must be greater than zero.");
        }
        var contractStartDate = HrPayloadUtils.parseDate(payload, "contract_start_date", "contractStartDate");
        if (contractStartDate == null) {
            throw new IllegalArgumentException("contract_start_date is required.");
        }
        var contractEndDate = HrPayloadUtils.parseDate(payload, "contract_end_date", "contractEndDate");
        if (contractEndDate == null) {
            throw new IllegalArgumentException("contract_end_date is required.");
        }
        if (contractEndDate.isBefore(contractStartDate)) {
            throw new IllegalArgumentException("contract_end_date must be on or after contract_start_date.");
        }
        var requiredStartTime = parseTime(payload, "required_start_time");
        if (requiredStartTime == null) {
            requiredStartTime = LocalTime.of(8, 0);
        }
        var requiredEndTime = parseTime(payload, "required_end_time");
        if (requiredEndTime == null) {
            requiredEndTime = LocalTime.of(16, 0);
        }
        validatePreferredTimeRange(requiredStartTime, requiredEndTime);
        var requiredHoursPerDay = normalizeRequiredHoursPerDay(
            HrPayloadUtils.parseBigDecimal(payload, "required_hours_per_day", "requiredHoursPerDay")
        );
        var requiredDaysPerWeek = HrPayloadUtils.parseInteger(payload, "required_days_per_week", "requiredDaysPerWeek");
        if (requiredDaysPerWeek == null) {
            requiredDaysPerWeek = 5;
        }
        if (requiredDaysPerWeek < 1 || requiredDaysPerWeek > 7) {
            throw new IllegalArgumentException("required_days_per_week must be between 1 and 7.");
        }
        var unitId = normalizeOptionalForeignKey(parseLong(payload, "unit_id", "unitId"));
        var businessId = normalizeOptionalForeignKey(parseLong(payload, "business_id", "businessId"));

        var status = normalizeManagedStatus(stringValue(payload, "status"));
        ensureUniqueLocationName(companyId, locationId, name);
        validateOperationalScope(companyId, unitId, businessId, null);

        if (locationId == null || locationId <= 0) {
            var insertRequiredStartTime = requiredStartTime;
            var insertRequiredEndTime = requiredEndTime;
            var insertRequiredDaysPerWeek = requiredDaysPerWeek;
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO hr_attendance_locations
                        (company_id, unit_id, business_id, contract_start_date, contract_end_date, name, latitude, longitude, radius_meters, required_hours_per_day, required_start_time, required_end_time, required_days_per_week, status, managed_source, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'contract_site', ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                setNullableLong(statement, 2, unitId);
                setNullableLong(statement, 3, businessId);
                statement.setObject(4, contractStartDate);
                statement.setObject(5, contractEndDate);
                statement.setString(6, name);
                statement.setBigDecimal(7, latitude);
                statement.setBigDecimal(8, longitude);
                statement.setInt(9, radiusMeters);
                statement.setBigDecimal(10, requiredHoursPerDay);
                statement.setObject(11, insertRequiredStartTime);
                statement.setObject(12, insertRequiredEndTime);
                statement.setInt(13, insertRequiredDaysPerWeek);
                statement.setString(14, status);
                statement.setLong(15, userId);
                return statement;
            }, keyHolder);
            locationId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        } else {
            var updated = jdbcTemplate.update(
                """
                    UPDATE hr_attendance_locations
                    SET unit_id = ?,
                        business_id = ?,
                        contract_start_date = ?,
                        contract_end_date = ?,
                        name = ?,
                        latitude = ?,
	                        longitude = ?,
	                        radius_meters = ?,
	                        required_hours_per_day = ?,
	                        required_start_time = ?,
	                        required_end_time = ?,
	                        required_days_per_week = ?,
	                        status = ?,
                            managed_source = 'contract_site'
                    WHERE id = ? AND company_id = ?
                    """,
                unitId,
                businessId,
                contractStartDate,
                contractEndDate,
                name,
                latitude,
	                longitude,
	                radiusMeters,
	                requiredHoursPerDay,
	                requiredStartTime,
	                requiredEndTime,
	                requiredDaysPerWeek,
                status,
                locationId,
                companyId
            );
            if (updated == 0) {
                throw new NoSuchElementException("Attendance location not found.");
            }
        }

        var location = loadLocation(companyId, locationId);
        return Map.of("location", toLocationMap(location));
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
            item.put("block_after_grace_period", template.blockAfterGracePeriod());
            item.put("enforce_location", template.enforceLocation());
            item.put("location_id", template.locationId());
            item.put("location_name", template.locationName());
            item.put("employees_assigned_count", assignedCountsByTemplate.getOrDefault(template.templateId(), 0));
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
        var blockAfterGracePeriod = parseBoolean(payload, "block_after_grace_period")
            || parseBoolean(payload, "disallow_after_grace_period")
            || parseBoolean(payload, "no_permitir_despues_tolerancia");
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
                        INSERT INTO hr_schedule_templates
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
                    UPDATE hr_schedule_templates
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

            jdbcTemplate.update("DELETE FROM hr_schedule_template_days WHERE template_id = ?", templateId);
        }

        for (var day : days) {
            jdbcTemplate.update(
                """
                    INSERT INTO hr_schedule_template_days
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

    @Transactional
    public void deleteLocation(long companyId, long locationId) {
        loadLocation(companyId, locationId);
        jdbcTemplate.update(
            """
                UPDATE hr_schedule_templates
                SET enforce_location = 0,
                    location_id = NULL
                WHERE company_id = ?
                  AND location_id = ?
                """,
            companyId,
            locationId
        );
        var deleted = jdbcTemplate.update(
            "DELETE FROM hr_attendance_locations WHERE company_id = ? AND id = ?",
            companyId,
            locationId
        );
        if (deleted == 0) {
            throw new NoSuchElementException("Attendance location not found.");
        }
    }

    @Transactional
    public Map<String, Object> bulkAssignScheduleTemplate(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var templateId = parseLong(payload, "template_id");
        if (templateId == null || templateId <= 0) {
            throw new IllegalArgumentException("template_id is required.");
        }

        var template = loadExistingTemplate(companyId, templateId);
        if (!"active".equals(template.status())) {
            throw new IllegalArgumentException("Only active schedule templates can be assigned.");
        }

        var employeeIds = HrPayloadUtils.longList(payload, "employee_ids");
        if (employeeIds.isEmpty()) {
            throw new IllegalArgumentException("employee_ids is required.");
        }

        var effectiveStartDate = HrPayloadUtils.parseDate(payload, "effective_start_date", "start_date");
        if (effectiveStartDate == null) {
            throw new IllegalArgumentException("effective_start_date is required.");
        }

        var effectiveEndDate = HrPayloadUtils.parseDate(payload, "effective_end_date", "end_date");
        if (effectiveEndDate != null && effectiveEndDate.isBefore(effectiveStartDate)) {
            throw new IllegalArgumentException("effective_end_date must be on or after effective_start_date.");
        }

        var assignments = new ArrayList<Map<String, Object>>();
        for (var employeeId : employeeIds) {
            var employee = loadAttendanceEmployee(companyId, employeeId);
            if ("terminated".equals(employee.status())) {
                throw new IllegalArgumentException("Terminated employees cannot receive schedule assignments.");
            }

            validateEmployeeIsFreeForAssignment(companyId, employeeId, effectiveStartDate, effectiveEndDate);
            jdbcTemplate.update(
                """
                    INSERT INTO hr_employee_schedule_assignments
                    (company_id, employee_id, template_id, effective_start_date, effective_end_date, status, created_by)
                    VALUES (?, ?, ?, ?, ?, 'active', ?)
                    """,
                companyId,
                employeeId,
                templateId,
                effectiveStartDate,
                effectiveEndDate,
                userId
            );

            var assignment = new LinkedHashMap<String, Object>();
            assignment.put("employee_id", employeeId);
            assignment.put("employee_name", employee.fullName());
            assignment.put("template_id", templateId);
            assignment.put("template_name", displayScheduleTemplateName(template.templateName()));
            assignment.put("effective_start_date", effectiveStartDate.toString());
            assignment.put("effective_end_date", effectiveEndDate == null ? null : effectiveEndDate.toString());
            assignments.add(assignment);
        }

        return Map.of(
            "assigned_count", assignments.size(),
            "template_id", templateId,
            "template_name", displayScheduleTemplateName(template.templateName()),
            "assignments", assignments
        );
    }

    public Map<String, Object> createPhotoUpload(long companyId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var employeeId = parseLong(payload, "employee_id");
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("employee_id is required.");
        }

        var employee = loadAttendanceEmployee(companyId, employeeId);
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("This employee is terminated and cannot record attendance.");
        }

        var contentType = normalizeImageContentType(stringValue(payload, "content_type"));
        var eventType = stringValue(payload, "event_type");
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        var resolvedEventTimestamp = eventTimestamp == null ? LocalDateTime.now() : eventTimestamp;
        var normalizedEventType = normalizeEventType(eventType.isBlank() ? "check_in" : eventType);
        var attendanceDate = resolveOperationalAttendanceDate(companyId, employeeId, resolvedEventTimestamp, normalizedEventType);
        var objectKey = buildAttendancePhotoObjectKey(companyId, employeeId, contentType, eventType, attendanceDate);
        var bucketName = attendanceBucket();
        var upload = objectStorageService.presignUpload(
            bucketName,
            objectKey,
            contentType,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt().toString());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    @Transactional
    public Map<String, Object> createSelfPhotoUpload(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var employee = resolveSessionAttendanceEmployee(companyId, userId);
        var normalizedPayload = new LinkedHashMap<String, Object>(payload);
        normalizedPayload.put("employee_id", employee.id());
        return createPhotoUpload(companyId, normalizedPayload);
    }

    public Map<String, Object> recordKioskEvent(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var employeeId = parseLong(payload, "employee_id");
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("employee_id is required.");
        }

        var employee = loadAttendanceEmployee(companyId, employeeId);
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("This employee is terminated and cannot record attendance.");
        }

        var eventKind = normalizeEventKind(stringValue(payload, "event_kind", "event_type", "registro_tipo"));
        var eventType = normalizeEventTypeForStorage(eventKind);
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        if (eventTimestamp == null) {
            eventTimestamp = LocalDateTime.now();
        }
        validateOperationalEventDate(eventKind, eventTimestamp);
        var accessProfile = loadOrCreateAccessProfile(companyId, employeeId, userId);
        var authMethod = resolveRequestedAuthMethod(payload, accessProfile.defaultMethod());
        var kioskDeviceId = normalizeOptionalForeignKey(parseLong(payload, "kiosk_device_id"));
        var kioskDevice = kioskDeviceId == null ? null : loadKioskDevice(companyId, kioskDeviceId);
        var activeAccessMethod = resolveActiveAccessMethod(companyId, accessProfile.id(), authMethod);
        var faceVerificationSessionId = normalizeOptionalForeignKey(parseLong(payload, "face_verification_session_id"));
        var credentialPayload = nullable(stringValue(payload, "credential_payload", "credential", "pin", "password", "badge_code"));
        var notes = nullable(stringValue(payload, "notes"));
        var metadataJson = toJson(payload.get("metadata"));

        var requestedLocationId = parseLong(payload, "location_id");
        BigDecimal latitude = null;
        BigDecimal longitude = null;
        LocationRow location = null;
        var photoObjectKey = normalizeAttendancePhotoObjectKey(companyId, employeeId, stringValue(payload, "photo_url"));

        if (!"auth_attempt".equals(eventKind)) {
            latitude = parseDecimalRequired(payload, "latitude");
            longitude = parseDecimalRequired(payload, "longitude");
        } else if (kioskDevice != null && kioskDevice.locationId() != null) {
            location = loadLocation(companyId, kioskDevice.locationId());
        }

        var authResultStatus = validateAuthAttempt(companyId, accessProfile, activeAccessMethod, authMethod, credentialPayload);
        var authAttemptMetadata = mergeMetadataJson(metadataJson, Map.of(
            "employee_id", employeeId,
            "event_kind", eventKind
        ));
        var authAttemptId = appendAttendanceEvent(
            companyId,
            employeeId,
            "auth_attempt",
            eventTimestamp,
            eventTimestamp.toLocalDate(),
            location == null ? null : location.id(),
            kioskDevice == null ? null : kioskDevice.id(),
            latitude,
            longitude,
            null,
            "kiosk",
            authMethod,
            authResultStatus,
            "auth_attempt",
            authAttemptMetadata,
            notes,
            null,
            userId
        );

        if ("failure".equals(authResultStatus) || "rejected".equals(authResultStatus)) {
            throw new IllegalArgumentException("Credential validation failed.");
        }

        if ("auth_attempt".equals(eventKind)) {
            return Map.of(
                "event_id", authAttemptId,
                "employee_id", employeeId,
                "result_status", authResultStatus,
                "auth_method", authMethod
            );
        }

        if ("facial_recognition".equals(authMethod)) {
            hrFaceService.consumeSuccessfulVerificationSession(companyId, employeeId, faceVerificationSessionId);
        }
        var attendanceDate = resolveOperationalAttendanceDate(companyId, employeeId, eventTimestamp, eventKind);
        var scheduleRule = loadScheduleRule(companyId, employeeId, attendanceDate);
        var activeWorkSite = loadActiveWorkSiteAssignment(companyId, employeeId, attendanceDate);
        if (!"auth_attempt".equals(eventKind)) {
            var resolvedLocationId = requestedLocationId == null && kioskDevice != null ? kioskDevice.locationId() : requestedLocationId;
            location = resolveScheduleRegistrationLocation(
                companyId,
                employee,
                scheduleRule,
                eventKind,
                resolvedLocationId,
                latitude,
                longitude,
                activeWorkSite
            );
        }
        validateScheduleRegistrationPolicy(scheduleRule, eventKind, eventTimestamp, attendanceDate);
        validateOperationalEventTransition(companyId, employeeId, attendanceDate, eventTimestamp, eventKind);

        var operationalResultStatus = "manual_override".equals(authMethod) ? "overridden" : "success";
        var operationalEventId = appendAttendanceEvent(
            companyId,
            employeeId,
            eventType,
            eventTimestamp,
            attendanceDate,
            location == null ? null : location.id(),
            kioskDevice == null ? null : kioskDevice.id(),
            latitude,
            longitude,
            photoObjectKey,
            "kiosk",
            authMethod,
            operationalResultStatus,
            eventKind,
            metadataJson,
            notes,
            null,
            userId
        );

        var dailyRecord = rebuildDailyRecordProjection(companyId, employeeId, attendanceDate);
        var result = new LinkedHashMap<String, Object>();
        result.put("event_id", operationalEventId);
        result.put("auth_attempt_event_id", authAttemptId);
        result.put("employee_id", employeeId);
        result.put("event_kind", eventKind);
        result.put("auth_method", authMethod);
        result.put("result_status", operationalResultStatus);
        result.put("status", resolveEffectiveStatus(dailyRecord, scheduleRule, attendanceDate));
        result.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
        result.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
        result.put("location", toLocationMap(location));
        result.put("active_work_site", activeWorkSite == null ? null : toWorkSiteAssignmentMap(activeWorkSite));
        result.put("photo_object_key", photoObjectKey);
        return result;
    }

    @Transactional
    public Map<String, Object> recordSelfKioskEvent(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var employee = resolveSessionAttendanceEmployee(companyId, userId);
        var normalizedPayload = new LinkedHashMap<String, Object>(payload);
        normalizedPayload.put("employee_id", employee.id());
        return recordKioskEvent(companyId, userId, normalizedPayload);
    }

    @Scheduled(fixedDelayString = "${app.hr.attendance.auto-checkout-delay-ms:300000}")
    @Transactional
    public void autoCheckoutOpenAttendanceRecords() {
        var now = LocalDateTime.now();
        var candidates = loadAutoCheckoutCandidates(now.toLocalDate());

        for (var candidate : candidates) {
            var scheduleRule = loadScheduleRule(candidate.companyId(), candidate.employeeId(), candidate.attendanceDate());
            if (scheduleRule == null || scheduleRule.isRestDay() || scheduleRule.endTime() == null) {
                continue;
            }

            var checkoutAt = scheduledEndDateTime(candidate.attendanceDate(), scheduleRule);
            if (checkoutAt.isAfter(now)) {
                continue;
            }
            if (candidate.firstCheckInAt() != null && checkoutAt.isBefore(candidate.firstCheckInAt())) {
                checkoutAt = candidate.firstCheckInAt();
            }
            if (hasSuccessfulCheckoutEvent(candidate.companyId(), candidate.employeeId(), candidate.attendanceDate())) {
                rebuildDailyRecordProjection(candidate.companyId(), candidate.employeeId(), candidate.attendanceDate());
                continue;
            }

            appendAttendanceEvent(
                candidate.companyId(),
                candidate.employeeId(),
                "check_out",
                checkoutAt,
                candidate.attendanceDate(),
                candidate.firstLocationId(),
                null,
                null,
                null,
                null,
                "system",
                "auto_checkout",
                "success",
                "check_out",
                toJson(Map.of(
                    "auto_checkout", true,
                    "reason", "missing_checkout",
                    "scheduled_end_time", scheduleRule.endTime().toString()
                )),
                "Auto checkout at scheduled end time.",
                null,
                0L
            );
            rebuildDailyRecordProjection(candidate.companyId(), candidate.employeeId(), candidate.attendanceDate());
        }
    }

    public Map<String, Object> updateDailyRecord(long companyId, long userId, long employeeId, LocalDate date, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var employee = loadAttendanceEmployee(companyId, employeeId);
        ensureAttendanceDateEditable(employee, date);
        var targetStatusRaw = stringValue(payload, "status", "corrected_status");
        var correctedStatus = targetStatusRaw.isBlank() ? null : normalizeAttendanceStatus(targetStatusRaw);
        var scheduleRule = loadScheduleRule(companyId, employeeId, date);
        var notes = nullable(stringValue(payload, "notes"));
        var correctionMetadata = new LinkedHashMap<String, Object>();
        correctionMetadata.put("corrected_status", correctedStatus);
        correctionMetadata.put("notes", notes);
        correctionMetadata.put("clear_correction", correctedStatus == null);
        var metadataJson = toJson(correctionMetadata);
        appendAttendanceEvent(
            companyId,
            employeeId,
            "correction",
            date.atTime(23, 59, 59),
            date,
            null,
            null,
            null,
            null,
            null,
            "admin",
            "manual_override",
            "overridden",
            "correction",
            metadataJson,
            notes,
            null,
            userId
        );

        var refreshed = rebuildDailyRecordProjection(companyId, employeeId, date);

        var body = new LinkedHashMap<String, Object>();
        body.put("employee_id", employeeId);
        body.put("date", date.toString());
        body.put("attendance_editable", true);
        body.put("edit_lock_reason", null);
        body.put("system_status", resolveSystemStatus(refreshed, scheduleRule, date));
        body.put("corrected_status", refreshed != null ? refreshed.correctedStatus() : null);
        body.put("effective_status", resolveEffectiveStatus(refreshed, scheduleRule, date));
        body.put("notes", refreshed != null ? refreshed.notes() : null);
        return body;
    }

    @Transactional
    public Map<String, Object> updateSelfDailyRecord(long companyId, long userId, LocalDate date, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var employee = resolveSessionAttendanceEmployee(companyId, userId);
        return updateDailyRecord(companyId, userId, employee.id(), date, payload);
    }

    private AttendanceEmployee loadAttendanceEmployee(long companyId, long employeeId) {
        var employees = jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       e.hire_date AS hire_date,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       u.id AS unit_id,
                       u.name AS unit_name,
                       b.id AS business_id,
                       b.name AS business_name
                FROM hr_employees e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.company_id = ?
                  AND e.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapAttendanceEmployee(rs),
            companyId,
            employeeId
        );

        if (employees.isEmpty()) {
            throw new NoSuchElementException("Employee not found.");
        }
        return employees.getFirst();
    }

    private AttendanceEmployee resolveSessionAttendanceEmployee(long companyId, long userId) {
        var linkedEmployees = jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       e.hire_date AS hire_date,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       unit_ref.id AS unit_id,
                       unit_ref.name AS unit_name,
                       business_ref.id AS business_id,
                       business_ref.name AS business_name
                FROM hr_employee_portal_access access_ref
                JOIN hr_employees e ON e.id = access_ref.employee_id
                LEFT JOIN units unit_ref ON unit_ref.id = e.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = e.business_id
                WHERE access_ref.company_id = ?
                  AND e.company_id = ?
                  AND access_ref.linked_user_id = ?
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                ORDER BY e.id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> mapAttendanceEmployee(rs),
            companyId,
            companyId,
            userId
        );

        if (!linkedEmployees.isEmpty()) {
            return linkedEmployees.getFirst();
        }

        var sessionUser = loadAttendanceSessionUser(companyId, userId);
        var emailMatchedEmployees = jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       e.hire_date AS hire_date,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       unit_ref.id AS unit_id,
                       unit_ref.name AS unit_name,
                       business_ref.id AS business_id,
                       business_ref.name AS business_name,
                       access_ref.linked_user_id
                FROM hr_employees e
                LEFT JOIN hr_employee_portal_access access_ref ON access_ref.employee_id = e.id
                LEFT JOIN units unit_ref ON unit_ref.id = e.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = e.business_id
                WHERE e.company_id = ?
                  AND LOWER(COALESCE(e.email, '')) = ?
                ORDER BY e.id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> new EmailMatchedAttendanceEmployee(
                mapAttendanceEmployee(rs),
                getNullableLong(rs, "linked_user_id")
            ),
            companyId,
            sessionUser.email()
        );

        if (!emailMatchedEmployees.isEmpty()) {
            var matchedEmployee = emailMatchedEmployees.getFirst();
            if ("terminated".equals(matchedEmployee.employee().status())) {
                throw new IllegalArgumentException("Your HR employee profile is terminated. Contact an administrator.");
            }
            if (matchedEmployee.linkedUserId() != null && matchedEmployee.linkedUserId() != userId) {
                throw new IllegalArgumentException("Your employee profile is already linked to another user.");
            }

            bindEmployeeToPlatformUser(companyId, matchedEmployee.employee().id(), userId);
            ensureAttendanceProfileDependencies(companyId, matchedEmployee.employee().id(), userId);
            return loadAttendanceEmployee(companyId, matchedEmployee.employee().id());
        }

        var provisionedEmployeeId = provisionAttendanceEmployeeForUser(companyId, userId, sessionUser);
        return loadAttendanceEmployee(companyId, provisionedEmployeeId);
    }

    private AttendanceSessionUser loadAttendanceSessionUser(long companyId, long userId) {
        var rows = jdbcTemplate.query(
            """
                SELECT u.id,
                       LOWER(TRIM(COALESCE(u.email, ''))) AS email,
                       COALESCE(NULLIF(TRIM(u.full_name), ''), TRIM(u.email), CONCAT('User ', u.id)) AS full_name
                FROM users u
                JOIN user_companies uc ON uc.user_id = u.id
                WHERE u.id = ?
                  AND uc.company_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                LIMIT 1
                """,
            (rs, rowNum) -> new AttendanceSessionUser(
                rs.getLong("id"),
                safe(rs.getString("email")),
                safe(rs.getString("full_name"))
            ),
            userId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("No active company user was found for the current session.");
        }

        var sessionUser = rows.getFirst();
        if (sessionUser.email().isBlank()) {
            throw new IllegalArgumentException("Your user account must have an email address to use Attendance.");
        }
        return sessionUser;
    }

    private long provisionAttendanceEmployeeForUser(long companyId, long userId, AttendanceSessionUser sessionUser) {
        var nameParts = deriveEmployeeName(sessionUser.fullName(), sessionUser.email());
        var employeeNumber = generateNextAttendanceEmployeeNumber(companyId);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_employees
                    (company_id, employee_number, first_name, last_name, email, hire_date, pay_period, salary_type, contract_type, status, created_by)
                    VALUES (?, ?, ?, ?, ?, CURRENT_DATE(), 'weekly', 'daily', 'permanent', 'active', ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setString(2, employeeNumber);
            statement.setString(3, nameParts.firstName());
            statement.setString(4, nameParts.lastName());
            statement.setString(5, sessionUser.email());
            statement.setLong(6, userId);
            return statement;
        }, keyHolder);

        var employeeId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        if (employeeId <= 0) {
            throw new IllegalStateException("The employee profile could not be provisioned.");
        }

        bindEmployeeToPlatformUser(companyId, employeeId, userId);
        ensureAttendanceProfileDependencies(companyId, employeeId, userId);
        return employeeId;
    }

    private void bindEmployeeToPlatformUser(long companyId, long employeeId, long userId) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_portal_access
                (employee_id, company_id, access_role, linked_user_id, invitation_status, created_by)
                VALUES (?, ?, 'employee', ?, 'linked', ?)
                ON DUPLICATE KEY UPDATE
                  company_id = VALUES(company_id),
                  linked_user_id = VALUES(linked_user_id),
                  invitation_status = VALUES(invitation_status),
                  updated_at = CURRENT_TIMESTAMP
                """,
            employeeId,
            companyId,
            userId,
            userId
        );
    }

    private void ensureAttendanceProfileDependencies(long companyId, long employeeId, long userId) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_profiles (employee_id, company_id, workday_hours)
                VALUES (?, ?, 8.00)
                ON DUPLICATE KEY UPDATE
                  company_id = VALUES(company_id),
                  updated_at = CURRENT_TIMESTAMP
                """,
            employeeId,
            companyId
        );
        ensureDefaultAccessProfile(companyId, employeeId, userId);
    }

    private AttendanceNameParts deriveEmployeeName(String fullName, String email) {
        var normalizedFullName = fullName == null ? "" : fullName.trim().replaceAll("\\s+", " ");
        if (normalizedFullName.isBlank()) {
            var emailLocalPart = email == null ? "" : email.trim();
            var atIndex = emailLocalPart.indexOf('@');
            normalizedFullName = atIndex > 0 ? emailLocalPart.substring(0, atIndex) : emailLocalPart;
            normalizedFullName = normalizedFullName.replace('.', ' ').replace('_', ' ').replace('-', ' ').trim();
        }

        if (normalizedFullName.isBlank()) {
            return new AttendanceNameParts("User", "Attendance");
        }

        var parts = normalizedFullName.split("\\s+");
        var firstName = parts[0].trim();
        var lastName = parts.length > 1
            ? String.join(" ", java.util.Arrays.copyOfRange(parts, 1, parts.length)).trim()
            : "User";

        if (firstName.isBlank()) {
            firstName = "User";
        }
        if (lastName.isBlank()) {
            lastName = "User";
        }
        return new AttendanceNameParts(firstName, lastName);
    }

    private void ensureAttendanceEmployeeNumberSequenceRow(long companyId) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_number_sequences (company_id, prefix, padding, next_number)
                SELECT ?, 'EMP', 4,
                       COALESCE(MAX(
                         CASE
                           WHEN TRIM(COALESCE(employee_number, '')) REGEXP '^EMP-[0-9]+$'
                             THEN CAST(SUBSTRING(TRIM(employee_number), 5) AS UNSIGNED)
                           ELSE 0
                         END
                       ), 0) + 1
                FROM hr_employees
                WHERE company_id = ?
                ON DUPLICATE KEY UPDATE
                  next_number = GREATEST(hr_employee_number_sequences.next_number, VALUES(next_number))
                """,
            companyId,
            companyId
        );
    }

    private AttendanceEmployeeNumberSequence loadAttendanceEmployeeNumberSequence(long companyId) {
        ensureAttendanceEmployeeNumberSequenceRow(companyId);

        var rows = jdbcTemplate.query(
            """
                SELECT prefix, padding, next_number
                FROM hr_employee_number_sequences
                WHERE company_id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new AttendanceEmployeeNumberSequence(
                safe(rs.getString("prefix")),
                rs.getInt("padding"),
                rs.getLong("next_number")
            ),
            companyId
        );

        if (rows.isEmpty()) {
            throw new IllegalStateException("Employee number sequence could not be initialized.");
        }

        return rows.getFirst();
    }

    private String generateNextAttendanceEmployeeNumber(long companyId) {
        while (true) {
            var sequence = loadAttendanceEmployeeNumberSequence(companyId);
            var candidate = formatAttendanceEmployeeNumber(sequence.prefix(), sequence.padding(), sequence.nextNumber());

            jdbcTemplate.update(
                """
                    UPDATE hr_employee_number_sequences
                    SET next_number = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ?
                    """,
                sequence.nextNumber() + 1,
                companyId
            );

            Integer count = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM hr_employees
                    WHERE company_id = ?
                      AND employee_number = ?
                    """,
                Integer.class,
                companyId,
                candidate
            );
            if (count == null || count == 0) {
                return candidate;
            }
        }
    }

    private String formatAttendanceEmployeeNumber(String prefix, int padding, long nextNumber) {
        return AttendanceEmployeeNumberPolicy.format(prefix, padding, nextNumber);
    }

    private String normalizeAttendanceEmployeeNumberPrefix(String prefix) {
        return AttendanceEmployeeNumberPolicy.normalizePrefix(prefix);
    }

    private List<AttendanceEmployee> listAttendanceEmployees(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       e.hire_date AS hire_date,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       u.id AS unit_id,
                       u.name AS unit_name,
                       b.id AS business_id,
                       b.name AS business_name
                FROM hr_employees e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.company_id = ?
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                ORDER BY full_name ASC, e.id ASC
                """,
            (rs, rowNum) -> mapAttendanceEmployee(rs),
            companyId
        );
    }

    private AttendanceEmployee mapAttendanceEmployee(ResultSet rs) throws SQLException {
        return new AttendanceEmployee(
            rs.getLong("id"),
            safe(rs.getString("employee_number")),
            safe(rs.getString("full_name")),
            safe(rs.getString("position")),
            safe(rs.getString("department")),
            rs.getObject("hire_date", LocalDate.class),
            safe(rs.getString("status")),
            getNullableLong(rs, "unit_id"),
            safe(rs.getString("unit_name")),
            getNullableLong(rs, "business_id"),
            safe(rs.getString("business_name"))
        );
    }

    private Map<String, Object> toScheduleCandidateMap(AttendanceEmployee employee) {
        var item = new LinkedHashMap<String, Object>();
        item.put("employee_id", employee.id());
        item.put("employee_number", employee.employeeNumber());
        item.put("employee_name", employee.fullName());
        item.put("position_title", employee.positionTitle());
        item.put("department", employee.department());
        item.put("employee_status", employee.status());
        item.put("unit_id", employee.unitId());
        item.put("unit_name", employee.unitName());
        item.put("business_id", employee.businessId());
        item.put("business_name", employee.businessName());
        item.put("hire_date", dateString(employee.hireDate()));
        item.put("schedule_template_id", null);
        item.put("schedule_template_name", null);
        item.put("effective_start_date", null);
        item.put("effective_end_date", null);
        item.put("today_rule", null);
        item.put("today_status", "not_scheduled");
        item.put("system_status", "not_scheduled");
        item.put("corrected_status", null);
        item.put("first_check_in_at", null);
        item.put("last_check_out_at", null);
        item.put("first_location", null);
        item.put("last_location", null);
        item.put("minutes_late", 0);
        item.put("allowed_locations", List.of());
        item.put("active_work_site", null);
        item.put("access_profile", null);
        item.put("latest_event", null);
        return item;
    }

    private Map<String, Object> toScheduleCandidateMap(
        long companyId,
        AttendanceEmployee employee,
        LocalDate date,
        LocalDate endDate,
        CurrentScheduleAssignment assignment,
        ScheduleRule scheduleRule,
        DailyRecordRow dailyRecord,
        WorkSiteAssignmentRow activeWorkSite
    ) {
        var item = toScheduleCandidateMap(employee);
        var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule, date);
        var systemStatus = resolveSystemStatus(dailyRecord, scheduleRule, date);
        var editLockReason = attendanceEditLockReason(employee, date);
        var hasAttendanceActivity = dailyRecord != null
            && (dailyRecord.firstCheckInAt() != null || dailyRecord.lastCheckOutAt() != null);
        var busyReason = "";
        var hasRangeAttendanceActivity = hasAttendanceActivityInRange(companyId, employee.id(), date, endDate);

        if (assignment != null) {
            item.put("schedule_template_id", assignment.templateId());
            item.put("schedule_template_name", displayScheduleTemplateName(assignment.templateName()));
            item.put("effective_start_date", assignment.effectiveStartDate().toString());
            item.put("effective_end_date", assignment.effectiveEndDate() == null ? null : assignment.effectiveEndDate().toString());
            busyReason = "Schedule already assigned";
        }
        if (scheduleRule != null) {
            item.put("today_rule", toScheduleRuleMap(scheduleRule));
        }
        if (dailyRecord != null) {
            item.put("corrected_status", dailyRecord.correctedStatus());
            item.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
            item.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
            item.put("first_location", toLocationMap(dailyRecord.firstLocation()));
            item.put("last_location", toLocationMap(dailyRecord.lastLocation()));
            item.put("minutes_late", dailyRecord.minutesLate());
        }
        if (activeWorkSite != null) {
            item.put("active_work_site", toWorkSiteAssignmentMap(activeWorkSite));
            busyReason = "Contract site assigned";
        }
        if (hasRangeAttendanceActivity || hasAttendanceActivity) {
            busyReason = "Attendance already recorded";
        } else if (hasActiveWorkSiteAssignmentOverlap(companyId, employee.id(), date, endDate)) {
            busyReason = "Contract site assigned";
        } else if (hasActiveScheduleAssignmentOverlap(companyId, employee.id(), date, endDate)) {
            busyReason = "Schedule already assigned";
        }

        item.put("today_status", effectiveStatus);
        item.put("system_status", systemStatus);
        item.put("attendance_editable", editLockReason == null);
        item.put("edit_lock_reason", editLockReason);
        item.put("can_assign_schedule", busyReason.isBlank());
        item.put("schedule_busy_reason", busyReason.isBlank() ? null : busyReason);
        return item;
    }

    private String scheduleCandidateBaseWhere() {
        return """
            e.company_id = ?
              AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
              AND NOT EXISTS (
                  SELECT 1
                  FROM hr_employee_schedule_assignments schedule_assignment
                  JOIN hr_schedule_templates schedule_template ON schedule_template.id = schedule_assignment.template_id
                  WHERE schedule_assignment.company_id = e.company_id
                    AND schedule_assignment.employee_id = e.id
                    AND LOWER(COALESCE(schedule_assignment.status, 'active')) = 'active'
                    AND LOWER(COALESCE(schedule_template.status, 'active')) = 'active'
                    AND schedule_assignment.effective_start_date <= ?
                    AND (schedule_assignment.effective_end_date IS NULL OR schedule_assignment.effective_end_date >= ?)
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM hr_employee_work_site_assignments work_site_assignment
                  JOIN hr_attendance_locations work_site_location ON work_site_location.id = work_site_assignment.location_id
                  WHERE work_site_assignment.company_id = e.company_id
                    AND work_site_assignment.employee_id = e.id
                    AND LOWER(COALESCE(work_site_assignment.status, 'active')) = 'active'
                    AND LOWER(COALESCE(work_site_location.status, 'active')) = 'active'
                    AND work_site_assignment.effective_start_date <= ?
                    AND (work_site_assignment.effective_end_date IS NULL OR work_site_assignment.effective_end_date >= ?)
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM hr_attendance_events attendance_event
                  WHERE attendance_event.company_id = e.company_id
                    AND attendance_event.employee_id = e.id
                    AND attendance_event.attendance_date BETWEEN ? AND ?
                    AND attendance_event.event_type IN ('check_in', 'check_out', 'break_out', 'break_in')
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM hr_attendance_daily_records daily_record
                  WHERE daily_record.company_id = e.company_id
                    AND daily_record.employee_id = e.id
                    AND daily_record.attendance_date BETWEEN ? AND ?
                    AND (daily_record.first_check_in_at IS NOT NULL OR daily_record.last_check_out_at IS NOT NULL)
              )
            """;
    }

    private String scheduleCandidateEmployeeBaseWhere() {
        return """
            e.company_id = ?
              AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
            """;
    }

    private ArrayList<Object> scheduleCandidateBaseParams(long companyId, LocalDate startDate, LocalDate endDate) {
        var rangeEnd = assignmentRangeEnd(endDate);
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(rangeEnd);
        params.add(startDate);
        params.add(rangeEnd);
        params.add(startDate);
        params.add(startDate);
        params.add(rangeEnd);
        params.add(startDate);
        params.add(rangeEnd);
        return params;
    }

    private ArrayList<Object> scheduleCandidateEmployeeBaseParams(long companyId) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        return params;
    }

    private void appendScheduleCandidateFilters(
        StringBuilder where,
        List<Object> params,
        String normalizedSearch,
        Long unitId,
        Long businessId
    ) {
        if (normalizedSearch != null && !normalizedSearch.isBlank()) {
            var like = "%" + normalizedSearch + "%";
            where.append(
                """
                  AND (
                    LOWER(TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, '')))) LIKE ?
                    OR LOWER(COALESCE(e.employee_number, '')) LIKE ?
                    OR LOWER(COALESCE(e.position, '')) LIKE ?
                    OR LOWER(COALESCE(e.department, '')) LIKE ?
                  )
                """
            );
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
        if (unitId != null) {
            where.append(" AND e.unit_id = ?");
            params.add(unitId);
        }
        if (businessId != null) {
            where.append(" AND e.business_id = ?");
            params.add(businessId);
        }
    }

    private Map<Long, DailyRecordRow> loadDailyRecords(long companyId, LocalDate date) {
        var rows = jdbcTemplate.query(
            """
                SELECT r.id,
                       r.employee_id,
                       r.attendance_date,
                       r.system_status,
                       r.corrected_status,
                       r.first_check_in_at,
                       r.last_check_out_at,
                       r.minutes_late,
                       r.notes,
                       (
                           SELECT e.photo_url
                           FROM hr_attendance_events e
                           WHERE e.company_id = r.company_id
                             AND e.employee_id = r.employee_id
                             AND e.attendance_date = r.attendance_date
                             AND e.event_type = 'check_in'
                           ORDER BY CASE WHEN COALESCE(TRIM(e.photo_url), '') = '' THEN 1 ELSE 0 END ASC,
                                    e.event_timestamp ASC,
                                    e.id ASC
                           LIMIT 1
                       ) AS first_photo_object_key,
                       (
                           SELECT e.photo_url
                           FROM hr_attendance_events e
                           WHERE e.company_id = r.company_id
                             AND e.employee_id = r.employee_id
                             AND e.attendance_date = r.attendance_date
                             AND e.event_type = 'check_out'
                           ORDER BY CASE WHEN COALESCE(TRIM(e.photo_url), '') = '' THEN 1 ELSE 0 END ASC,
                                    e.event_timestamp DESC,
                                    e.id DESC
                           LIMIT 1
                       ) AS last_photo_object_key,
                       fl.id AS first_location_id,
                       fl.name AS first_location_name,
                       fl.latitude AS first_location_latitude,
                       fl.longitude AS first_location_longitude,
                       fl.radius_meters AS first_location_radius_meters,
                       ll.id AS last_location_id,
                       ll.name AS last_location_name,
                       ll.latitude AS last_location_latitude,
                       ll.longitude AS last_location_longitude,
                       ll.radius_meters AS last_location_radius_meters
                FROM hr_attendance_daily_records r
                LEFT JOIN hr_attendance_locations fl ON fl.id = r.first_location_id
                LEFT JOIN hr_attendance_locations ll ON ll.id = r.last_location_id
                WHERE r.company_id = ?
                  AND r.attendance_date = ?
                """,
            (rs, rowNum) -> mapDailyRecord(rs),
            companyId,
            date
        );
        var result = new HashMap<Long, DailyRecordRow>();
        for (var row : rows) {
            result.put(row.employeeId(), row);
        }
        return result;
    }

    private Map<LocalDate, DailyRecordRow> loadDailyRecords(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        var rows = jdbcTemplate.query(
            """
                SELECT r.id,
                       r.employee_id,
                       r.attendance_date,
                       r.system_status,
                       r.corrected_status,
                       r.first_check_in_at,
                       r.last_check_out_at,
                       r.minutes_late,
                       r.notes,
                       (
                           SELECT e.photo_url
                           FROM hr_attendance_events e
                           WHERE e.company_id = r.company_id
                             AND e.employee_id = r.employee_id
                             AND e.attendance_date = r.attendance_date
                             AND e.event_type = 'check_in'
                           ORDER BY CASE WHEN COALESCE(TRIM(e.photo_url), '') = '' THEN 1 ELSE 0 END ASC,
                                    e.event_timestamp ASC,
                                    e.id ASC
                           LIMIT 1
                       ) AS first_photo_object_key,
                       (
                           SELECT e.photo_url
                           FROM hr_attendance_events e
                           WHERE e.company_id = r.company_id
                             AND e.employee_id = r.employee_id
                             AND e.attendance_date = r.attendance_date
                             AND e.event_type = 'check_out'
                           ORDER BY CASE WHEN COALESCE(TRIM(e.photo_url), '') = '' THEN 1 ELSE 0 END ASC,
                                    e.event_timestamp DESC,
                                    e.id DESC
                           LIMIT 1
                       ) AS last_photo_object_key,
                       fl.id AS first_location_id,
                       fl.name AS first_location_name,
                       fl.latitude AS first_location_latitude,
                       fl.longitude AS first_location_longitude,
                       fl.radius_meters AS first_location_radius_meters,
                       ll.id AS last_location_id,
                       ll.name AS last_location_name,
                       ll.latitude AS last_location_latitude,
                       ll.longitude AS last_location_longitude,
                       ll.radius_meters AS last_location_radius_meters
                FROM hr_attendance_daily_records r
                LEFT JOIN hr_attendance_locations fl ON fl.id = r.first_location_id
                LEFT JOIN hr_attendance_locations ll ON ll.id = r.last_location_id
                WHERE r.company_id = ?
                  AND r.employee_id = ?
                  AND r.attendance_date BETWEEN ? AND ?
                """,
            (rs, rowNum) -> mapDailyRecord(rs),
            companyId,
            employeeId,
            startDate,
            endDate
        );
        var result = new HashMap<LocalDate, DailyRecordRow>();
        for (var row : rows) {
            result.put(row.attendanceDate(), row);
        }
        return result;
    }

    private DailyRecordRow loadDailyRecord(long companyId, long employeeId, LocalDate date) {
        return loadDailyRecords(companyId, employeeId, date, date).get(date);
    }

    private Map<String, Object> toPublicKioskDayActivity(LocalDate attendanceDate, DailyRecordRow dailyRecord, ScheduleRule scheduleRule) {
        var body = new LinkedHashMap<String, Object>();
        body.put("attendance_date", attendanceDate.toString());
        body.put("status", resolveEffectiveStatus(dailyRecord, scheduleRule, attendanceDate));
        body.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
        body.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
        body.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : 0);
        body.put("has_check_in", dailyRecord != null && dailyRecord.firstCheckInAt() != null);
        body.put("has_check_out", dailyRecord != null && dailyRecord.lastCheckOutAt() != null);
        return body;
    }

    private DailyRecordRow mapDailyRecord(ResultSet rs) throws SQLException {
        return new DailyRecordRow(
            rs.getLong("id"),
            rs.getLong("employee_id"),
            rs.getObject("attendance_date", LocalDate.class),
            normalizeAttendanceStatus(rs.getString("system_status")),
            normalizeNullableAttendanceStatus(rs.getString("corrected_status")),
            toLocalDateTime(rs.getTimestamp("first_check_in_at")),
            toLocalDateTime(rs.getTimestamp("last_check_out_at")),
            rs.getInt("minutes_late"),
            nullable(rs.getString("notes")),
            safe(rs.getString("first_photo_object_key")),
            safe(rs.getString("last_photo_object_key")),
            mapLocation(rs, "first_location"),
            mapLocation(rs, "last_location")
        );
    }

    private Map<Long, ScheduleRule> loadScheduleRules(long companyId, LocalDate date) {
        var rules = jdbcTemplate.query(
            """
                SELECT a.employee_id,
                       a.template_id,
                       a.effective_start_date,
                       a.effective_end_date,
                       t.schedule_mode,
                       t.block_after_grace_period,
                       t.enforce_location,
                       t.location_id,
                       l.name AS location_name,
                       d.start_time,
                       d.end_time,
                       d.meal_minutes,
                       d.rest_minutes,
                       d.late_after_minutes,
                       d.is_rest_day
                FROM hr_employee_schedule_assignments a
                JOIN hr_schedule_templates t ON t.id = a.template_id
                JOIN hr_schedule_template_days d
                  ON d.template_id = a.template_id
                 AND d.day_of_week = ?
                LEFT JOIN hr_attendance_locations l ON l.id = t.location_id
                WHERE a.company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(t.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.employee_id ASC, a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> new ScheduleRule(
                rs.getLong("employee_id"),
                rs.getLong("template_id"),
                safe(rs.getString("schedule_mode")),
                rs.getBoolean("block_after_grace_period"),
                rs.getBoolean("enforce_location"),
                getNullableLong(rs, "location_id"),
                safe(rs.getString("location_name")),
                rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class),
                rs.getInt("meal_minutes"),
                rs.getInt("rest_minutes"),
                rs.getInt("late_after_minutes"),
                rs.getBoolean("is_rest_day")
            ),
            date.getDayOfWeek().getValue(),
            companyId,
            date,
            date
        );

        var result = new HashMap<Long, ScheduleRule>();
        for (var rule : rules) {
            result.putIfAbsent(rule.employeeId(), rule);
        }
        return result;
    }

    private ScheduleRule loadScheduleRule(long companyId, long employeeId, LocalDate date) {
        return loadScheduleRules(companyId, date).get(employeeId);
    }

    private Map<Long, CurrentScheduleAssignment> loadCurrentAssignments(long companyId, LocalDate date) {
        var rows = jdbcTemplate.query(
            """
                SELECT a.employee_id,
                       a.template_id,
                       t.name AS template_name,
                       a.effective_start_date,
                       a.effective_end_date
                FROM hr_employee_schedule_assignments a
                JOIN hr_schedule_templates t ON t.id = a.template_id
                WHERE a.company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(t.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.employee_id ASC, a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> new CurrentScheduleAssignment(
                rs.getLong("employee_id"),
                rs.getLong("template_id"),
                safe(rs.getString("template_name")),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class)
            ),
            companyId,
            date,
            date
        );

        var result = new HashMap<Long, CurrentScheduleAssignment>();
        for (var row : rows) {
            result.putIfAbsent(row.employeeId(), row);
        }
        return result;
    }

    private Map<Long, Integer> loadActiveAssignmentCountsByTemplate(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT a.template_id, COUNT(*) AS total_count
                FROM hr_employee_schedule_assignments a
                JOIN hr_schedule_templates t ON t.id = a.template_id
                WHERE a.company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(t.status, 'active')) = 'active'
                GROUP BY a.template_id
                """,
            (rs, rowNum) -> Map.entry(rs.getLong("template_id"), rs.getInt("total_count")),
            companyId
        );

        var result = new HashMap<Long, Integer>();
        for (var row : rows) {
            result.put(row.getKey(), row.getValue());
        }
        return result;
    }

    private List<ScheduleTemplateDefinition> loadScheduleTemplates(long companyId) {
        var rows = jdbcTemplate.query(
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
                FROM hr_schedule_templates t
                LEFT JOIN hr_attendance_locations l ON l.id = t.location_id
                LEFT JOIN hr_schedule_template_days d ON d.template_id = t.id
                WHERE t.company_id = ?
                ORDER BY t.name ASC, t.id ASC, d.day_of_week ASC
                """,
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
            companyId
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

    private ScheduleTemplateDefinition loadExistingTemplate(long companyId, long templateId) {
        return loadScheduleTemplates(companyId).stream()
            .filter((template) -> template.templateId() == templateId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Schedule template not found."));
    }

    private Map<String, Object> loadScheduleTemplateMap(long companyId, long templateId) {
        var template = loadExistingTemplate(companyId, templateId);
        var body = new LinkedHashMap<String, Object>();
        body.put("id", template.templateId());
        body.put("name", displayScheduleTemplateName(template.templateName()));
        body.put("status", template.status());
        body.put("schedule_mode", template.scheduleMode());
        body.put("block_after_grace_period", template.blockAfterGracePeriod());
        body.put("enforce_location", template.enforceLocation());
        body.put("location_id", template.locationId());
        body.put("location_name", template.locationName());
        body.put("days", template.days().stream().map(this::toTemplateDayMap).toList());
        body.put("employees_assigned_count", loadActiveAssignmentCountsByTemplate(companyId).getOrDefault(templateId, 0));
        return body;
    }

    private List<ScheduleWindow> loadScheduleWindows(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.query(
            """
                SELECT a.template_id,
                       a.effective_start_date,
                       a.effective_end_date,
                       t.schedule_mode,
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
                FROM hr_employee_schedule_assignments a
                JOIN hr_schedule_templates t ON t.id = a.template_id
                JOIN hr_schedule_template_days d ON d.template_id = a.template_id
                LEFT JOIN hr_attendance_locations l ON l.id = t.location_id
                WHERE a.company_id = ?
                  AND a.employee_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(t.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> new ScheduleWindow(
                rs.getLong("template_id"),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class),
                safe(rs.getString("schedule_mode")),
                rs.getBoolean("block_after_grace_period"),
                rs.getBoolean("enforce_location"),
                getNullableLong(rs, "location_id"),
                safe(rs.getString("location_name")),
                rs.getInt("day_of_week"),
                rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class),
                rs.getInt("meal_minutes"),
                rs.getInt("rest_minutes"),
                rs.getInt("late_after_minutes"),
                rs.getBoolean("is_rest_day")
            ),
            companyId,
            employeeId,
            endDate,
            startDate
        );
    }

    private ScheduleRule resolveScheduleRule(List<ScheduleWindow> windows, LocalDate date) {
        return windows.stream()
            .filter(window -> window.dayOfWeek() == date.getDayOfWeek().getValue())
            .filter(window -> !date.isBefore(window.effectiveStartDate()))
            .filter(window -> window.effectiveEndDate() == null || !date.isAfter(window.effectiveEndDate()))
            .map(window -> new ScheduleRule(
                0L,
                window.templateId(),
                window.scheduleMode(),
                window.blockAfterGracePeriod(),
                window.enforceLocation(),
                window.locationId(),
                window.locationName(),
                window.startTime(),
                window.endTime(),
                window.mealMinutes(),
                window.restMinutes(),
                window.lateAfterMinutes(),
                window.isRestDay()
            ))
            .findFirst()
            .orElse(null);
    }

    private DailyRecordRow ensureDailyRecord(long companyId, long employeeId, LocalDate date) {
        return Objects.requireNonNull(rebuildDailyRecordProjection(companyId, employeeId, date));
    }

    private EffectiveDailyRecord upsertDailyRecordFromEvents(long companyId, long employeeId, LocalDate date) {
        var refreshed = rebuildDailyRecordProjection(companyId, employeeId, date);
        var scheduleRule = loadScheduleRule(companyId, employeeId, date);
        return new EffectiveDailyRecord(
            resolveEffectiveStatus(refreshed, scheduleRule, date),
            refreshed != null ? refreshed.firstCheckInAt() : null,
            refreshed != null ? refreshed.lastCheckOutAt() : null
        );
    }

    private List<LocationRow> listLocations(long companyId) {
        return loadLocationRows(companyId, true);
    }

    private Map<Long, List<LocationRow>> groupLocationsByBusiness(List<LocationRow> locations) {
        var grouped = new HashMap<Long, List<LocationRow>>();
        for (var location : locations) {
            if (location.businessId() != null) {
                grouped.computeIfAbsent(location.businessId(), ignored -> new ArrayList<>()).add(location);
            }
        }
        return grouped;
    }

    private List<LocationRow> loadLocationRows(long companyId, boolean activeOnly) {
        return jdbcTemplate.query(
            activeOnly
                ? """
                    SELECT l.id,
                           l.unit_id,
                           COALESCE(u.name, '') AS unit_name,
                           l.business_id,
                           COALESCE(b.name, '') AS business_name,
                           l.contract_start_date,
                           l.contract_end_date,
                           l.name,
                           l.latitude,
                           l.longitude,
	                           l.radius_meters,
	                           COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
	                           COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
	                           COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
	                           COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
                           COALESCE(LOWER(l.status), 'active') AS status,
                           (
                               SELECT COUNT(DISTINCT a.employee_id)
                               FROM hr_employee_work_site_assignments a
                               WHERE a.company_id = l.company_id
                                 AND a.location_id = l.id
                                 AND LOWER(COALESCE(a.status, 'active')) = 'active'
                                 AND a.effective_start_date <= CURRENT_DATE
                                 AND (a.effective_end_date IS NULL OR a.effective_end_date >= CURRENT_DATE)
                           ) AS assigned_employee_count,
                           (
                               SELECT GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))), ''), CONCAT('Employee ', e.id)) ORDER BY e.first_name ASC, e.last_name ASC SEPARATOR ', ')
                               FROM hr_employee_work_site_assignments a
                               JOIN hr_employees e ON e.id = a.employee_id
                               WHERE a.company_id = l.company_id
                                 AND a.location_id = l.id
                                 AND LOWER(COALESCE(a.status, 'active')) = 'active'
                                 AND a.effective_start_date <= CURRENT_DATE
                                 AND (a.effective_end_date IS NULL OR a.effective_end_date >= CURRENT_DATE)
                           ) AS assigned_employee_names
                    FROM hr_attendance_locations l
                    LEFT JOIN units u ON u.id = l.unit_id
                    LEFT JOIN businesses b ON b.id = l.business_id
                    WHERE l.company_id = ?
                      AND LOWER(COALESCE(l.status, 'active')) = 'active'
                    ORDER BY l.name ASC
                    """
                : """
                    SELECT l.id,
                           l.unit_id,
                           COALESCE(u.name, '') AS unit_name,
                           l.business_id,
                           COALESCE(b.name, '') AS business_name,
                           l.contract_start_date,
                           l.contract_end_date,
                           l.name,
                           l.latitude,
                           l.longitude,
	                           l.radius_meters,
	                           COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
	                           COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
	                           COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
	                           COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
                           COALESCE(LOWER(l.status), 'active') AS status,
                           (
                               SELECT COUNT(DISTINCT a.employee_id)
                               FROM hr_employee_work_site_assignments a
                               WHERE a.company_id = l.company_id
                                 AND a.location_id = l.id
                                 AND LOWER(COALESCE(a.status, 'active')) = 'active'
                                 AND a.effective_start_date <= CURRENT_DATE
                                 AND (a.effective_end_date IS NULL OR a.effective_end_date >= CURRENT_DATE)
                           ) AS assigned_employee_count,
                           (
                               SELECT GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))), ''), CONCAT('Employee ', e.id)) ORDER BY e.first_name ASC, e.last_name ASC SEPARATOR ', ')
                               FROM hr_employee_work_site_assignments a
                               JOIN hr_employees e ON e.id = a.employee_id
                               WHERE a.company_id = l.company_id
                                 AND a.location_id = l.id
                                 AND LOWER(COALESCE(a.status, 'active')) = 'active'
                                 AND a.effective_start_date <= CURRENT_DATE
                                 AND (a.effective_end_date IS NULL OR a.effective_end_date >= CURRENT_DATE)
                           ) AS assigned_employee_names
                    FROM hr_attendance_locations l
                    LEFT JOIN units u ON u.id = l.unit_id
                    LEFT JOIN businesses b ON b.id = l.business_id
                    WHERE l.company_id = ?
                    ORDER BY CASE LOWER(COALESCE(l.status, 'active')) WHEN 'active' THEN 0 ELSE 1 END, l.name ASC
                    """,
            (rs, rowNum) -> new LocationRow(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("unit_name")),
                getNullableLong(rs, "business_id"),
                safe(rs.getString("business_name")),
                rs.getObject("contract_start_date", LocalDate.class),
                rs.getObject("contract_end_date", LocalDate.class),
                safe(rs.getString("name")),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
	                rs.getInt("radius_meters"),
	                rs.getBigDecimal("required_hours_per_day"),
	                rs.getObject("required_start_time", LocalTime.class),
	                rs.getObject("required_end_time", LocalTime.class),
	                rs.getInt("required_days_per_week"),
                safe(rs.getString("status")),
                rs.getInt("assigned_employee_count"),
                safe(rs.getString("assigned_employee_names"))
            ),
            companyId
        );
    }

    private LocationRow loadLocation(long companyId, Long locationId) {
        if (locationId == null) {
            throw new NoSuchElementException("Attendance location not found.");
        }

        var rows = jdbcTemplate.query(
            """
                SELECT l.id,
                       l.unit_id,
                       COALESCE(u.name, '') AS unit_name,
                       l.business_id,
                       COALESCE(b.name, '') AS business_name,
                       l.contract_start_date,
                       l.contract_end_date,
                       l.name,
                       l.latitude,
                       l.longitude,
	                       l.radius_meters,
	                       COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
	                       COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
	                       COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
	                       COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
                       COALESCE(LOWER(l.status), 'active') AS status,
                       (
                           SELECT COUNT(DISTINCT a.employee_id)
                           FROM hr_employee_work_site_assignments a
                           WHERE a.company_id = l.company_id
                             AND a.location_id = l.id
                             AND LOWER(COALESCE(a.status, 'active')) = 'active'
                             AND a.effective_start_date <= CURRENT_DATE
                             AND (a.effective_end_date IS NULL OR a.effective_end_date >= CURRENT_DATE)
                       ) AS assigned_employee_count,
                       (
                           SELECT GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))), ''), CONCAT('Employee ', e.id)) ORDER BY e.first_name ASC, e.last_name ASC SEPARATOR ', ')
                           FROM hr_employee_work_site_assignments a
                           JOIN hr_employees e ON e.id = a.employee_id
                           WHERE a.company_id = l.company_id
                             AND a.location_id = l.id
                             AND LOWER(COALESCE(a.status, 'active')) = 'active'
                             AND a.effective_start_date <= CURRENT_DATE
                             AND (a.effective_end_date IS NULL OR a.effective_end_date >= CURRENT_DATE)
                       ) AS assigned_employee_names
                FROM hr_attendance_locations l
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE l.company_id = ? AND l.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new LocationRow(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("unit_name")),
                getNullableLong(rs, "business_id"),
                safe(rs.getString("business_name")),
                rs.getObject("contract_start_date", LocalDate.class),
                rs.getObject("contract_end_date", LocalDate.class),
                safe(rs.getString("name")),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
	                rs.getInt("radius_meters"),
	                rs.getBigDecimal("required_hours_per_day"),
	                rs.getObject("required_start_time", LocalTime.class),
	                rs.getObject("required_end_time", LocalTime.class),
	                rs.getInt("required_days_per_week"),
                safe(rs.getString("status")),
                rs.getInt("assigned_employee_count"),
                safe(rs.getString("assigned_employee_names"))
            ),
            companyId,
            locationId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attendance location not found.");
        }
        return rows.getFirst();
    }

    private List<LocationRow> loadBusinessAttendanceLocations(long companyId, Long businessId) {
        if (businessId == null) {
            return List.of();
        }

        return jdbcTemplate.query(
            """
                SELECT l.id,
	                       l.unit_id,
	                       COALESCE(u.name, '') AS unit_name,
	                       l.business_id,
	                       COALESCE(b.name, '') AS business_name,
                           l.contract_start_date,
                           l.contract_end_date,
	                       l.name,
	                       l.latitude,
	                       l.longitude,
	                       l.radius_meters,
	                       COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
	                       COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
	                       COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
	                       COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
	                       COALESCE(LOWER(l.status), 'active') AS status
                FROM hr_attendance_locations l
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE l.company_id = ?
                  AND l.business_id = ?
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                ORDER BY l.name ASC
                """,
            (rs, rowNum) -> new LocationRow(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("unit_name")),
                getNullableLong(rs, "business_id"),
                safe(rs.getString("business_name")),
                rs.getObject("contract_start_date", LocalDate.class),
                rs.getObject("contract_end_date", LocalDate.class),
                safe(rs.getString("name")),
                rs.getBigDecimal("latitude"),
	                rs.getBigDecimal("longitude"),
	                rs.getInt("radius_meters"),
	                rs.getBigDecimal("required_hours_per_day"),
	                rs.getObject("required_start_time", LocalTime.class),
	                rs.getObject("required_end_time", LocalTime.class),
	                rs.getInt("required_days_per_week"),
	                safe(rs.getString("status")),
                0,
                ""
            ),
            companyId,
            businessId
        );
    }

    private List<LocationRow> loadCompanyBusinessStructureAttendanceLocations(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT l.id,
                       l.unit_id,
                       COALESCE(u.name, '') AS unit_name,
                       l.business_id,
                       COALESCE(b.name, '') AS business_name,
                       l.contract_start_date,
                       l.contract_end_date,
                       l.name,
                       l.latitude,
                       l.longitude,
                       l.radius_meters,
                       COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
                       COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
                       COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
                       COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
                       COALESCE(l.managed_source, '') AS managed_source,
                       COALESCE(LOWER(l.status), 'active') AS status
                FROM hr_attendance_locations l
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE l.company_id = ?
                  AND l.managed_source = 'business_structure'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                ORDER BY l.name ASC
                """,
            (rs, rowNum) -> mapPolicyLocationRow(rs),
            companyId
        );
    }

    private List<LocationRow> loadBusinessStructureAttendanceLocations(long companyId, Long businessId) {
        if (businessId == null) {
            return List.of();
        }

        return jdbcTemplate.query(
            """
                SELECT l.id,
                       l.unit_id,
                       COALESCE(u.name, '') AS unit_name,
                       l.business_id,
                       COALESCE(b.name, '') AS business_name,
                       l.contract_start_date,
                       l.contract_end_date,
                       l.name,
                       l.latitude,
                       l.longitude,
                       l.radius_meters,
                       COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
                       COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
                       COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
                       COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
                       COALESCE(l.managed_source, '') AS managed_source,
                       COALESCE(LOWER(l.status), 'active') AS status
                FROM hr_attendance_locations l
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE l.company_id = ?
                  AND l.business_id = ?
                  AND l.managed_source = 'business_structure'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                ORDER BY l.name ASC
                """,
            (rs, rowNum) -> mapPolicyLocationRow(rs),
            companyId,
            businessId
        );
    }

    private LocationRow mapPolicyLocationRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new LocationRow(
            rs.getLong("id"),
            getNullableLong(rs, "unit_id"),
            safe(rs.getString("unit_name")),
            getNullableLong(rs, "business_id"),
            safe(rs.getString("business_name")),
            rs.getObject("contract_start_date", LocalDate.class),
            rs.getObject("contract_end_date", LocalDate.class),
            safe(rs.getString("name")),
            rs.getBigDecimal("latitude"),
            rs.getBigDecimal("longitude"),
            rs.getInt("radius_meters"),
            rs.getBigDecimal("required_hours_per_day"),
            rs.getObject("required_start_time", LocalTime.class),
            rs.getObject("required_end_time", LocalTime.class),
            rs.getInt("required_days_per_week"),
            safe(rs.getString("managed_source")),
            safe(rs.getString("status")),
            0,
            ""
        );
    }

    private List<LocationRow> loadAllowedLocations(long companyId, long employeeId) {
        return jdbcTemplate.query(
            """
                SELECT l.id,
	                       l.unit_id,
	                       COALESCE(u.name, '') AS unit_name,
	                       l.business_id,
	                       COALESCE(b.name, '') AS business_name,
                           l.contract_start_date,
                           l.contract_end_date,
	                       l.name,
	                       l.latitude,
	                       l.longitude,
	                       l.radius_meters,
	                       COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
	                       COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
	                       COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
	                       COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
	                       COALESCE(LOWER(l.status), 'active') AS status
                FROM hr_employee_allowed_locations al
                JOIN hr_attendance_locations l ON l.id = al.location_id
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE al.company_id = ?
                  AND al.employee_id = ?
                  AND LOWER(COALESCE(al.status, 'active')) = 'active'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                ORDER BY l.name ASC
                """,
            (rs, rowNum) -> new LocationRow(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("unit_name")),
                getNullableLong(rs, "business_id"),
                safe(rs.getString("business_name")),
                rs.getObject("contract_start_date", LocalDate.class),
                rs.getObject("contract_end_date", LocalDate.class),
                safe(rs.getString("name")),
                rs.getBigDecimal("latitude"),
	                rs.getBigDecimal("longitude"),
	                rs.getInt("radius_meters"),
	                rs.getBigDecimal("required_hours_per_day"),
	                rs.getObject("required_start_time", LocalTime.class),
	                rs.getObject("required_end_time", LocalTime.class),
	                rs.getInt("required_days_per_week"),
	                safe(rs.getString("status")),
                0,
                ""
            ),
            companyId,
            employeeId
        );
    }

    private Map<Long, List<LocationRow>> loadAllowedLocationsByEmployee(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT al.employee_id,
                       l.id,
	                       l.unit_id,
	                       COALESCE(u.name, '') AS unit_name,
	                       l.business_id,
	                       COALESCE(b.name, '') AS business_name,
                           l.contract_start_date,
                           l.contract_end_date,
	                       l.name,
	                       l.latitude,
	                       l.longitude,
	                       l.radius_meters,
	                       COALESCE(l.required_hours_per_day, 8.00) AS required_hours_per_day,
	                       COALESCE(l.required_start_time, TIME('08:00:00')) AS required_start_time,
	                       COALESCE(l.required_end_time, TIME('16:00:00')) AS required_end_time,
	                       COALESCE(l.required_days_per_week, 5) AS required_days_per_week,
	                       COALESCE(LOWER(l.status), 'active') AS status
                FROM hr_employee_allowed_locations al
                JOIN hr_attendance_locations l ON l.id = al.location_id
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE al.company_id = ?
                  AND LOWER(COALESCE(al.status, 'active')) = 'active'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                ORDER BY al.employee_id ASC, l.name ASC
                """,
            (rs, rowNum) -> Map.entry(
                rs.getLong("employee_id"),
                new LocationRow(
                    rs.getLong("id"),
                    getNullableLong(rs, "unit_id"),
                    safe(rs.getString("unit_name")),
                    getNullableLong(rs, "business_id"),
                    safe(rs.getString("business_name")),
                    rs.getObject("contract_start_date", LocalDate.class),
                    rs.getObject("contract_end_date", LocalDate.class),
                    safe(rs.getString("name")),
                    rs.getBigDecimal("latitude"),
	                    rs.getBigDecimal("longitude"),
	                    rs.getInt("radius_meters"),
	                    rs.getBigDecimal("required_hours_per_day"),
	                    rs.getObject("required_start_time", LocalTime.class),
	                    rs.getObject("required_end_time", LocalTime.class),
	                    rs.getInt("required_days_per_week"),
	                    safe(rs.getString("status")),
                    0,
                    ""
                )
            ),
            companyId
        );

        var grouped = new HashMap<Long, List<LocationRow>>();
        for (var row : rows) {
            grouped.computeIfAbsent(row.getKey(), ignored -> new ArrayList<>()).add(row.getValue());
        }
        return grouped;
    }

    private void ensureEmployeeAllowedLocation(long companyId, long userId, long employeeId, long locationId) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_allowed_locations
                (company_id, employee_id, location_id, status, created_by)
                VALUES (?, ?, ?, 'active', ?)
                ON DUPLICATE KEY UPDATE
                  status = 'active',
                  updated_at = CURRENT_TIMESTAMP
                """,
            companyId,
            employeeId,
            locationId,
            userId
        );
    }

    private long insertWorkSiteAssignment(
        long companyId,
        long userId,
        long employeeId,
        long locationId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_employee_work_site_assignments
                    (company_id, employee_id, location_id, effective_start_date, effective_end_date, status, created_by)
                    VALUES (?, ?, ?, ?, ?, 'active', ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, employeeId);
            statement.setLong(3, locationId);
            statement.setObject(4, effectiveStartDate);
            statement.setObject(5, effectiveEndDate);
            statement.setLong(6, userId);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    private Map<Long, WorkSiteAssignmentRow> loadActiveWorkSiteAssignments(long companyId, LocalDate date) {
        var rows = jdbcTemplate.query(
            """
                SELECT a.id,
                       a.employee_id,
                       a.effective_start_date,
                       a.effective_end_date,
                       COALESCE(LOWER(a.status), 'active') AS assignment_status,
                       l.id AS location_id,
	                       l.unit_id AS location_unit_id,
	                       COALESCE(u.name, '') AS location_unit_name,
	                       l.business_id AS location_business_id,
	                       COALESCE(b.name, '') AS location_business_name,
                           l.contract_start_date AS location_contract_start_date,
                           l.contract_end_date AS location_contract_end_date,
	                       l.name AS location_name,
	                       l.latitude AS location_latitude,
	                       l.longitude AS location_longitude,
	                       l.radius_meters AS location_radius_meters,
	                       COALESCE(l.required_hours_per_day, 8.00) AS location_required_hours_per_day,
	                       COALESCE(l.required_start_time, TIME('08:00:00')) AS location_required_start_time,
	                       COALESCE(l.required_end_time, TIME('16:00:00')) AS location_required_end_time,
	                       COALESCE(l.required_days_per_week, 5) AS location_required_days_per_week,
	                       COALESCE(LOWER(l.status), 'active') AS location_status
                FROM hr_employee_work_site_assignments a
                JOIN hr_attendance_locations l ON l.id = a.location_id
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE a.company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.employee_id ASC, a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> mapWorkSiteAssignment(rs),
            companyId,
            date,
            date
        );

        var result = new HashMap<Long, WorkSiteAssignmentRow>();
        for (var row : rows) {
            result.putIfAbsent(row.employeeId(), row);
        }
        return result;
    }

    private WorkSiteAssignmentRow loadActiveWorkSiteAssignment(long companyId, long employeeId, LocalDate date) {
        return loadActiveWorkSiteAssignments(companyId, date).get(employeeId);
    }

    private Map<LocalDate, WorkSiteAssignmentRow> loadActiveWorkSiteAssignments(
        long companyId,
        long employeeId,
        LocalDate startDate,
        LocalDate endDate
    ) {
        var rows = jdbcTemplate.query(
            """
                SELECT a.id,
                       a.employee_id,
                       a.effective_start_date,
                       a.effective_end_date,
                       COALESCE(LOWER(a.status), 'active') AS assignment_status,
                       l.id AS location_id,
	                       l.unit_id AS location_unit_id,
	                       COALESCE(u.name, '') AS location_unit_name,
	                       l.business_id AS location_business_id,
	                       COALESCE(b.name, '') AS location_business_name,
                           l.contract_start_date AS location_contract_start_date,
                           l.contract_end_date AS location_contract_end_date,
	                       l.name AS location_name,
	                       l.latitude AS location_latitude,
	                       l.longitude AS location_longitude,
	                       l.radius_meters AS location_radius_meters,
	                       COALESCE(l.required_hours_per_day, 8.00) AS location_required_hours_per_day,
	                       COALESCE(l.required_start_time, TIME('08:00:00')) AS location_required_start_time,
	                       COALESCE(l.required_end_time, TIME('16:00:00')) AS location_required_end_time,
	                       COALESCE(l.required_days_per_week, 5) AS location_required_days_per_week,
	                       COALESCE(LOWER(l.status), 'active') AS location_status
                FROM hr_employee_work_site_assignments a
                JOIN hr_attendance_locations l ON l.id = a.location_id
                LEFT JOIN units u ON u.id = l.unit_id
                LEFT JOIN businesses b ON b.id = l.business_id
                WHERE a.company_id = ?
                  AND a.employee_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND LOWER(COALESCE(l.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> mapWorkSiteAssignment(rs),
            companyId,
            employeeId,
            endDate,
            startDate
        );

        var result = new HashMap<LocalDate, WorkSiteAssignmentRow>();
        for (var currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
            for (var row : rows) {
                if (!currentDate.isBefore(row.effectiveStartDate())
                    && (row.effectiveEndDate() == null || !currentDate.isAfter(row.effectiveEndDate()))) {
                    result.put(currentDate, row);
                    break;
                }
            }
        }
        return result;
    }

    private WorkSiteAssignmentRow mapWorkSiteAssignment(ResultSet rs) throws SQLException {
        var location = new LocationRow(
            rs.getLong("location_id"),
            getNullableLong(rs, "location_unit_id"),
            safe(rs.getString("location_unit_name")),
            getNullableLong(rs, "location_business_id"),
            safe(rs.getString("location_business_name")),
            rs.getObject("location_contract_start_date", LocalDate.class),
            rs.getObject("location_contract_end_date", LocalDate.class),
            safe(rs.getString("location_name")),
            rs.getBigDecimal("location_latitude"),
            rs.getBigDecimal("location_longitude"),
            rs.getInt("location_radius_meters"),
            rs.getBigDecimal("location_required_hours_per_day"),
            rs.getObject("location_required_start_time", LocalTime.class),
            rs.getObject("location_required_end_time", LocalTime.class),
            rs.getInt("location_required_days_per_week"),
            safe(rs.getString("location_status")),
            0,
            ""
        );
        return new WorkSiteAssignmentRow(
            rs.getLong("id"),
            rs.getLong("employee_id"),
            location,
            rs.getObject("effective_start_date", LocalDate.class),
            rs.getObject("effective_end_date", LocalDate.class),
            safe(rs.getString("assignment_status"))
        );
    }

    private LocationRow resolveKioskLocation(long companyId, Long locationId, BigDecimal latitude, BigDecimal longitude) {
        var locations = listLocations(companyId);
        if (locations.isEmpty()) {
            throw new IllegalArgumentException("No active attendance locations are configured.");
        }

        LocationRow location;
        if (locationId != null && locationId > 0) {
            location = locations.stream()
                .filter(item -> item.id() == locationId)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Attendance location not found."));
        } else {
            location = locations.stream()
                .min(Comparator.comparing(item -> distanceMeters(item.latitude(), item.longitude(), latitude, longitude)))
                .orElseThrow(() -> new IllegalArgumentException("Attendance location not found."));
        }

        var distance = distanceMeters(location.latitude(), location.longitude(), latitude, longitude);
        if (enforceLocationRadius && distance > location.radiusMeters()) {
            throw new IllegalArgumentException("The device is outside the allowed attendance location radius.");
        }

        return location;
    }

    private String calculateSystemStatus(ScheduleRule scheduleRule, LocalDateTime firstCheckIn, LocalDate date) {
        return AttendanceStatusPolicy.calculateSystemStatus(
            scheduleRule != null,
            scheduleRule != null && scheduleRule.isRestDay(),
            scheduleRule == null ? null : scheduleRule.startTime(),
            scheduleRule == null ? 0 : scheduleRule.lateAfterMinutes(),
            scheduleRule == null ? null : scheduleRule.endTime(),
            firstCheckIn,
            date
        );
    }

    private int calculateMinutesLate(ScheduleRule scheduleRule, LocalDateTime firstCheckIn) {
        var attendanceDate = firstCheckIn == null ? LocalDate.now() : firstCheckIn.toLocalDate();
        return calculateMinutesLate(scheduleRule, firstCheckIn, attendanceDate);
    }

    private int calculateMinutesLate(ScheduleRule scheduleRule, LocalDateTime firstCheckIn, LocalDate attendanceDate) {
        return AttendanceStatusPolicy.calculateMinutesLate(
            scheduleRule != null,
            scheduleRule != null && scheduleRule.isRestDay(),
            scheduleRule == null ? null : scheduleRule.startTime(),
            firstCheckIn,
            attendanceDate
        );
    }

    private String inferSystemStatus(ScheduleRule scheduleRule, LocalDate date) {
        return AttendanceStatusPolicy.inferSystemStatus(
            scheduleRule != null,
            scheduleRule != null && scheduleRule.isRestDay(),
            scheduleRule == null ? null : scheduleRule.startTime(),
            scheduleRule == null ? null : scheduleRule.endTime(),
            date,
            LocalDate.now(),
            LocalDateTime.now()
        );
    }

    private String resolveSystemStatus(DailyRecordRow dailyRecord, ScheduleRule scheduleRule, LocalDate date) {
        if (dailyRecord == null) {
            return inferSystemStatus(scheduleRule, date);
        }

        return AttendanceStatusPolicy.resolveSystemStatus(
            dailyRecord.systemStatus(),
            dailyRecord.correctedStatus(),
            dailyRecord.firstCheckInAt() != null,
            dailyRecord.lastCheckOutAt() != null,
            inferSystemStatus(scheduleRule, date)
        );
    }

    private String resolveEffectiveStatus(DailyRecordRow dailyRecord, ScheduleRule scheduleRule, LocalDate date) {
        return AttendanceStatusPolicy.resolveEffectiveStatus(
            dailyRecord == null ? null : dailyRecord.correctedStatus(),
            resolveSystemStatus(dailyRecord, scheduleRule, date)
        );
    }

    private LocationRow mapLocation(ResultSet rs, String prefix) throws SQLException {
        var id = getNullableLong(rs, prefix + "_id");
        if (id == null) {
            return null;
        }
        return new LocationRow(
            id,
            null,
            "",
            null,
            "",
            null,
            null,
            safe(rs.getString(prefix + "_name")),
            rs.getBigDecimal(prefix + "_latitude"),
            rs.getBigDecimal(prefix + "_longitude"),
            rs.getInt(prefix + "_radius_meters"),
            null,
            null,
            null,
            null,
            "active",
            0,
            ""
        );
    }

    private Map<String, Object> toLocationMap(LocationRow location) {
        if (location == null) {
            return null;
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("id", location.id());
        body.put("unit_id", location.unitId());
        body.put("unit_name", nullable(location.unitName()));
        body.put("business_id", location.businessId());
        body.put("business_name", nullable(location.businessName()));
        body.put("contract_start_date", location.contractStartDate() == null ? null : location.contractStartDate().toString());
        body.put("contract_end_date", location.contractEndDate() == null ? null : location.contractEndDate().toString());
        body.put("name", location.name());
        body.put("latitude", location.latitude());
	        body.put("longitude", location.longitude());
	        body.put("radius_meters", location.radiusMeters());
	        body.put("required_hours_per_day", location.requiredHoursPerDay());
	        body.put("required_start_time", location.requiredStartTime() == null ? null : location.requiredStartTime().toString());
	        body.put("required_end_time", location.requiredEndTime() == null ? null : location.requiredEndTime().toString());
	        body.put("required_days_per_week", location.requiredDaysPerWeek());
        body.put("managed_source", nullable(location.managedSource()));
        body.put("status", location.status());
        body.put("assigned_employee_count", location.assignedEmployeeCount());
        body.put("assigned_employee_names", location.assignedEmployeeNames());
        return body;
    }

    private Map<String, Object> toWorkSiteAssignmentMap(WorkSiteAssignmentRow assignment) {
        if (assignment == null) {
            return null;
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("id", assignment.id());
        body.put("employee_id", assignment.employeeId());
        body.put("location_id", assignment.location().id());
        body.put("location_name", assignment.location().name());
        body.put("location", toLocationMap(assignment.location()));
        body.put("effective_start_date", assignment.effectiveStartDate().toString());
        body.put("effective_end_date", assignment.effectiveEndDate() == null ? null : assignment.effectiveEndDate().toString());
        body.put("status", assignment.status());
        return body;
    }

    private Map<String, Object> toScheduleRuleMap(ScheduleRule rule) {
        var body = new LinkedHashMap<String, Object>();
        body.put("template_id", rule.templateId());
        body.put("schedule_mode", rule.scheduleMode());
        body.put("block_after_grace_period", rule.blockAfterGracePeriod());
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

    private Map<String, Object> toTemplateDayMap(ScheduleTemplateDayDefinition day) {
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

    private List<KioskDeviceRow> listKioskDevicesRows(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT d.id,
                       d.company_id,
                       d.unit_id,
                       u.name AS unit_name,
                       d.business_id,
                       b.name AS business_name,
                       d.location_id,
                       l.name AS location_name,
                       d.code,
                       d.name,
                       COALESCE(LOWER(d.status), 'active') AS status,
                       d.public_access_token,
                       d.metadata_json
                FROM hr_kiosk_devices d
                LEFT JOIN units u ON u.id = d.unit_id
                LEFT JOIN businesses b ON b.id = d.business_id
                LEFT JOIN hr_attendance_locations l ON l.id = d.location_id
                WHERE d.company_id = ?
                ORDER BY CASE LOWER(COALESCE(d.status, 'active')) WHEN 'active' THEN 0 ELSE 1 END, d.name ASC
                """,
            (rs, rowNum) -> mapKioskDeviceRow(rs),
            companyId
        );
    }

    private KioskDeviceRow loadKioskDevice(long companyId, long kioskDeviceId) {
        var rows = jdbcTemplate.query(
            """
                SELECT d.id,
                       d.company_id,
                       d.unit_id,
                       u.name AS unit_name,
                       d.business_id,
                       b.name AS business_name,
                       d.location_id,
                       l.name AS location_name,
                       d.code,
                       d.name,
                       COALESCE(LOWER(d.status), 'active') AS status,
                       d.public_access_token,
                       d.metadata_json
                FROM hr_kiosk_devices d
                LEFT JOIN units u ON u.id = d.unit_id
                LEFT JOIN businesses b ON b.id = d.business_id
                LEFT JOIN hr_attendance_locations l ON l.id = d.location_id
                WHERE d.company_id = ?
                  AND d.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapKioskDeviceRow(rs),
            companyId,
            kioskDeviceId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Kiosk device not found.");
        }
        return rows.getFirst();
    }

    private KioskDeviceRow loadKioskDeviceForUpdate(long companyId, long kioskDeviceId) {
        var rows = jdbcTemplate.query(
            """
                SELECT d.id,
                       d.company_id,
                       d.unit_id,
                       u.name AS unit_name,
                       d.business_id,
                       b.name AS business_name,
                       d.location_id,
                       l.name AS location_name,
                       d.code,
                       d.name,
                       COALESCE(LOWER(d.status), 'active') AS status,
                       d.public_access_token,
                       d.metadata_json
                FROM hr_kiosk_devices d
                LEFT JOIN units u ON u.id = d.unit_id
                LEFT JOIN businesses b ON b.id = d.business_id
                LEFT JOIN hr_attendance_locations l ON l.id = d.location_id
                WHERE d.company_id = ?
                  AND d.id = ?
                LIMIT 1
                FOR UPDATE
                """,
            (rs, rowNum) -> mapKioskDeviceRow(rs),
            companyId,
            kioskDeviceId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Kiosk device not found.");
        }
        return rows.getFirst();
    }

    private KioskDeviceRow loadKioskDeviceByPublicAccessToken(String publicAccessToken) {
        var normalizedToken = publicAccessToken == null ? "" : publicAccessToken.trim();
        if (normalizedToken.isBlank()) {
            throw new IllegalArgumentException("Kiosk device token is required.");
        }

        var rows = jdbcTemplate.query(
            """
                SELECT d.id,
                       d.company_id,
                       d.unit_id,
                       u.name AS unit_name,
                       d.business_id,
                       b.name AS business_name,
                       d.location_id,
                       l.name AS location_name,
                       d.code,
                       d.name,
                       COALESCE(LOWER(d.status), 'active') AS status,
                       d.public_access_token,
                       d.metadata_json
                FROM hr_kiosk_devices d
                LEFT JOIN units u ON u.id = d.unit_id
                LEFT JOIN businesses b ON b.id = d.business_id
                LEFT JOIN hr_attendance_locations l ON l.id = d.location_id
                WHERE d.public_access_token = ?
                  AND COALESCE(LOWER(d.status), 'active') = 'active'
                LIMIT 1
                """,
            (rs, rowNum) -> mapKioskDeviceRow(rs),
            normalizedToken
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Public kiosk device not found.");
        }
        return rows.getFirst();
    }

    private LocationRow requirePublicKioskLocation(KioskDeviceRow kioskDevice) {
        if (kioskDevice.locationId() == null) {
            throw new IllegalArgumentException("Kiosk device is not linked to an attendance location.");
        }

        return loadLocation(kioskDevice.companyId(), kioskDevice.locationId());
    }

    private List<AccessProfileRow> listAccessProfilesRows(long companyId) {
        var profiles = jdbcTemplate.query(
            """
                SELECT p.id,
                       p.company_id,
                       p.employee_id,
                       COALESCE(LOWER(p.status), 'active') AS status,
                       p.default_method,
                       p.last_enrolled_at,
                       p.metadata_json,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS employee_name
                FROM hr_employee_access_profiles p
                JOIN hr_employees e ON e.id = p.employee_id
                WHERE p.company_id = ?
                ORDER BY employee_name ASC, p.id ASC
                """,
            (rs, rowNum) -> new AccessProfileRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getLong("employee_id"),
                safe(rs.getString("status")),
                safe(rs.getString("default_method")),
                toLocalDateTime(rs.getTimestamp("last_enrolled_at")),
                safe(rs.getString("metadata_json")),
                safe(rs.getString("employee_number")),
                safe(rs.getString("employee_name")),
                List.of()
            ),
            companyId
        );

        var methodsByProfile = loadAccessMethodsByProfile(companyId);
        return profiles.stream()
            .map((profile) -> new AccessProfileRow(
                profile.id(),
                profile.companyId(),
                profile.employeeId(),
                profile.status(),
                profile.defaultMethod(),
                profile.lastEnrolledAt(),
                profile.metadataJson(),
                profile.employeeNumber(),
                profile.employeeName(),
                methodsByProfile.getOrDefault(profile.id(), List.of())
            ))
            .toList();
    }

    private Map<Long, AccessProfileRow> loadAccessProfilesByEmployee(long companyId) {
        var result = new HashMap<Long, AccessProfileRow>();
        for (var profile : listAccessProfilesRows(companyId)) {
            result.put(profile.employeeId(), profile);
        }
        return result;
    }

    private AccessProfileRow loadAccessProfile(long companyId, long profileId) {
        return listAccessProfilesRows(companyId).stream()
            .filter((profile) -> profile.id() == profileId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Employee access profile not found."));
    }

    private AccessProfileRow loadAccessProfileByEmployee(long companyId, long employeeId) {
        return listAccessProfilesRows(companyId).stream()
            .filter((profile) -> profile.employeeId() == employeeId)
            .findFirst()
            .orElse(null);
    }

    private AccessProfileRow loadOrCreateAccessProfile(long companyId, long employeeId, long userId) {
        var profile = loadAccessProfileByEmployee(companyId, employeeId);
        if (profile != null) {
            return profile;
        }
        ensureDefaultAccessProfile(companyId, employeeId, userId);
        return loadAccessProfileByEmployee(companyId, employeeId);
    }

    private Map<Long, List<AccessMethodRow>> loadAccessMethodsByProfile(long companyId) {
        var rows = loadAccessMethods(companyId, null);
        var result = new HashMap<Long, List<AccessMethodRow>>();
        for (var row : rows) {
            result.computeIfAbsent(row.accessProfileId(), ignored -> new ArrayList<>()).add(row);
        }
        return result;
    }

    private List<AccessMethodRow> loadAccessMethods(long companyId, Long accessProfileId) {
        return jdbcTemplate.query(
            accessProfileId == null
                ? """
                    SELECT m.id,
                           m.company_id,
                           m.access_profile_id,
                           m.method_type,
                           m.credential_ref,
                           m.secret_hash,
                           COALESCE(LOWER(m.status), 'active') AS status,
                           m.priority,
                           m.metadata_json,
                           p.employee_id,
                           COALESCE(e.employee_number, '') AS employee_number,
                           TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS employee_name
                    FROM hr_employee_access_methods m
                    JOIN hr_employee_access_profiles p ON p.id = m.access_profile_id
                    JOIN hr_employees e ON e.id = p.employee_id
                    WHERE m.company_id = ?
                    ORDER BY p.employee_id ASC, m.priority ASC, m.id ASC
                    """
                : """
                    SELECT m.id,
                           m.company_id,
                           m.access_profile_id,
                           m.method_type,
                           m.credential_ref,
                           m.secret_hash,
                           COALESCE(LOWER(m.status), 'active') AS status,
                           m.priority,
                           m.metadata_json,
                           p.employee_id,
                           COALESCE(e.employee_number, '') AS employee_number,
                           TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS employee_name
                    FROM hr_employee_access_methods m
                    JOIN hr_employee_access_profiles p ON p.id = m.access_profile_id
                    JOIN hr_employees e ON e.id = p.employee_id
                    WHERE m.company_id = ?
                      AND m.access_profile_id = ?
                    ORDER BY m.priority ASC, m.id ASC
                    """,
            (rs, rowNum) -> new AccessMethodRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getLong("access_profile_id"),
                safe(rs.getString("method_type")),
                safe(rs.getString("credential_ref")),
                safe(rs.getString("secret_hash")),
                safe(rs.getString("status")),
                rs.getInt("priority"),
                safe(rs.getString("metadata_json")),
                rs.getLong("employee_id"),
                safe(rs.getString("employee_number")),
                safe(rs.getString("employee_name"))
            ),
            accessProfileId == null ? new Object[] { companyId } : new Object[] { companyId, accessProfileId }
        );
    }

    private AccessMethodRow loadAccessMethod(long companyId, long methodId) {
        return loadAccessMethods(companyId, null).stream()
            .filter((method) -> method.id() == methodId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Employee access method not found."));
    }

    private List<AccessMethodRow> loadPublicKioskAccessMethods(long companyId, String methodType) {
        return jdbcTemplate.query(
            """
                SELECT m.id,
                       m.company_id,
                       m.access_profile_id,
                       m.method_type,
                       m.credential_ref,
                       m.secret_hash,
                       COALESCE(LOWER(m.status), 'active') AS status,
                       m.priority,
                       m.metadata_json,
                       p.employee_id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS employee_name
                FROM hr_employee_access_methods m
                JOIN hr_employee_access_profiles p ON p.id = m.access_profile_id
                JOIN hr_employees e ON e.id = p.employee_id
                WHERE m.company_id = ?
                  AND COALESCE(LOWER(m.status), 'active') = 'active'
                  AND COALESCE(LOWER(p.status), 'active') = 'active'
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                  AND m.method_type = ?
                ORDER BY p.employee_id ASC, m.priority ASC, m.id ASC
                """,
            (rs, rowNum) -> new AccessMethodRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getLong("access_profile_id"),
                safe(rs.getString("method_type")),
                safe(rs.getString("credential_ref")),
                safe(rs.getString("secret_hash")),
                safe(rs.getString("status")),
                rs.getInt("priority"),
                safe(rs.getString("metadata_json")),
                rs.getLong("employee_id"),
                safe(rs.getString("employee_number")),
                safe(rs.getString("employee_name"))
            ),
            companyId,
            methodType
        );
    }

    private List<String> determinePublicKioskAuthMethods(long companyId) {
        var availableMethods = new ArrayList<String>();
        for (var methodType : PUBLIC_KIOSK_AUTH_METHODS) {
            if (!loadPublicKioskAccessMethods(companyId, methodType).isEmpty()) {
                availableMethods.add(methodType);
            }
        }
        return availableMethods;
    }

    private AccessMethodRow resolvePublicKioskAccessMethod(long companyId, String authMethod, String credentialPayload) {
        var candidateMethods = loadPublicKioskAccessMethods(companyId, authMethod);
        if (candidateMethods.isEmpty()) {
            return null;
        }

        return switch (authMethod) {
            case "pin" -> {
                var credentialRef = pinCredentialReference(companyId, credentialPayload);
                var matches = candidateMethods.stream()
                    .filter((method) -> method.secretHash() != null && !method.secretHash().isBlank())
                    .filter((method) -> method.credentialRef() == null || method.credentialRef().isBlank() || Objects.equals(method.credentialRef(), credentialRef))
                    .filter((method) -> passwordEncoder.matches(credentialPayload, method.secretHash()))
                    .toList();
                if (matches.size() > 1) {
                    throw new IllegalArgumentException("PIN is assigned to more than one employee.");
                }
                yield matches.isEmpty() ? null : matches.getFirst();
            }
            default -> null;
        };
    }

    private void ensurePublicKioskPinAttemptAllowed(KioskDeviceRow kioskDevice) {
        var state = loadPublicKioskPinThrottle(kioskDevice);
        if (state == null) {
            return;
        }

        var now = Instant.now();
        if (!state.isLocked(now)) {
            if (state.lockedUntil() != null) {
                clearPublicKioskPinFailures(kioskDevice);
            }
            return;
        }

        throw new KioskPinThrottleException(pinThrottleMessage(state, now));
    }

    private void recordPublicKioskPinFailure(KioskDeviceRow kioskDevice) {
        var now = Instant.now();
        var current = loadPublicKioskPinThrottle(kioskDevice);
        if (current != null && current.isLocked(now)) {
            throw new KioskPinThrottleException(pinThrottleMessage(current, now));
        }

        var nextFailedAttempts = current == null || current.lockedUntil() != null
            ? 1
            : current.failedAttempts() + 1;
        var lockedUntil = nextFailedAttempts >= PUBLIC_KIOSK_PIN_FAILURE_LIMIT
            ? now.plus(PUBLIC_KIOSK_PIN_LOCK_DURATION)
            : null;
        var nextState = new PinThrottleState(nextFailedAttempts, lockedUntil);
        updatePublicKioskPinThrottle(kioskDevice, nextState);

        if (nextState.isLocked(now)) {
            throw new KioskPinThrottleException(pinThrottleMessage(nextState, now));
        }
    }

    private void clearPublicKioskPinFailures(KioskDeviceRow kioskDevice) {
        updatePublicKioskPinThrottle(kioskDevice, null);
    }

    private PinThrottleState loadPublicKioskPinThrottle(KioskDeviceRow kioskDevice) {
        var latestKioskDevice = loadKioskDeviceForUpdate(kioskDevice.companyId(), kioskDevice.id());
        var metadata = parseJsonMap(latestKioskDevice.metadataJson());
        var rawThrottle = metadata.get(PUBLIC_KIOSK_PIN_THROTTLE_METADATA_KEY);
        if (!(rawThrottle instanceof Map<?, ?> throttleMap)) {
            return null;
        }

        var failedAttempts = parseMetadataInt(throttleMap.get("failed_attempts"));
        var lockedUntil = parseMetadataInstant(throttleMap.get("locked_until"));
        if (failedAttempts <= 0 && lockedUntil == null) {
            return null;
        }
        return new PinThrottleState(Math.max(failedAttempts, 0), lockedUntil);
    }

    private void updatePublicKioskPinThrottle(KioskDeviceRow kioskDevice, PinThrottleState state) {
        var latestKioskDevice = loadKioskDeviceForUpdate(kioskDevice.companyId(), kioskDevice.id());
        var metadata = new LinkedHashMap<String, Object>();
        metadata.putAll(parseJsonMap(latestKioskDevice.metadataJson()));

        if (state == null) {
            metadata.remove(PUBLIC_KIOSK_PIN_THROTTLE_METADATA_KEY);
        } else {
            var throttleMetadata = new LinkedHashMap<String, Object>();
            throttleMetadata.put("failed_attempts", state.failedAttempts());
            if (state.lockedUntil() != null) {
                throttleMetadata.put("locked_until", state.lockedUntil().toString());
            }
            metadata.put(PUBLIC_KIOSK_PIN_THROTTLE_METADATA_KEY, throttleMetadata);
        }

        jdbcTemplate.update(
            """
                UPDATE hr_kiosk_devices
                SET metadata_json = CAST(? AS JSON)
                WHERE id = ? AND company_id = ?
                """,
            toJson(metadata),
            kioskDevice.id(),
            kioskDevice.companyId()
        );
    }

    private String pinThrottleMessage(PinThrottleState state, Instant now) {
        var remainingSeconds = Duration.between(now, state.lockedUntil()).toSeconds();
        var remainingMinutes = Math.max(1L, (remainingSeconds + 59L) / 60L);
        return "Too many failed PIN attempts. Try again in " + remainingMinutes
            + (remainingMinutes == 1 ? " minute." : " minutes.");
    }

    private int parseMetadataInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        var text = metadataTextValue(value);
        if (text == null) {
            return 0;
        }
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private Instant parseMetadataInstant(Object value) {
        var text = metadataTextValue(value);
        if (text == null) {
            return null;
        }
        try {
            return Instant.parse(text);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private Map<String, Object> toKioskDeviceMap(KioskDeviceRow device) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", device.id());
        body.put("company_id", device.companyId());
        body.put("unit_id", device.unitId());
        body.put("unit_name", device.unitName());
        body.put("business_id", device.businessId());
        body.put("business_name", device.businessName());
        body.put("location_id", device.locationId());
        body.put("location_name", device.locationName());
        body.put("code", device.code());
        body.put("name", device.name());
        body.put("status", device.status());
        body.put("public_access_token", device.publicAccessToken());
        var metadata = new LinkedHashMap<String, Object>();
        metadata.putAll(parseJsonMap(device.metadataJson()));
        metadata.remove(PUBLIC_KIOSK_PIN_THROTTLE_METADATA_KEY);
        body.put("metadata", metadata);
        return body;
    }

    private Map<String, Object> toAccessProfileMap(AccessProfileRow profile) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", profile.id());
        body.put("company_id", profile.companyId());
        body.put("employee_id", profile.employeeId());
        body.put("employee_number", profile.employeeNumber());
        body.put("employee_name", profile.employeeName());
        body.put("status", profile.status());
        body.put("default_method", profile.defaultMethod());
        body.put("last_enrolled_at", toIsoString(profile.lastEnrolledAt()));
        body.put("metadata", parseJsonMap(profile.metadataJson()));
        body.put("methods", profile.methods().stream().map(this::toAccessMethodMap).toList());
        return body;
    }

    private Map<String, Object> toAccessMethodMap(AccessMethodRow method) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", method.id());
        body.put("company_id", method.companyId());
        body.put("access_profile_id", method.accessProfileId());
        body.put("employee_id", method.employeeId());
        body.put("employee_number", method.employeeNumber());
        body.put("employee_name", method.employeeName());
        body.put("method_type", method.methodType());
        body.put("credential_ref", "badge".equals(method.methodType()) ? method.credentialRef() : null);
        body.put("status", method.status());
        body.put("priority", method.priority());
        body.put("metadata", parseJsonMap(method.metadataJson()));
        return body;
    }

    private Map<String, Object> toControlActivityMap(ControlActivityRow event) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", event.id());
        body.put("employee_id", event.employeeId());
        body.put("employee_number", event.employeeNumber());
        body.put("employee_name", event.employeeName());
        body.put("kiosk_device_id", event.kioskDeviceId());
        body.put("kiosk_device_name", event.kioskDeviceName());
        body.put("location_id", event.locationId());
        body.put("location_name", event.locationName());
        body.put("event_type", event.eventType());
        body.put("event_kind", event.eventKind());
        body.put("auth_method", event.authMethod());
        body.put("result_status", event.resultStatus());
        body.put("event_timestamp", toIsoString(event.eventTimestamp()));
        body.put("notes", event.notes());
        body.put("metadata", parseJsonMap(event.metadataJson()));
        return body;
    }

    private String resolveRequestedAuthMethod(Map<String, Object> payload, String defaultMethod) {
        var requested = stringValue(payload, "auth_method");
        return normalizeEnabledAuthMethod(requested.isBlank() ? defaultMethod : requested);
    }

    private String validateAuthAttempt(
        long companyId,
        AccessProfileRow accessProfile,
        AccessMethodRow activeAccessMethod,
        String authMethod,
        String credentialPayload
    ) {
        if (!"active".equals(accessProfile.status())) {
            return "rejected";
        }

        if (activeAccessMethod == null || !"active".equals(activeAccessMethod.status())) {
            return "rejected";
        }

        return switch (authMethod) {
            case "manual_override" -> "overridden";
            case "badge" -> Objects.equals(activeAccessMethod.credentialRef(), credentialPayload) ? "success" : "failure";
            case "pin", "password" -> credentialPayload != null && passwordEncoder.matches(credentialPayload, activeAccessMethod.secretHash())
                ? "success"
                : "failure";
            case "facial_recognition" -> "success";
            default -> "rejected";
        };
    }

    private AccessMethodRow resolveActiveAccessMethod(long companyId, long accessProfileId, String authMethod) {
        return loadAccessMethods(companyId, accessProfileId).stream()
            .filter((method) -> authMethod.equals(method.methodType()))
            .filter((method) -> "active".equals(method.status()))
            .findFirst()
            .orElse(null);
    }

    private LocalDate resolveOperationalAttendanceDate(
        long companyId,
        long employeeId,
        LocalDateTime eventTimestamp,
        String eventKind
    ) {
        var eventDate = eventTimestamp.toLocalDate();
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventKind)) {
            return eventDate;
        }

        var previousDate = eventDate.minusDays(1);
        var previousRule = loadScheduleRule(companyId, employeeId, previousDate);
        if (!isOvernightSchedule(previousRule)) {
            return eventDate;
        }

        var previousDayEvents = loadAttendanceEventRows(companyId, employeeId, previousDate).stream()
            .filter((event) -> !event.eventTimestamp().isAfter(eventTimestamp))
            .toList();
        var previousState = resolveOperationalState(previousDayEvents);
        if (previousState.checkedIn()) {
            return previousDate;
        }

        var previousScheduledEnd = scheduledEndDateTime(previousDate, previousRule);
        return eventTimestamp.isAfter(previousScheduledEnd) ? eventDate : previousDate;
    }

    private void validateOperationalEventTransition(
        long companyId,
        long employeeId,
        LocalDate attendanceDate,
        LocalDateTime eventTimestamp,
        String eventKind
    ) {
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventKind)) {
            return;
        }

        var dayEvents = loadAttendanceEventRows(companyId, employeeId, attendanceDate);
        var priorEvents = dayEvents.stream()
            .filter((event) -> !event.eventTimestamp().isAfter(eventTimestamp))
            .toList();
        var state = resolveOperationalState(priorEvents);
        var checkInAlreadyRecorded = dayEvents.stream()
            .anyMatch((event) -> "check_in".equals(event.eventKind()) || "check_in".equals(event.eventType()));

        switch (eventKind) {
            case "check_in" -> {
                if (checkInAlreadyRecorded) {
                    throw new IllegalArgumentException("Check-in has already been recorded for this employee shift.");
                }
            }
            case "break_out" -> {
                if (!state.checkedIn()) {
                    throw new IllegalArgumentException("Break-out requires an active check-in.");
                }
                if (state.onBreak()) {
                    throw new IllegalArgumentException("A break is already active for this employee.");
                }
            }
            case "break_in" -> {
                if (!state.checkedIn() || !state.onBreak()) {
                    throw new IllegalArgumentException("Break-in requires an active break.");
                }
            }
            case "check_out" -> {
                if (!state.checkedIn()) {
                    throw new IllegalArgumentException("Check-out requires an active check-in.");
                }
                if (state.onBreak()) {
                    throw new IllegalArgumentException("Close the active break before checking out.");
                }
            }
            default -> {
            }
        }
    }

    private void validateOperationalEventDate(String eventKind, LocalDateTime eventTimestamp) {
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventKind)) {
            return;
        }

        if (!eventTimestamp.toLocalDate().equals(LocalDate.now())) {
            throw new IllegalArgumentException("Attendance can only be recorded for today.");
        }
    }

    private AttendanceOperationalState resolveOperationalState(List<AttendanceEventRow> events) {
        boolean checkedIn = false;
        boolean onBreak = false;

        for (var event : events) {
            if (!"success".equals(event.resultStatus()) && !"overridden".equals(event.resultStatus())) {
                continue;
            }

            switch (event.eventKind()) {
                case "check_in" -> {
                    checkedIn = true;
                    onBreak = false;
                }
                case "break_out" -> {
                    if (checkedIn) {
                        onBreak = true;
                    }
                }
                case "break_in" -> {
                    if (checkedIn) {
                        onBreak = false;
                    }
                }
                case "check_out" -> {
                    checkedIn = false;
                    onBreak = false;
                }
                default -> {
                }
            }
        }

        return new AttendanceOperationalState(checkedIn, onBreak);
    }

    private long appendAttendanceEvent(
        long companyId,
        long employeeId,
        String eventType,
        LocalDateTime eventTimestamp,
        LocalDate attendanceDate,
        Long locationId,
        Long kioskDeviceId,
        BigDecimal latitude,
        BigDecimal longitude,
        String photoObjectKey,
        String source,
        String authMethod,
        String resultStatus,
        String eventKind,
        String metadataJson,
        String notes,
        Long supersedesEventId,
        long createdBy
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_attendance_events
                    (company_id, employee_id, event_type, event_timestamp, attendance_date, location_id, kiosk_device_id,
                     latitude, longitude, photo_url, source, auth_method, result_status, event_kind, notes, metadata_json, supersedes_event_id, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, employeeId);
            statement.setString(3, eventType);
            statement.setTimestamp(4, Timestamp.valueOf(eventTimestamp));
            statement.setObject(5, attendanceDate == null ? eventTimestamp.toLocalDate() : attendanceDate);
            setNullableLong(statement, 6, locationId);
            setNullableLong(statement, 7, kioskDeviceId);
            if (latitude == null) {
                statement.setNull(8, Types.DECIMAL);
            } else {
                statement.setBigDecimal(8, latitude);
            }
            if (longitude == null) {
                statement.setNull(9, Types.DECIMAL);
            } else {
                statement.setBigDecimal(9, longitude);
            }
            statement.setString(10, nullable(photoObjectKey));
            statement.setString(11, source);
            statement.setString(12, authMethod);
            statement.setString(13, resultStatus);
            statement.setString(14, eventKind);
            statement.setString(15, nullable(notes));
            statement.setString(16, metadataJson);
            setNullableLong(statement, 17, supersedesEventId);
            statement.setLong(18, createdBy);
            return statement;
        }, keyHolder);

        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    private List<ControlActivityRow> loadRecentControlActivity(long companyId, LocalDate date, int limit) {
        return jdbcTemplate.query(
            """
                SELECT e.id,
                       e.employee_id,
                       COALESCE(emp.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(emp.first_name, ''), COALESCE(emp.last_name, ''))) AS employee_name,
                       e.kiosk_device_id,
                       COALESCE(d.name, '') AS kiosk_device_name,
                       e.location_id,
                       COALESCE(l.name, '') AS location_name,
                       COALESCE(e.event_type, '') AS event_type,
                       COALESCE(e.event_kind, e.event_type, '') AS event_kind,
                       COALESCE(e.auth_method, '') AS auth_method,
                       COALESCE(e.result_status, '') AS result_status,
                       e.event_timestamp,
                       COALESCE(e.notes, '') AS notes,
                       COALESCE(CAST(e.metadata_json AS CHAR), '') AS metadata_json
                FROM hr_attendance_events e
                JOIN hr_employees emp ON emp.id = e.employee_id
                LEFT JOIN hr_kiosk_devices d ON d.id = e.kiosk_device_id
                LEFT JOIN hr_attendance_locations l ON l.id = e.location_id
                WHERE e.company_id = ?
                  AND e.attendance_date = ?
                ORDER BY e.event_timestamp DESC, e.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> new ControlActivityRow(
                rs.getLong("id"),
                rs.getLong("employee_id"),
                safe(rs.getString("employee_number")),
                safe(rs.getString("employee_name")),
                getNullableLong(rs, "kiosk_device_id"),
                safe(rs.getString("kiosk_device_name")),
                getNullableLong(rs, "location_id"),
                safe(rs.getString("location_name")),
                safe(rs.getString("event_type")),
                safe(rs.getString("event_kind")),
                safe(rs.getString("auth_method")),
                safe(rs.getString("result_status")),
                toLocalDateTime(rs.getTimestamp("event_timestamp")),
                safe(rs.getString("notes")),
                safe(rs.getString("metadata_json"))
            ),
            companyId,
            date,
            limit
        );
    }

    private DailyRecordRow rebuildDailyRecordProjection(long companyId, long employeeId, LocalDate date) {
        var events = loadAttendanceEventRows(companyId, employeeId, date);
        var scheduleRule = loadScheduleRule(companyId, employeeId, date);
        var existing = loadDailyRecord(companyId, employeeId, date);

        LocalDateTime firstCheckIn = null;
        LocalDateTime lastCheckOut = null;
        Long firstLocationId = null;
        Long lastLocationId = null;
        String correctedStatus = null;
        String notes = null;
        boolean correctionStateTouched = false;

        for (var event : events) {
            if (!"success".equals(event.resultStatus()) && !"overridden".equals(event.resultStatus())) {
                continue;
            }

            if ("check_in".equals(event.eventKind()) && firstCheckIn == null) {
                firstCheckIn = event.eventTimestamp();
                firstLocationId = event.locationId();
            }
            if ("check_out".equals(event.eventKind())) {
                lastCheckOut = event.eventTimestamp();
                lastLocationId = event.locationId();
            }
            if ("correction".equals(event.eventKind()) || "manual_override".equals(event.eventKind())) {
                var metadata = parseJsonMap(event.metadataJson());
                if (metadata.containsKey("corrected_status")) {
                    correctionStateTouched = true;
                    correctedStatus = normalizeNullableAttendanceStatus(metadataTextValue(metadata.get("corrected_status")));
                }
                if (metadata.containsKey("notes")) {
                    correctionStateTouched = true;
                    notes = metadataTextValue(metadata.get("notes"));
                } else if (!HrPayloadUtils.isBlank(event.notes())) {
                    notes = event.notes();
                }
            }
        }

        if (!correctionStateTouched && correctedStatus == null && existing != null) {
            correctedStatus = existing.correctedStatus();
            if (notes == null) {
                notes = existing.notes();
            }
        }

        var systemStatus = calculateSystemStatus(scheduleRule, firstCheckIn, date);
        var minutesLate = calculateMinutesLate(scheduleRule, firstCheckIn, date);

        if (existing == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO hr_attendance_daily_records
                    (company_id, employee_id, attendance_date, system_status, corrected_status, corrected_by, corrected_at, first_check_in_at, last_check_out_at, first_location_id, last_location_id, minutes_late, source_schedule_template_id, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                companyId,
                employeeId,
                date,
                systemStatus,
                correctedStatus,
                correctedStatus == null ? null : 0L,
                correctedStatus == null ? null : Timestamp.valueOf(LocalDateTime.now()),
                firstCheckIn == null ? null : Timestamp.valueOf(firstCheckIn),
                lastCheckOut == null ? null : Timestamp.valueOf(lastCheckOut),
                firstLocationId,
                lastLocationId,
                minutesLate,
                scheduleRule == null ? null : scheduleRule.templateId(),
                notes
            );
        } else {
            jdbcTemplate.update(
                """
                    UPDATE hr_attendance_daily_records
                    SET system_status = ?,
                        corrected_status = ?,
                        corrected_by = ?,
                        corrected_at = ?,
                        first_check_in_at = ?,
                        last_check_out_at = ?,
                        first_location_id = ?,
                        last_location_id = ?,
                        minutes_late = ?,
                        source_schedule_template_id = ?,
                        notes = ?
                    WHERE id = ?
                    """,
                systemStatus,
                correctedStatus,
                correctedStatus == null ? null : 0L,
                correctedStatus == null ? null : Timestamp.valueOf(LocalDateTime.now()),
                firstCheckIn == null ? null : Timestamp.valueOf(firstCheckIn),
                lastCheckOut == null ? null : Timestamp.valueOf(lastCheckOut),
                firstLocationId,
                lastLocationId,
                minutesLate,
                scheduleRule == null ? null : scheduleRule.templateId(),
                notes,
                existing.id()
            );
        }

        return Objects.requireNonNull(loadDailyRecord(companyId, employeeId, date));
    }

    private List<AttendanceEventRow> loadAttendanceEventRows(long companyId, long employeeId, LocalDate date) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       event_type,
                       event_timestamp,
                       attendance_date,
                       location_id,
                       kiosk_device_id,
                       auth_method,
                       result_status,
                       event_kind,
                       notes,
                       metadata_json,
                       supersedes_event_id
                FROM hr_attendance_events
                WHERE company_id = ?
                  AND employee_id = ?
                  AND attendance_date = ?
                ORDER BY event_timestamp ASC, id ASC
                """,
            (rs, rowNum) -> new AttendanceEventRow(
                rs.getLong("id"),
                safe(rs.getString("event_type")),
                toLocalDateTime(rs.getTimestamp("event_timestamp")),
                rs.getObject("attendance_date", LocalDate.class),
                getNullableLong(rs, "location_id"),
                getNullableLong(rs, "kiosk_device_id"),
                safe(rs.getString("auth_method")),
                safe(rs.getString("result_status")),
                safe(rs.getString("event_kind")),
                safe(rs.getString("notes")),
                safe(rs.getString("metadata_json")),
                getNullableLong(rs, "supersedes_event_id")
            ),
            companyId,
            employeeId,
            date
        );
    }

    private List<AutoCheckoutCandidate> loadAutoCheckoutCandidates(LocalDate latestAttendanceDate) {
        return jdbcTemplate.query(
            """
                SELECT company_id,
                       employee_id,
                       attendance_date,
                       first_check_in_at,
                       first_location_id
                FROM hr_attendance_daily_records
                WHERE first_check_in_at IS NOT NULL
                  AND last_check_out_at IS NULL
                  AND attendance_date <= ?
                ORDER BY attendance_date ASC, company_id ASC, employee_id ASC
                LIMIT 500
                """,
            (rs, rowNum) -> new AutoCheckoutCandidate(
                rs.getLong("company_id"),
                rs.getLong("employee_id"),
                rs.getObject("attendance_date", LocalDate.class),
                toLocalDateTime(rs.getTimestamp("first_check_in_at")),
                getNullableLong(rs, "first_location_id")
            ),
            latestAttendanceDate
        );
    }

    private boolean hasSuccessfulCheckoutEvent(long companyId, long employeeId, LocalDate date) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE company_id = ?
                  AND employee_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'check_out'
                  AND result_status IN ('success', 'overridden')
                """,
            Integer.class,
            companyId,
            employeeId,
            date
        );
        return count != null && count > 0;
    }

    private void ensureUniqueKioskCode(long companyId, Long kioskDeviceId, String code) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_kiosk_devices
                WHERE company_id = ?
                  AND LOWER(code) = LOWER(?)
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            code,
            kioskDeviceId,
            kioskDeviceId
        );
        if (count != null && count > 0) {
            throw new IllegalArgumentException("Kiosk code must be unique.");
        }
    }

    private String generateUniqueKioskPublicAccessToken() {
        while (true) {
            var nextToken = UUID.randomUUID().toString().replace("-", "")
                + Long.toHexString(Math.abs(SECURE_RANDOM.nextLong()));
            if (!kioskPublicAccessTokenExists(nextToken)) {
                return nextToken;
            }
        }
    }

    private boolean kioskPublicAccessTokenExists(String publicAccessToken) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_kiosk_devices
                WHERE public_access_token = ?
                """,
            Integer.class,
            publicAccessToken
        );
        return count != null && count > 0;
    }

    private void ensureUniqueAccessProfile(long companyId, long employeeId, Long profileId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_employee_access_profiles
                WHERE company_id = ?
                  AND employee_id = ?
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            employeeId,
            profileId,
            profileId
        );
        if (count != null && count > 0) {
            throw new IllegalArgumentException("Employee already has an access profile.");
        }
    }

    private void ensureUniqueAccessMethod(long companyId, Long methodId, String methodType, String credentialRef) {
        if (credentialRef == null) {
            return;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_employee_access_methods
                WHERE company_id = ?
                  AND method_type = ?
                  AND credential_ref = ?
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            methodType,
            credentialRef,
            methodId,
            methodId
        );
        if (count != null && count > 0) {
            throw new IllegalArgumentException("Credential reference must be unique within the company.");
        }
    }

    private PublicKioskContext requirePublicKioskIdentificationContext(String deviceToken, Map<String, Object> payload) {
        var kioskDevice = loadKioskDeviceByPublicAccessToken(deviceToken);
        requirePublicKioskLocation(kioskDevice);
        var identificationToken = stringValue(payload, "identification_token");
        var tokenClaims = verifyPublicKioskIdentificationToken(deviceToken, identificationToken);
        var employee = loadAttendanceEmployee(kioskDevice.companyId(), tokenClaims.employeeId());
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("This employee is terminated and cannot record attendance.");
        }
        return new PublicKioskContext(kioskDevice, employee, tokenClaims);
    }

    private void ensureFaceVerificationSessionBelongsTo(long companyId, long employeeId, long sessionId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_face_verification_sessions
                WHERE company_id = ?
                  AND employee_id = ?
                  AND id = ?
                """,
            Integer.class,
            companyId,
            employeeId,
            sessionId
        );
        if (count == null || count == 0) {
            throw new NoSuchElementException("Face verification session not found.");
        }
    }

    private void validateOperationalScope(long companyId, Long unitId, Long businessId, Long locationId) {
        if (unitId != null) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM units WHERE id = ? AND (company_id = ? OR company_id IS NULL)",
                Integer.class,
                unitId,
                companyId
            );
            if (count == null || count == 0) {
                throw new IllegalArgumentException("Selected unit does not exist.");
            }
        }

        if (businessId != null) {
            var rows = jdbcTemplate.query(
                """
                    SELECT id, unit_id
                    FROM businesses
                    WHERE id = ?
                      AND (company_id = ? OR company_id IS NULL)
                    LIMIT 1
                    """,
                (rs, rowNum) -> new ScopeBusinessRow(rs.getLong("id"), getNullableLong(rs, "unit_id")),
                businessId,
                companyId
            );
            if (rows.isEmpty()) {
                throw new IllegalArgumentException("Selected business does not exist.");
            }
            var business = rows.getFirst();
            if (unitId != null && business.unitId() != null && !unitId.equals(business.unitId())) {
                throw new IllegalArgumentException("The selected business does not belong to the selected unit.");
            }
        }

        if (locationId != null) {
            loadLocation(companyId, locationId);
        }
    }

    private Long normalizeOptionalForeignKey(Long value) {
        return value == null || value <= 0 ? null : value;
    }

    private Map<String, Object> normalizePayload(Map<String, Object> payload) {
        return payload == null ? Map.of() : payload;
    }

    private String normalizeAuthMethod(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        normalized = switch (normalized) {
            case "", "manual", "manual_override" -> "manual_override";
            case "pin" -> "pin";
            case "badge", "badge_code" -> "badge";
            case "password" -> "password";
            case "facial_recognition", "face", "face_id" -> "facial_recognition";
            default -> throw new IllegalArgumentException("Unsupported auth_method.");
        };
        return normalized;
    }

    private String normalizeEnabledAuthMethod(String value) {
        return normalizeAuthMethod(value);
    }

    private String normalizePublicKioskAuthMethod(String value) {
        var normalized = normalizeEnabledAuthMethod(value);
        if (!PUBLIC_KIOSK_AUTH_METHODS.contains(normalized)) {
            throw new IllegalArgumentException("Public kiosk auth_method must be pin.");
        }
        return normalized;
    }

    private String normalizeEventKind(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        normalized = normalized.replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "", "check_in", "ingreso", "entrada" -> "check_in";
            case "check_out", "salida" -> "check_out";
            case "break_out", "lunch_out" -> "break_out";
            case "break_in", "lunch_in" -> "break_in";
            case "auth_attempt" -> "auth_attempt";
            case "manual_override", "override" -> "manual_override";
            case "correction", "correccion" -> "correction";
            default -> throw new IllegalArgumentException("Unsupported event_kind.");
        };
    }

    private String normalizeEventTypeForStorage(String eventKind) {
        return switch (eventKind) {
            case "check_in", "check_out", "break_out", "break_in", "auth_attempt", "manual_override", "correction" -> eventKind;
            default -> throw new IllegalArgumentException("Unsupported event type.");
        };
    }

    private String normalizePublicKioskEventType(String value) {
        var normalized = normalizeEventType(value);
        return switch (normalized) {
            case "check_in", "check_out" -> normalized;
            default -> throw new IllegalArgumentException("Public kiosk event_type must be check_in or check_out.");
        };
    }

    private String createPublicKioskIdentificationToken(
        String deviceToken,
        long employeeId,
        String authMethod,
        long expiresAtEpochSeconds
    ) {
        var payload = Map.of(
            "device_token", deviceToken,
            "employee_id", employeeId,
            "auth_method", authMethod,
            "expires_at_epoch", expiresAtEpochSeconds
        );
        try {
            var encodedPayload = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(objectMapper.writeValueAsBytes(payload));
            return encodedPayload + "." + signKioskIdentificationToken(encodedPayload);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to create kiosk identification token.", ex);
        }
    }

    private PublicKioskIdentificationToken verifyPublicKioskIdentificationToken(String deviceToken, String identificationToken) {
        if (identificationToken == null || identificationToken.isBlank()) {
            throw new IllegalArgumentException("identification_token is required.");
        }

        var segments = identificationToken.split("\\.");
        if (segments.length != 2) {
            throw new IllegalArgumentException("identification_token is invalid.");
        }

        var expectedSignature = signKioskIdentificationToken(segments[0]);
        if (!MessageDigest.isEqual(
            expectedSignature.getBytes(StandardCharsets.UTF_8),
            segments[1].getBytes(StandardCharsets.UTF_8)
        )) {
            throw new IllegalArgumentException("identification_token is invalid.");
        }

        try {
            var payloadJson = Base64.getUrlDecoder().decode(segments[0]);
            var payload = objectMapper.readValue(payloadJson, new TypeReference<Map<String, Object>>() {
            });
            var tokenDevice = safe(String.valueOf(payload.getOrDefault("device_token", "")));
            var authMethod = safe(String.valueOf(payload.getOrDefault("auth_method", "")));
            var employeeId = parseLong(payload, "employee_id");
            var expiresAtEpoch = parseLong(payload, "expires_at_epoch");

            if (employeeId == null || employeeId <= 0 || expiresAtEpoch == null || expiresAtEpoch <= 0) {
                throw new IllegalArgumentException("identification_token is invalid.");
            }
            if (!Objects.equals(tokenDevice, deviceToken)) {
                throw new IllegalArgumentException("identification_token does not belong to this kiosk.");
            }
            if (Instant.now().getEpochSecond() > expiresAtEpoch) {
                throw new IllegalArgumentException("identification_token has expired.");
            }

            return new PublicKioskIdentificationToken(employeeId, normalizePublicKioskAuthMethod(authMethod), expiresAtEpoch);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("identification_token is invalid.");
        }
    }

    private String signKioskIdentificationToken(String encodedPayload) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(kioskIdentificationTokenSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(mac.doFinal(encodedPayload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign kiosk identification token.", ex);
        }
    }

    private String pinCredentialReference(long companyId, String rawPin) {
        var normalizedPin = nullable(rawPin);
        if (normalizedPin == null) {
            throw new IllegalArgumentException("PIN is required.");
        }

        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(kioskIdentificationTokenSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            var payload = companyId + ":" + normalizedPin;
            var digest = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            return "pin:v1:" + digest;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to prepare PIN credential reference.", ex);
        }
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private String toJson(Object value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("metadata must be valid JSON.");
        }
    }

    private String mergeMetadataJson(String baseJson, Map<String, Object> additions) {
        var merged = new LinkedHashMap<String, Object>();
        merged.putAll(parseJsonMap(baseJson));
        merged.putAll(additions);
        return toJson(merged);
    }

    private String mergeKioskInternalMetadata(String candidateJson, String existingJson) {
        var candidate = new LinkedHashMap<String, Object>();
        candidate.putAll(parseJsonMap(candidateJson));
        var existing = parseJsonMap(existingJson);
        if (existing.containsKey(PUBLIC_KIOSK_PIN_THROTTLE_METADATA_KEY)) {
            candidate.put(PUBLIC_KIOSK_PIN_THROTTLE_METADATA_KEY, existing.get(PUBLIC_KIOSK_PIN_THROTTLE_METADATA_KEY));
        }
        return toJson(candidate);
    }

    private String metadataTextValue(Object value) {
        if (value == null) {
            return null;
        }
        var normalized = String.valueOf(value).trim();
        return normalized.isBlank() || "null".equalsIgnoreCase(normalized) ? null : normalized;
    }

    private String resolveSecretHashForAccessMethod(AccessMethodRow existing, String methodType, String secretRaw) {
        if (!"pin".equals(methodType) && !"password".equals(methodType)) {
            return null;
        }
        if (secretRaw != null) {
            return passwordEncoder.encode(secretRaw);
        }
        if (existing != null
            && ("pin".equals(existing.methodType()) || "password".equals(existing.methodType()))
            && existing.secretHash() != null
        ) {
            return existing.secretHash();
        }
        throw new IllegalArgumentException("secret is required for pin and password methods.");
    }

    private void ensureUniqueLocationName(long companyId, Long locationId, String name) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_locations
                WHERE company_id = ?
                  AND LOWER(name) = LOWER(?)
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            name,
            locationId,
            locationId
        );

        if (count != null && count > 0) {
            throw new IllegalArgumentException("Attendance location name must be unique.");
        }
    }

    private void ensureUniqueTemplateName(long companyId, Long templateId, String name) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_schedule_templates
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

    private String normalizeManagedStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "active", "activo" -> "active";
            case "inactive", "inactivo" -> "inactive";
            default -> throw new IllegalArgumentException("status must be active or inactive.");
        };
    }

    private List<ScheduleTemplateDayDefinition> parseTemplateDays(Map<String, Object> payload, String scheduleMode) {
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

    private String normalizeScheduleMode(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "strict", "horario estricto", "strict_schedule" -> "strict";
            case "open", "horario abierto", "open_schedule" -> "open";
            default -> throw new IllegalArgumentException("schedule_mode must be strict or open.");
        };
    }

    private String displayScheduleTemplateName(String name) {
        if (name == null) {
            return null;
        }
        return name.startsWith("Spring Default Schedule")
            ? "Default Schedule" + name.substring("Spring Default Schedule".length())
            : name;
    }

    private void validateScheduleTemplateWorkSiteCompatibility(ScheduleTemplateDefinition template, LocationRow workSite) {
        if (template == null || workSite == null || !template.enforceLocation() || template.locationId() == null) {
            return;
        }

        if (!Objects.equals(template.locationId(), workSite.id())) {
            throw new IllegalArgumentException("The selected schedule location does not match the assigned contract site.");
        }
    }

    private void validateScheduleTemplateWorkSiteCompatibility(ScheduleTemplateDefinition template, WorkSiteAssignmentRow workSiteAssignment) {
        validateScheduleTemplateWorkSiteCompatibility(template, workSiteAssignment == null ? null : workSiteAssignment.location());
    }

    private void validateLocationCanBeAssigned(LocationRow location) {
        if (location == null || "inactive".equalsIgnoreCase(location.status())) {
            throw new IllegalArgumentException("Only active locations can be assigned.");
        }
    }

    private void validateEmployeeIsFreeForAssignment(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        if (hasAttendanceActivityInRange(companyId, employeeId, startDate, endDate)) {
            throw new IllegalArgumentException("Employee already has attendance activity in this date range. Remove the existing shift or choose another date.");
        }
        if (hasActiveWorkSiteAssignmentOverlap(companyId, employeeId, startDate, endDate)) {
            throw new IllegalArgumentException("Employee already has an active contract site assignment in this date range. Remove the existing shift before assigning a contract site.");
        }
        if (hasActiveScheduleAssignmentOverlap(companyId, employeeId, startDate, endDate)) {
            throw new IllegalArgumentException("Employee already has an active schedule in this date range. Remove the existing shift before assigning new work.");
        }
    }

    private boolean hasAttendanceActivityInRange(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        var rangeEnd = assignmentRangeEnd(endDate);
        Integer eventCount = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE company_id = ?
                  AND employee_id = ?
                  AND attendance_date BETWEEN ? AND ?
                  AND event_type IN ('check_in', 'check_out', 'break_out', 'break_in')
                """,
            Integer.class,
            companyId,
            employeeId,
            startDate,
            rangeEnd
        );
        if (eventCount != null && eventCount > 0) {
            return true;
        }

        Integer recordCount = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_daily_records
                WHERE company_id = ?
                  AND employee_id = ?
                  AND attendance_date BETWEEN ? AND ?
                  AND (first_check_in_at IS NOT NULL OR last_check_out_at IS NOT NULL)
                """,
            Integer.class,
            companyId,
            employeeId,
            startDate,
            rangeEnd
        );
        return recordCount != null && recordCount > 0;
    }

    private boolean hasActiveScheduleAssignmentOverlap(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        return hasActiveAssignmentOverlap(
            "hr_employee_schedule_assignments",
            companyId,
            employeeId,
            startDate,
            endDate
        );
    }

    private boolean hasActiveWorkSiteAssignmentOverlap(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        return hasActiveAssignmentOverlap(
            "hr_employee_work_site_assignments",
            companyId,
            employeeId,
            startDate,
            endDate
        );
    }

    private boolean hasActiveWorkSiteLocationAssignmentOverlap(long companyId, long locationId, LocalDate startDate, LocalDate endDate) {
        var rangeEnd = assignmentRangeEnd(endDate);
        Integer count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_employee_work_site_assignments
                WHERE company_id = ?
                  AND location_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                """,
            Integer.class,
            companyId,
            locationId,
            rangeEnd,
            startDate
        );
        return count != null && count > 0;
    }

    private boolean hasActiveAssignmentOverlap(
        String tableName,
        long companyId,
        long employeeId,
        LocalDate startDate,
        LocalDate endDate
    ) {
        var rangeEnd = assignmentRangeEnd(endDate);
        Integer count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM %s
                WHERE company_id = ?
                  AND employee_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                """.formatted(tableName),
            Integer.class,
            companyId,
            employeeId,
            rangeEnd,
            startDate
        );
        return count != null && count > 0;
    }

    private LocalDate assignmentRangeEnd(LocalDate endDate) {
        return endDate == null ? LocalDate.of(9999, 12, 31) : endDate;
    }

    private LocationRow resolveScheduleRegistrationLocation(
        long companyId,
        AttendanceEmployee employee,
        ScheduleRule scheduleRule,
        String eventType,
        Long requestedLocationId,
        BigDecimal latitude,
        BigDecimal longitude,
        WorkSiteAssignmentRow activeWorkSite
    ) {
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventType)) {
            return resolveKioskLocation(companyId, requestedLocationId, latitude, longitude);
        }

        if (activeWorkSite != null) {
            return resolveAllowedAttendanceLocation(
                List.of(activeWorkSite.location()),
                requestedLocationId,
                latitude,
                longitude,
                "Attendance registration is restricted to today's assigned contract site: " + activeWorkSite.location().name() + ".",
                "Attendance registration is restricted to today's assigned contract site: " + activeWorkSite.location().name() + "."
            );
        }

        if (isOpenSchedule(scheduleRule)) {
            return resolveAllowedAttendanceLocation(
                loadCompanyBusinessStructureAttendanceLocations(companyId),
                requestedLocationId,
                latitude,
                longitude,
                "Business Structure locations are not configured for this company.",
                "Open schedule attendance is restricted to active Business Structure locations."
            );
        }

        if (scheduleRule != null && scheduleRule.enforceLocation() && scheduleRule.locationId() != null) {
            return resolveAllowedAttendanceLocation(
                List.of(loadLocation(companyId, scheduleRule.locationId())),
                requestedLocationId,
                latitude,
                longitude,
                "Schedule location is not configured.",
                "Attendance registration is restricted to the configured schedule location."
            );
        }

        return resolveEmployeeBusinessAttendanceLocation(companyId, employee, requestedLocationId, latitude, longitude);
    }

    private LocationRow resolveEmployeeBusinessAttendanceLocation(
        long companyId,
        AttendanceEmployee employee,
        Long requestedLocationId,
        BigDecimal latitude,
        BigDecimal longitude
    ) {
        if (employee.businessId() == null) {
            throw new IllegalArgumentException("Employee business is not assigned. Set the employee business before recording attendance.");
        }

        return resolveAllowedAttendanceLocation(
            loadBusinessStructureAttendanceLocations(companyId, employee.businessId()),
            requestedLocationId,
            latitude,
            longitude,
            "Business Structure location is not configured for " + employee.businessName() + ".",
            "Attendance registration is restricted to the employee's assigned business location."
        );
    }

    private LocationRow resolveAllowedAttendanceLocation(
        List<LocationRow> allowedLocations,
        Long requestedLocationId,
        BigDecimal latitude,
        BigDecimal longitude,
        String emptyMessage,
        String restrictedMessage
    ) {
        if (allowedLocations.isEmpty()) {
            throw new IllegalArgumentException(emptyMessage);
        }

        LocationRow location;
        if (requestedLocationId != null && requestedLocationId > 0) {
            location = allowedLocations.stream()
                .filter(item -> Objects.equals(item.id(), requestedLocationId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(restrictedMessage));
        } else {
            location = allowedLocations.stream()
                .min(Comparator.comparing(item -> distanceMeters(item.latitude(), item.longitude(), latitude, longitude)))
                .orElseThrow(() -> new IllegalArgumentException(emptyMessage));
        }

        validateLocationRadius(location, latitude, longitude);
        return location;
    }

    private void validateLocationRadius(LocationRow location, BigDecimal latitude, BigDecimal longitude) {
        var distance = distanceMeters(location.latitude(), location.longitude(), latitude, longitude);
        if (distance > location.radiusMeters()) {
            throw new IllegalArgumentException("The device is outside the allowed attendance location radius.");
        }
    }

    private boolean isOpenSchedule(ScheduleRule scheduleRule) {
        return scheduleRule != null && "open".equalsIgnoreCase(safe(scheduleRule.scheduleMode()));
    }

    private boolean isOvernightSchedule(ScheduleRule scheduleRule) {
        return scheduleRule != null
            && !scheduleRule.isRestDay()
            && !isOpenSchedule(scheduleRule)
            && scheduleRule.startTime() != null
            && scheduleRule.endTime() != null
            && scheduleRule.endTime().isBefore(scheduleRule.startTime());
    }

    private LocalDateTime scheduledEndDateTime(LocalDate attendanceDate, ScheduleRule scheduleRule) {
        var scheduledEnd = attendanceDate.atTime(scheduleRule.endTime());
        return isOvernightSchedule(scheduleRule) ? scheduledEnd.plusDays(1) : scheduledEnd;
    }

    private void validateScheduleRegistrationPolicy(
        ScheduleRule scheduleRule,
        String eventType,
        LocalDateTime eventTimestamp,
        LocalDate attendanceDate
    ) {
        if (scheduleRule == null || scheduleRule.isRestDay() || !"check_in".equals(eventType)) {
            return;
        }

        if (isOpenSchedule(scheduleRule)) {
            return;
        }

        if (scheduleRule.startTime() != null) {
            var scheduledStart = attendanceDate.atTime(scheduleRule.startTime());
            var earliestAllowedCheckIn = scheduledStart.minus(EARLY_CHECK_IN_ALLOWANCE);
            if (eventTimestamp.isBefore(earliestAllowedCheckIn)) {
                throw new IllegalArgumentException("Check-in opens 15 minutes before the scheduled start time.");
            }
        }

        if (scheduleRule.blockAfterGracePeriod() && scheduleRule.startTime() != null) {
            var scheduledStart = attendanceDate.atTime(scheduleRule.startTime());
            var graceDeadline = scheduledStart.plusMinutes(scheduleRule.lateAfterMinutes());
            if (eventTimestamp.isAfter(graceDeadline)) {
                throw new IllegalArgumentException("Attendance registration is blocked after the grace period expires.");
            }
        }
    }

    private boolean parseBoolean(Map<String, Object> payload, String key) {
        payload = normalizePayload(payload);
        var value = payload.get(key);
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        if (value instanceof String string) {
            var normalized = string.trim().toLowerCase(Locale.ROOT);
            return switch (normalized) {
                case "true", "1", "yes", "si", "sí" -> true;
                case "", "false", "0", "no" -> false;
                default -> throw new IllegalArgumentException(key + " must be boolean.");
            };
        }
        return false;
    }

    private LocalTime parseTime(Map<String, Object> payload, String key) {
        var raw = stringValue(payload, key);
        if (raw.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(raw);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(key + " must use HH:MM[:SS] format.");
        }
    }

    private int closeOverlappingAssignments(long companyId, long userId, long employeeId, LocalDate startDate, LocalDate endDate) {
        var overlapEnd = assignmentRangeEnd(endDate);
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       template_id AS assignment_target_id,
                       effective_start_date,
                       effective_end_date
                FROM hr_employee_schedule_assignments
                WHERE company_id = ?
                  AND employee_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                ORDER BY effective_start_date ASC, id ASC
                """,
            (rs, rowNum) -> new ExistingAssignmentRow(
                rs.getLong("id"),
                rs.getLong("assignment_target_id"),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class)
            ),
            companyId,
            employeeId,
            overlapEnd,
            startDate
        );

        int updatedCount = 0;
        for (var row : rows) {
            updatedCount += removeAssignmentDateFromRange(
                "hr_employee_schedule_assignments",
                "template_id",
                row,
                companyId,
                userId,
                employeeId,
                startDate,
                overlapEnd
            );
        }
        return updatedCount;
    }

    private int closeOverlappingWorkSiteAssignments(long companyId, long userId, long employeeId, LocalDate startDate, LocalDate endDate) {
        var overlapEnd = assignmentRangeEnd(endDate);
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       location_id AS assignment_target_id,
                       effective_start_date,
                       effective_end_date
                FROM hr_employee_work_site_assignments
                WHERE company_id = ?
                  AND employee_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                ORDER BY effective_start_date ASC, id ASC
                """,
            (rs, rowNum) -> new ExistingAssignmentRow(
                rs.getLong("id"),
                rs.getLong("assignment_target_id"),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class)
            ),
            companyId,
            employeeId,
            overlapEnd,
            startDate
        );

        int updatedCount = 0;
        for (var row : rows) {
            updatedCount += removeAssignmentDateFromRange(
                "hr_employee_work_site_assignments",
                "location_id",
                row,
                companyId,
                userId,
                employeeId,
                startDate,
                overlapEnd
            );
        }
        return updatedCount;
    }

    private int removeAssignmentDateFromRange(
        String tableName,
        String assignmentColumn,
        ExistingAssignmentRow row,
        long companyId,
        long userId,
        long employeeId,
        LocalDate removeStartDate,
        LocalDate removeEndDate
    ) {
        var rowEnd = assignmentRangeEnd(row.effectiveEndDate());
        var afterStart = removeEndDate.plusDays(1);
        var operations = 0;

        if (row.effectiveStartDate().isBefore(removeStartDate)) {
            operations += jdbcTemplate.update(
                """
                    UPDATE %s
                    SET effective_end_date = ?
                    WHERE id = ?
                    """.formatted(tableName),
                removeStartDate.minusDays(1),
                row.id()
            );

            if (rowEnd.isAfter(removeEndDate)) {
                operations += insertAssignmentRemainder(
                    tableName,
                    assignmentColumn,
                    companyId,
                    userId,
                    employeeId,
                    row.assignmentTargetId(),
                    afterStart,
                    row.effectiveEndDate()
                );
            }
            return operations;
        }

        if (rowEnd.isAfter(removeEndDate)) {
            operations += jdbcTemplate.update(
                """
                    UPDATE %s
                    SET effective_start_date = ?
                    WHERE id = ?
                    """.formatted(tableName),
                afterStart,
                row.id()
            );
            return operations;
        }

        operations += jdbcTemplate.update(
            """
                UPDATE %s
                SET status = 'inactive',
                    effective_end_date = ?
                WHERE id = ?
                """.formatted(tableName),
            row.effectiveEndDate() != null ? row.effectiveEndDate() : row.effectiveStartDate(),
            row.id()
        );
        return operations;
    }

    private int insertAssignmentRemainder(
        String tableName,
        String assignmentColumn,
        long companyId,
        long userId,
        long employeeId,
        long assignmentTargetId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
        return jdbcTemplate.update(
            """
                INSERT INTO %s
                (company_id, employee_id, %s, effective_start_date, effective_end_date, status, created_by)
                VALUES (?, ?, ?, ?, ?, 'active', ?)
                """.formatted(tableName, assignmentColumn),
            companyId,
            employeeId,
            assignmentTargetId,
            effectiveStartDate,
            effectiveEndDate,
            userId
        );
    }

    private String signedPhotoUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }

        return objectStorageService.presignDownload(
            attendanceBucket(),
            objectKey,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );
    }

    private String normalizeAttendancePhotoObjectKey(long companyId, long employeeId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }

        var trimmed = objectKey.trim();
        var expectedPrefix = "hr/attendance/" + companyId + "/" + employeeId + "/";
        if (!trimmed.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("photo_url must match the expected attendance upload prefix.");
        }

        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        if (!objectStorageService.objectExists(attendanceBucket(), trimmed)) {
            throw new IllegalArgumentException("photo_url does not reference an existing uploaded object.");
        }

        return trimmed;
    }

    private String normalizeImageContentType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "image/jpeg", "image/jpg" -> "image/jpeg";
            case "image/png" -> "image/png";
            case "image/webp" -> "image/webp";
            default -> throw new IllegalArgumentException("content_type must be image/jpeg, image/png, or image/webp.");
        };
    }

    private String buildAttendancePhotoObjectKey(long companyId, long employeeId, String contentType, String eventType, LocalDate attendanceDate) {
        var targetDate = attendanceDate == null ? LocalDate.now() : attendanceDate;
        return "hr/attendance/"
            + companyId + "/"
            + employeeId + "/"
            + targetDate.getYear() + "/"
            + String.format("%02d", targetDate.getMonthValue()) + "/"
            + String.format("%02d", targetDate.getDayOfMonth()) + "/"
            + normalizeEventType(eventType.isBlank() ? "check_in" : eventType) + "-"
            + UUID.randomUUID()
            + extensionForContentType(contentType);
    }

    private String extensionForContentType(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private String attendanceBucket() {
        return objectStorageProperties.getMinio().getBucketAttendance();
    }

    private String normalizeEventType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "check_in", "ingreso", "entrada" -> "check_in";
            case "check_out", "salida" -> "check_out";
            case "break_out", "salida_descanso", "lunch_out" -> "break_out";
            case "break_in", "regreso_descanso", "lunch_in" -> "break_in";
            default -> throw new IllegalArgumentException("event_type must be check_in, check_out, break_out, or break_in.");
        };
    }

    private String normalizeAttendanceStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        normalized = normalized.replace('-', '_').replace(' ', '_');
        normalized = switch (normalized) {
            case "a_tiempo", "presente", "asistencia" -> "on_time";
            case "retardo", "late" -> "late";
            case "permiso", "leave" -> "leave";
            case "descanso", "rest" -> "rest";
            case "falta", "absence" -> "absence";
            case "pendiente", "scheduled", "pending" -> "pending";
            case "sin_horario", "not_scheduled", "unassigned" -> "not_scheduled";
            default -> normalized;
        };

        if (!ATTENDANCE_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported attendance status.");
        }
        return normalized;
    }

    private String normalizeNullableAttendanceStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return normalizeAttendanceStatus(value);
    }

    private BigDecimal parseDecimalRequired(Map<String, Object> payload, String key) {
        var raw = stringValue(payload, key);
        if (raw.isBlank()) {
            throw new IllegalArgumentException(key + " is required.");
        }
        try {
            return new BigDecimal(raw).setScale(7, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(key + " must be a valid decimal.");
        }
    }

    private BigDecimal normalizeRequiredHoursPerDay(BigDecimal value) {
        var resolved = value == null ? new BigDecimal("8.00") : value;
        if (resolved.compareTo(BigDecimal.ZERO) <= 0 || resolved.compareTo(new BigDecimal("24.00")) > 0) {
            throw new IllegalArgumentException("required_hours_per_day must be greater than zero and no more than 24.");
        }
        return resolved.setScale(2, RoundingMode.HALF_UP);
    }

    private void validatePreferredTimeRange(LocalTime startTime, LocalTime endTime) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("required_start_time and required_end_time are required.");
        }
        if (endTime.equals(startTime)) {
            throw new IllegalArgumentException("required_end_time cannot equal required_start_time.");
        }
    }

    private double distanceMeters(BigDecimal latitudeA, BigDecimal longitudeA, BigDecimal latitudeB, BigDecimal longitudeB) {
        var earthRadiusMeters = 6_371_000d;
        var lat1 = Math.toRadians(latitudeA.doubleValue());
        var lon1 = Math.toRadians(longitudeA.doubleValue());
        var lat2 = Math.toRadians(latitudeB.doubleValue());
        var lon2 = Math.toRadians(longitudeB.doubleValue());

        var deltaLat = lat2 - lat1;
        var deltaLon = lon2 - lon1;
        var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
            + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusMeters * c;
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private String toIsoString(LocalDateTime value) {
        return value == null ? null : value.toString();
    }

    private String dateString(LocalDate value) {
        return value == null ? null : value.toString();
    }

    private void ensureAttendanceDateEditable(AttendanceEmployee employee, LocalDate date) {
        AttendanceEditPolicy.requireEditable(employee.hireDate(), date);
    }

    private String attendanceEditLockReason(AttendanceEmployee employee, LocalDate date) {
        return AttendanceEditPolicy.lockReason(employee.hireDate(), date);
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private void setNullableLong(java.sql.PreparedStatement statement, int parameterIndex, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(parameterIndex, Types.BIGINT);
        } else {
            statement.setLong(parameterIndex, value);
        }
    }

    private KioskDeviceRow mapKioskDeviceRow(ResultSet rs) throws SQLException {
        return new KioskDeviceRow(
            rs.getLong("id"),
            rs.getLong("company_id"),
            getNullableLong(rs, "unit_id"),
            safe(rs.getString("unit_name")),
            getNullableLong(rs, "business_id"),
            safe(rs.getString("business_name")),
            getNullableLong(rs, "location_id"),
            safe(rs.getString("location_name")),
            safe(rs.getString("code")),
            safe(rs.getString("name")),
            safe(rs.getString("status")),
            safe(rs.getString("public_access_token")),
            safe(rs.getString("metadata_json"))
        );
    }

    public static LocalDate parseDate(String value) {
        return AttendanceDateParser.parseDate(value);
    }

    public static YearMonth parseMonth(String value) {
        return AttendanceDateParser.parseMonth(value);
    }

}
