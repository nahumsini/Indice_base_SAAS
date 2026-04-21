package com.indice.erp.hr;

import static com.indice.erp.hr.HrPayloadUtils.nullable;
import static com.indice.erp.hr.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.HrPayloadUtils.safe;
import static com.indice.erp.hr.HrPayloadUtils.stringValue;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.face.HrFaceService;
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
        "absence"
    );
    private static final List<String> PUBLIC_KIOSK_AUTH_METHODS = List.of("pin", "badge");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JdbcTemplate jdbcTemplate;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final HrFaceService hrFaceService;
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
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule);

            switch (effectiveStatus) {
                case "on_time" -> onTimeCount++;
                case "late" -> lateCount++;
                case "leave" -> leaveCount++;
                case "rest" -> restCount++;
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
            item.put("status", effectiveStatus);
            item.put("system_status", dailyRecord != null ? dailyRecord.systemStatus() : inferSystemStatus(scheduleRule));
            item.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            item.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            item.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            item.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : calculateMinutesLate(scheduleRule, null));
            item.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            item.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
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

        var days = new ArrayList<Map<String, Object>>();
        for (var currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
            var dailyRecord = dailyRecords.get(currentDate);
            var scheduleRule = resolveScheduleRule(scheduleWindows, currentDate);
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule);

            var day = new LinkedHashMap<String, Object>();
            day.put("date", currentDate.toString());
            day.put("day", currentDate.getDayOfMonth());
            day.put("effective_status", effectiveStatus);
            day.put("system_status", dailyRecord != null ? dailyRecord.systemStatus() : inferSystemStatus(scheduleRule));
            day.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            day.put("entry_registered", dailyRecord != null && dailyRecord.firstCheckInAt() != null);
            day.put("exit_registered", dailyRecord != null && dailyRecord.lastCheckOutAt() != null);
            day.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            day.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            day.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : 0);
            day.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            day.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
            day.put("first_photo_url", dailyRecord != null ? signedPhotoUrl(dailyRecord.firstPhotoObjectKey()) : null);
            day.put("last_photo_url", dailyRecord != null ? signedPhotoUrl(dailyRecord.lastPhotoObjectKey()) : null);
            day.put("notes", dailyRecord != null ? dailyRecord.notes() : null);
            days.add(day);
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("employee", Map.of(
            "id", employee.id(),
            "full_name", employee.fullName(),
            "position_title", employee.positionTitle(),
            "department", employee.department()
        ));
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
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule);
            var systemStatus = dailyRecord != null ? dailyRecord.systemStatus() : inferSystemStatus(scheduleRule);

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
            item.put("schedule_template_id", assignment != null ? assignment.templateId() : null);
            item.put("schedule_template_name", assignment != null ? assignment.templateName() : null);
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
            item.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : calculateMinutesLate(scheduleRule, null));
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
            body.put("name", template.templateName());
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

    public Map<String, Object> listKioskDevices(long companyId) {
        return Map.of("items", listKioskDevicesRows(companyId).stream().map(this::toKioskDeviceMap).toList());
    }

    @Transactional
    public Map<String, Object> saveKioskDevice(long companyId, long userId, Long kioskDeviceId, Map<String, Object> payload) {
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
        var publicAccessToken = kioskDeviceId == null || kioskDeviceId <= 0
            ? generateUniqueKioskPublicAccessToken()
            : loadKioskDevice(companyId, kioskDeviceId).publicAccessToken();
        if (kioskDeviceId == null || kioskDeviceId <= 0) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
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
                statement.setString(8, publicAccessToken);
                statement.setString(9, metadataJson);
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

    @Transactional
    public Map<String, Object> publicKioskIdentify(String deviceToken, Map<String, Object> payload) {
        var kioskDevice = loadKioskDeviceByPublicAccessToken(deviceToken);
        var location = requirePublicKioskLocation(kioskDevice);
        var authMethod = normalizePublicKioskAuthMethod(stringValue(payload, "auth_method", "method_type"));
        var credentialPayload = nullable(stringValue(payload, "credential_payload", "credential", "pin", "badge_code"));
        if (credentialPayload == null || credentialPayload.isBlank()) {
            throw new IllegalArgumentException("credential_payload is required.");
        }

        var resolvedMethod = resolvePublicKioskAccessMethod(kioskDevice.companyId(), authMethod, credentialPayload);
        if (resolvedMethod == null) {
            throw new IllegalArgumentException("Credential validation failed.");
        }

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
        return body;
    }

    @Transactional
    public Map<String, Object> publicKioskPunch(String deviceToken, Map<String, Object> payload) {
        var kioskDevice = loadKioskDeviceByPublicAccessToken(deviceToken);
        var location = requirePublicKioskLocation(kioskDevice);
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

        var scheduleRule = loadScheduleRule(kioskDevice.companyId(), employee.id(), eventTimestamp.toLocalDate());
        validateScheduleRegistrationPolicy(scheduleRule, eventType, eventTimestamp, location);
        validateOperationalEventTransition(kioskDevice.companyId(), employee.id(), eventTimestamp, eventType);

        var metadataJson = mergeMetadataJson(
            toJson(payload.get("metadata")),
            Map.of(
                "public_kiosk", true,
                "identified_employee_id", employee.id()
            )
        );
        var operationalEventId = appendAttendanceEvent(
            kioskDevice.companyId(),
            employee.id(),
            eventType,
            eventTimestamp,
            location.id(),
            kioskDevice.id(),
            location.latitude(),
            location.longitude(),
            null,
            "kiosk_public",
            tokenClaims.authMethod(),
            "success",
            eventType,
            metadataJson,
            null,
            null,
            0L
        );

        var dailyRecord = rebuildDailyRecordProjection(kioskDevice.companyId(), employee.id(), eventTimestamp.toLocalDate());
        var result = new LinkedHashMap<String, Object>();
        result.put("event_id", operationalEventId);
        result.put("employee_id", employee.id());
        result.put("event_kind", eventType);
        result.put("auth_method", tokenClaims.authMethod());
        result.put("result_status", "success");
        result.put("status", resolveEffectiveStatus(dailyRecord, scheduleRule));
        result.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
        result.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
        result.put("location", toLocationMap(location));
        return result;
    }

    public Map<String, Object> listAccessProfiles(long companyId) {
        var profiles = listAccessProfilesRows(companyId);
        return Map.of("items", profiles.stream().map(this::toAccessProfileMap).toList());
    }

    @Transactional
    public Map<String, Object> saveAccessProfile(long companyId, long userId, Long profileId, Map<String, Object> payload) {
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

        ensureManualOverrideMethod(companyId, profileId);
        return Map.of("access_profile", toAccessProfileMap(loadAccessProfile(companyId, profileId)));
    }

    public Map<String, Object> listAccessMethods(long companyId) {
        var items = loadAccessMethods(companyId, null).stream().map(this::toAccessMethodMap).toList();
        return Map.of("items", items);
    }

    @Transactional
    public Map<String, Object> saveAccessMethod(long companyId, Long methodId, Map<String, Object> payload) {
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
        if (!"badge".equals(methodType)) {
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
            ensureManualOverrideMethod(companyId, existingProfile.id());
            return;
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_employee_access_profiles
                    (company_id, employee_id, status, default_method, last_enrolled_at, metadata_json, created_by)
                    VALUES (?, ?, 'active', 'manual_override', ?, CAST(? AS JSON), ?)
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

        var profileId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        if (profileId != null) {
            ensureManualOverrideMethod(companyId, profileId);
        }
    }

    public Map<String, Object> listControlLocations(long companyId) {
        var body = new LinkedHashMap<String, Object>();
        body.put("items", loadLocationRows(companyId, false).stream().map(this::toLocationMap).toList());
        return body;
    }

    @Transactional
    public Map<String, Object> saveLocation(long companyId, long userId, Long locationId, Map<String, Object> payload) {
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

        var status = normalizeManagedStatus(stringValue(payload, "status"));
        ensureUniqueLocationName(companyId, locationId, name);

        if (locationId == null || locationId <= 0) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO hr_attendance_locations
                        (company_id, name, latitude, longitude, radius_meters, status, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                statement.setString(2, name);
                statement.setBigDecimal(3, latitude);
                statement.setBigDecimal(4, longitude);
                statement.setInt(5, radiusMeters);
                statement.setString(6, status);
                statement.setLong(7, userId);
                return statement;
            }, keyHolder);
            locationId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        } else {
            var updated = jdbcTemplate.update(
                """
                    UPDATE hr_attendance_locations
                    SET name = ?,
                        latitude = ?,
                        longitude = ?,
                        radius_meters = ?,
                        status = ?
                    WHERE id = ? AND company_id = ?
                    """,
                name,
                latitude,
                longitude,
                radiusMeters,
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
            item.put("name", template.templateName());
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

            closeOverlappingAssignments(companyId, employeeId, effectiveStartDate, effectiveEndDate);
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
            assignment.put("template_name", template.templateName());
            assignment.put("effective_start_date", effectiveStartDate.toString());
            assignment.put("effective_end_date", effectiveEndDate == null ? null : effectiveEndDate.toString());
            assignments.add(assignment);
        }

        return Map.of(
            "assigned_count", assignments.size(),
            "template_id", templateId,
            "template_name", template.templateName(),
            "assignments", assignments
        );
    }

    public Map<String, Object> createPhotoUpload(long companyId, Map<String, Object> payload) {
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
        var attendanceDate = eventTimestamp != null ? eventTimestamp.toLocalDate() : LocalDate.now();
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
        var employee = resolveSessionAttendanceEmployee(companyId, userId);
        var normalizedPayload = new LinkedHashMap<String, Object>(payload);
        normalizedPayload.put("employee_id", employee.id());
        return createPhotoUpload(companyId, normalizedPayload);
    }

    public Map<String, Object> recordKioskEvent(long companyId, long userId, Map<String, Object> payload) {
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
            var resolvedLocationId = requestedLocationId == null && kioskDevice != null ? kioskDevice.locationId() : requestedLocationId;
            location = resolveKioskLocation(companyId, resolvedLocationId, latitude, longitude);
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
        var scheduleRule = loadScheduleRule(companyId, employeeId, eventTimestamp.toLocalDate());
        validateScheduleRegistrationPolicy(scheduleRule, eventType, eventTimestamp, location);
        validateOperationalEventTransition(companyId, employeeId, eventTimestamp, eventKind);

        var operationalResultStatus = "manual_override".equals(authMethod) ? "overridden" : "success";
        var operationalEventId = appendAttendanceEvent(
            companyId,
            employeeId,
            eventType,
            eventTimestamp,
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

        var dailyRecord = rebuildDailyRecordProjection(companyId, employeeId, eventTimestamp.toLocalDate());
        var result = new LinkedHashMap<String, Object>();
        result.put("event_id", operationalEventId);
        result.put("auth_attempt_event_id", authAttemptId);
        result.put("employee_id", employeeId);
        result.put("event_kind", eventKind);
        result.put("auth_method", authMethod);
        result.put("result_status", operationalResultStatus);
        result.put("status", resolveEffectiveStatus(dailyRecord, scheduleRule));
        result.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
        result.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
        result.put("location", toLocationMap(location));
        result.put("photo_object_key", photoObjectKey);
        return result;
    }

    @Transactional
    public Map<String, Object> recordSelfKioskEvent(long companyId, long userId, Map<String, Object> payload) {
        var employee = resolveSessionAttendanceEmployee(companyId, userId);
        var normalizedPayload = new LinkedHashMap<String, Object>(payload);
        normalizedPayload.put("employee_id", employee.id());
        return recordKioskEvent(companyId, userId, normalizedPayload);
    }

    public Map<String, Object> updateDailyRecord(long companyId, long userId, long employeeId, LocalDate date, Map<String, Object> payload) {
        loadAttendanceEmployee(companyId, employeeId);
        var targetStatusRaw = stringValue(payload, "status", "corrected_status");
        var correctedStatus = targetStatusRaw.isBlank() ? null : normalizeAttendanceStatus(targetStatusRaw);
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
        var scheduleRule = loadScheduleRule(companyId, employeeId, date);

        var body = new LinkedHashMap<String, Object>();
        body.put("employee_id", employeeId);
        body.put("date", date.toString());
        body.put("system_status", refreshed != null ? refreshed.systemStatus() : inferSystemStatus(scheduleRule));
        body.put("corrected_status", refreshed != null ? refreshed.correctedStatus() : null);
        body.put("effective_status", resolveEffectiveStatus(refreshed, scheduleRule));
        body.put("notes", refreshed != null ? refreshed.notes() : null);
        return body;
    }

    @Transactional
    public Map<String, Object> updateSelfDailyRecord(long companyId, long userId, LocalDate date, Map<String, Object> payload) {
        var employee = resolveSessionAttendanceEmployee(companyId, userId);
        return updateDailyRecord(companyId, userId, employee.id(), date, payload);
    }

    public void ensureDefaultScheduleAssignment(long companyId, long employeeId, long createdBy) {
        var existingCount = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_employee_schedule_assignments
                WHERE company_id = ?
                  AND employee_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                """,
            Integer.class,
            companyId,
            employeeId
        );
        if (existingCount != null && existingCount > 0) {
            return;
        }

        var templateIds = jdbcTemplate.query(
            """
                SELECT id
                FROM hr_schedule_templates
                WHERE company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                ORDER BY CASE WHEN name = 'Spring Default Schedule' THEN 0 ELSE 1 END, id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId
        );
        if (templateIds.isEmpty()) {
            return;
        }

        var startDates = jdbcTemplate.query(
            """
                SELECT COALESCE(hire_date, CURRENT_DATE()) AS hire_date
                FROM hr_employees
                WHERE id = ? AND company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getObject("hire_date", LocalDate.class),
            employeeId,
            companyId
        );
        var effectiveStartDate = startDates.isEmpty() || startDates.getFirst() == null
            ? LocalDate.now()
            : startDates.getFirst();

        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_schedule_assignments
                (company_id, employee_id, template_id, effective_start_date, status, created_by)
                VALUES (?, ?, ?, ?, 'active', ?)
                """,
            companyId,
            employeeId,
            templateIds.getFirst(),
            effectiveStartDate,
            createdBy
        );
    }

    private AttendanceEmployee loadAttendanceEmployee(long companyId, long employeeId) {
        var employees = jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
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
        ensureDefaultScheduleAssignment(companyId, employeeId, userId);
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
        var normalizedPrefix = prefix == null || prefix.isBlank() ? "EMP" : prefix.trim().toUpperCase(Locale.ROOT);
        var effectivePadding = Math.max(padding, 4);
        var digits = String.format(Locale.ROOT, "%0" + effectivePadding + "d", nextNumber);
        return normalizedPrefix + "-" + digits;
    }

    private List<AttendanceEmployee> listAttendanceEmployees(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
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
            safe(rs.getString("status")),
            getNullableLong(rs, "unit_id"),
            safe(rs.getString("unit_name")),
            getNullableLong(rs, "business_id"),
            safe(rs.getString("business_name"))
        );
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
                SELECT template_id, COUNT(*) AS total_count
                FROM hr_employee_schedule_assignments
                WHERE company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                GROUP BY template_id
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
        body.put("name", template.templateName());
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
            resolveEffectiveStatus(refreshed, scheduleRule),
            refreshed != null ? refreshed.firstCheckInAt() : null,
            refreshed != null ? refreshed.lastCheckOutAt() : null
        );
    }

    private List<LocationRow> listLocations(long companyId) {
        return loadLocationRows(companyId, true);
    }

    private List<LocationRow> loadLocationRows(long companyId, boolean activeOnly) {
        return jdbcTemplate.query(
            activeOnly
                ? """
                    SELECT id, name, latitude, longitude, radius_meters, COALESCE(LOWER(status), 'active') AS status
                    FROM hr_attendance_locations
                    WHERE company_id = ?
                      AND LOWER(COALESCE(status, 'active')) = 'active'
                    ORDER BY name ASC
                    """
                : """
                    SELECT id, name, latitude, longitude, radius_meters, COALESCE(LOWER(status), 'active') AS status
                    FROM hr_attendance_locations
                    WHERE company_id = ?
                    ORDER BY CASE LOWER(COALESCE(status, 'active')) WHEN 'active' THEN 0 ELSE 1 END, name ASC
                    """,
            (rs, rowNum) -> new LocationRow(
                rs.getLong("id"),
                safe(rs.getString("name")),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
                rs.getInt("radius_meters"),
                safe(rs.getString("status"))
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
                SELECT id, name, latitude, longitude, radius_meters, COALESCE(LOWER(status), 'active') AS status
                FROM hr_attendance_locations
                WHERE company_id = ? AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new LocationRow(
                rs.getLong("id"),
                safe(rs.getString("name")),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
                rs.getInt("radius_meters"),
                safe(rs.getString("status"))
            ),
            companyId,
            locationId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attendance location not found.");
        }
        return rows.getFirst();
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

    private String calculateSystemStatus(ScheduleRule scheduleRule, LocalDateTime firstCheckIn) {
        if (firstCheckIn == null) {
            return inferSystemStatus(scheduleRule);
        }
        if (scheduleRule == null || scheduleRule.isRestDay() || scheduleRule.startTime() == null) {
            return "on_time";
        }

        var scheduledStart = firstCheckIn.toLocalDate().atTime(scheduleRule.startTime());
        var allowedStart = scheduledStart.plusMinutes(scheduleRule.lateAfterMinutes());
        return firstCheckIn.isAfter(allowedStart) ? "late" : "on_time";
    }

    private int calculateMinutesLate(ScheduleRule scheduleRule, LocalDateTime firstCheckIn) {
        if (scheduleRule == null || scheduleRule.startTime() == null || firstCheckIn == null || scheduleRule.isRestDay()) {
            return 0;
        }
        var scheduledStart = firstCheckIn.toLocalDate().atTime(scheduleRule.startTime());
        if (!firstCheckIn.isAfter(scheduledStart)) {
            return 0;
        }
        return (int) Duration.between(scheduledStart, firstCheckIn).toMinutes();
    }

    private String inferSystemStatus(ScheduleRule scheduleRule) {
        if (scheduleRule != null && scheduleRule.isRestDay()) {
            return "rest";
        }
        return "absence";
    }

    private String resolveEffectiveStatus(DailyRecordRow dailyRecord, ScheduleRule scheduleRule) {
        if (dailyRecord != null && !HrPayloadUtils.isBlank(dailyRecord.correctedStatus())) {
            return dailyRecord.correctedStatus();
        }
        if (dailyRecord != null && !HrPayloadUtils.isBlank(dailyRecord.systemStatus())) {
            return dailyRecord.systemStatus();
        }
        return inferSystemStatus(scheduleRule);
    }

    private LocationRow mapLocation(ResultSet rs, String prefix) throws SQLException {
        var id = getNullableLong(rs, prefix + "_id");
        if (id == null) {
            return null;
        }
        return new LocationRow(
            id,
            safe(rs.getString(prefix + "_name")),
            rs.getBigDecimal(prefix + "_latitude"),
            rs.getBigDecimal(prefix + "_longitude"),
            rs.getInt(prefix + "_radius_meters"),
            "active"
        );
    }

    private Map<String, Object> toLocationMap(LocationRow location) {
        if (location == null) {
            return null;
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("id", location.id());
        body.put("name", location.name());
        body.put("latitude", location.latitude());
        body.put("longitude", location.longitude());
        body.put("radius_meters", location.radiusMeters());
        body.put("status", location.status());
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
            case "badge" -> {
                var matches = candidateMethods.stream()
                    .filter((method) -> Objects.equals(nullable(method.credentialRef()), nullable(credentialPayload)))
                    .toList();
                if (matches.size() > 1) {
                    throw new IllegalArgumentException("Badge credential is assigned to more than one employee.");
                }
                yield matches.isEmpty() ? null : matches.getFirst();
            }
            case "pin" -> {
                var matches = candidateMethods.stream()
                    .filter((method) -> method.secretHash() != null && !method.secretHash().isBlank())
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

    private void ensureManualOverrideMethod(long companyId, long accessProfileId) {
        var existing = loadAccessMethods(companyId, accessProfileId).stream()
            .anyMatch((method) -> "manual_override".equals(method.methodType()));
        if (existing) {
            return;
        }

        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_access_methods
                (company_id, access_profile_id, method_type, credential_ref, secret_hash, status, priority, metadata_json)
                VALUES (?, ?, 'manual_override', NULL, NULL, 'active', 100, CAST(? AS JSON))
                """,
            companyId,
            accessProfileId,
            "{\"label\":\"Manual override\"}"
        );
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
        body.put("metadata", parseJsonMap(device.metadataJson()));
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
        body.put("credential_ref", method.credentialRef());
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

    private void validateOperationalEventTransition(long companyId, long employeeId, LocalDateTime eventTimestamp, String eventKind) {
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventKind)) {
            return;
        }

        var dayEvents = loadAttendanceEventRows(companyId, employeeId, eventTimestamp.toLocalDate());
        var priorEvents = dayEvents.stream()
            .filter((event) -> !event.eventTimestamp().isAfter(eventTimestamp))
            .toList();
        var state = resolveOperationalState(priorEvents);
        var checkInAlreadyRecorded = dayEvents.stream()
            .anyMatch((event) -> "check_in".equals(event.eventKind()) || "check_in".equals(event.eventType()));

        switch (eventKind) {
            case "check_in" -> {
                if (checkInAlreadyRecorded) {
                    throw new IllegalArgumentException("Check-in has already been recorded for this employee today.");
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
            statement.setObject(5, eventTimestamp.toLocalDate());
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

        var systemStatus = calculateSystemStatus(scheduleRule, firstCheckIn);
        var minutesLate = calculateMinutesLate(scheduleRule, firstCheckIn);

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
            throw new IllegalArgumentException("Public kiosk auth_method must be pin or badge.");
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
                if (!endTime.isAfter(startTime)) {
                    throw new IllegalArgumentException("end_time must be after start_time.");
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

    private void validateScheduleRegistrationPolicy(
        ScheduleRule scheduleRule,
        String eventType,
        LocalDateTime eventTimestamp,
        LocationRow location
    ) {
        if (scheduleRule == null || scheduleRule.isRestDay() || !"check_in".equals(eventType)) {
            return;
        }

        if (scheduleRule.enforceLocation() && scheduleRule.locationId() != null) {
            if (location == null || location.id() != scheduleRule.locationId()) {
                throw new IllegalArgumentException("Attendance registration is restricted to the configured location.");
            }
        }

        if (scheduleRule.blockAfterGracePeriod() && scheduleRule.startTime() != null) {
            var scheduledStart = eventTimestamp.toLocalDate().atTime(scheduleRule.startTime());
            var graceDeadline = scheduledStart.plusMinutes(scheduleRule.lateAfterMinutes());
            if (eventTimestamp.isAfter(graceDeadline)) {
                throw new IllegalArgumentException("Attendance registration is blocked after the grace period expires.");
            }
        }
    }

    private boolean parseBoolean(Map<String, Object> payload, String key) {
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

    private void closeOverlappingAssignments(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        var overlapEnd = endDate == null ? LocalDate.of(9999, 12, 31) : endDate;
        var rows = jdbcTemplate.query(
            """
                SELECT id, effective_start_date, effective_end_date
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
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class)
            ),
            companyId,
            employeeId,
            overlapEnd,
            startDate
        );

        for (var row : rows) {
            if (row.effectiveStartDate().isBefore(startDate)) {
                jdbcTemplate.update(
                    """
                        UPDATE hr_employee_schedule_assignments
                        SET effective_end_date = ?
                        WHERE id = ?
                        """,
                    startDate.minusDays(1),
                    row.id()
                );
            } else {
                jdbcTemplate.update(
                    """
                        UPDATE hr_employee_schedule_assignments
                        SET status = 'inactive',
                            effective_end_date = ?
                        WHERE id = ?
                        """,
                    row.effectiveEndDate() != null ? row.effectiveEndDate() : row.effectiveStartDate(),
                    row.id()
                );
            }
        }
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
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Date must use YYYY-MM-DD format.");
        }
    }

    public static YearMonth parseMonth(String value) {
        try {
            return YearMonth.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Month must use YYYY-MM format.");
        }
    }

    private record AttendanceEmployee(
        long id,
        String employeeNumber,
        String fullName,
        String positionTitle,
        String department,
        String status,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName
    ) {
    }

    private record EmailMatchedAttendanceEmployee(
        AttendanceEmployee employee,
        Long linkedUserId
    ) {
    }

    private record AttendanceSessionUser(
        long userId,
        String email,
        String fullName
    ) {
    }

    private record AttendanceNameParts(
        String firstName,
        String lastName
    ) {
    }

    private record AttendanceEmployeeNumberSequence(
        String prefix,
        int padding,
        long nextNumber
    ) {
    }

    private record ScheduleRule(
        long employeeId,
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

    private record ScheduleWindow(
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

    private record CurrentScheduleAssignment(
        long employeeId,
        long templateId,
        String templateName,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
    }

    private record ScheduleTemplateJoinRow(
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

    private record ScheduleTemplateAccumulator(
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

    private record ScheduleTemplateDefinition(
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

    private record ScheduleTemplateDayDefinition(
        int dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        int mealMinutes,
        int restMinutes,
        int lateAfterMinutes,
        boolean isRestDay
    ) {
    }

    private record LocationRow(
        long id,
        String name,
        BigDecimal latitude,
        BigDecimal longitude,
        int radiusMeters,
        String status
    ) {
    }

    private record ExistingAssignmentRow(
        long id,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
    }

    private record KioskDeviceRow(
        long id,
        long companyId,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        Long locationId,
        String locationName,
        String code,
        String name,
        String status,
        String publicAccessToken,
        String metadataJson
    ) {
    }

    private record AccessProfileRow(
        long id,
        long companyId,
        long employeeId,
        String status,
        String defaultMethod,
        LocalDateTime lastEnrolledAt,
        String metadataJson,
        String employeeNumber,
        String employeeName,
        List<AccessMethodRow> methods
    ) {
    }

    private record AccessMethodRow(
        long id,
        long companyId,
        long accessProfileId,
        String methodType,
        String credentialRef,
        String secretHash,
        String status,
        int priority,
        String metadataJson,
        long employeeId,
        String employeeNumber,
        String employeeName
    ) {
    }

    private record ControlActivityRow(
        long id,
        long employeeId,
        String employeeNumber,
        String employeeName,
        Long kioskDeviceId,
        String kioskDeviceName,
        Long locationId,
        String locationName,
        String eventType,
        String eventKind,
        String authMethod,
        String resultStatus,
        LocalDateTime eventTimestamp,
        String notes,
        String metadataJson
    ) {
    }

    private record ScopeBusinessRow(
        long id,
        Long unitId
    ) {
    }

    private record AttendanceEventRow(
        long id,
        String eventType,
        LocalDateTime eventTimestamp,
        LocalDate attendanceDate,
        Long locationId,
        Long kioskDeviceId,
        String authMethod,
        String resultStatus,
        String eventKind,
        String notes,
        String metadataJson,
        Long supersedesEventId
    ) {
    }

    private record AttendanceOperationalState(
        boolean checkedIn,
        boolean onBreak
    ) {
    }

    private record PublicKioskIdentificationToken(
        long employeeId,
        String authMethod,
        long expiresAtEpochSeconds
    ) {
    }

    private record DailyRecordRow(
        long id,
        long employeeId,
        LocalDate attendanceDate,
        String systemStatus,
        String correctedStatus,
        LocalDateTime firstCheckInAt,
        LocalDateTime lastCheckOutAt,
        int minutesLate,
        String notes,
        String firstPhotoObjectKey,
        String lastPhotoObjectKey,
        LocationRow firstLocation,
        LocationRow lastLocation
    ) {
    }

    private record EffectiveDailyRecord(
        String effectiveStatus,
        LocalDateTime firstCheckInAt,
        LocalDateTime lastCheckOutAt
    ) {
    }
}
