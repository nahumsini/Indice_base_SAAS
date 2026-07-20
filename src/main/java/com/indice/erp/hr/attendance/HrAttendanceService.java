package com.indice.erp.hr.attendance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.attendance.access.AttendanceAccessService;
import com.indice.erp.hr.attendance.application.AttendancePhotoService;
import com.indice.erp.hr.attendance.assignment.AttendanceAssignmentService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceMapper;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceRepository;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskPinThrottleService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.hr.attendance.locations.AttendanceAllowedLocationRepository;
import com.indice.erp.hr.attendance.locations.AttendanceLocationRepository;
import com.indice.erp.hr.attendance.locations.AttendanceWorkSiteAssignmentRepository;
import com.indice.erp.hr.attendance.records.AttendanceDailyRecordRepository;
import com.indice.erp.hr.attendance.schedule.AttendanceScheduleCandidateService;
import com.indice.erp.hr.attendance.usecases.records.HrAttendanceSelfDailyRecordUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.attendance.users.AttendanceUserLookupService;
import com.indice.erp.hr.attendance.util.AttendanceDateParser;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import static com.indice.erp.hr.shared.HrPayloadUtils.longList;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;


@Service
public class HrAttendanceService extends HrAttendanceSelfDailyRecordUseCases {

    private final HrAttendanceScopeAccess hrAttendanceScopeAccess;

    public HrAttendanceService(
        JdbcTemplate jdbcTemplate,
        HrAttendanceScopeAccess hrAttendanceScopeAccess,
        AttendanceAssignmentService attendanceAssignmentService,
        AttendanceKioskTokenService attendanceKioskTokenService,
        AttendanceKioskPinThrottleService attendanceKioskPinThrottleService,
        AttendanceKioskDeviceRepository attendanceKioskDeviceRepository,
        AttendanceKioskDeviceService attendanceKioskDeviceService,
        AttendanceKioskDeviceMapper attendanceKioskDeviceMapper,
        AttendanceLocationRepository attendanceLocationRepository,
        AttendanceAllowedLocationRepository attendanceAllowedLocationRepository,
        AttendanceWorkSiteAssignmentRepository attendanceWorkSiteAssignmentRepository,
        AttendanceAccessService attendanceAccessService,
        AttendanceUserLookupService attendanceUserLookupService,
        AttendanceDailyRecordRepository attendanceDailyRecordRepository,
        AttendanceScheduleCandidateService attendanceScheduleCandidateService,
        AttendancePhotoService attendancePhotoService,
        ObjectMapper objectMapper,
        HrFaceService hrFaceService,
        GoogleMapsCoordinateExtractor googleMapsCoordinateExtractor,
        @Value("${app.hr.attendance.enforce-location-radius:false}") boolean enforceLocationRadius,
        @Value("${app.hr.kiosk.inactivity-timeout-seconds:180}") int kioskInactivityTimeoutSeconds
    ) {
        super(new AttendanceDependencies(
            jdbcTemplate,
            attendanceAssignmentService,
            attendanceKioskTokenService,
            attendanceKioskPinThrottleService,
            attendanceKioskDeviceRepository,
            attendanceKioskDeviceService,
            attendanceKioskDeviceMapper,
            attendanceLocationRepository,
            attendanceAllowedLocationRepository,
            attendanceWorkSiteAssignmentRepository,
            attendanceAccessService,
            attendanceUserLookupService,
            attendanceDailyRecordRepository,
            attendanceScheduleCandidateService,
            attendancePhotoService,
            objectMapper,
            hrFaceService,
            googleMapsCoordinateExtractor,
            enforceLocationRadius,
            kioskInactivityTimeoutSeconds
        ));
        this.hrAttendanceScopeAccess = hrAttendanceScopeAccess;
    }

    public static LocalDate parseDate(String value) {
        return AttendanceDateParser.parseDate(value);
    }

    public static YearMonth parseMonth(String value) {
        return AttendanceDateParser.parseMonth(value);
    }

    public Map<String, Object> listDashboard(AuthSessionUser currentUser, LocalDate date) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        return buildDashboard(
            companyId,
            date,
            attendanceUserLookupService.listAttendanceUsers(companyId, scope),
            listLocations(companyId, scope)
        );
    }

    public Map<String, Object> controlOverview(AuthSessionUser currentUser, LocalDate date) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        var users = attendanceUserLookupService.listAttendanceUsers(companyId, scope);
        var visibleUserIds = users.stream().map((user) -> user.id()).toList();
        return controlOverview(
            companyId,
            date,
            users,
            listLocations(companyId, scope),
            loadAllowedLocationsByUser(companyId, scope),
            loadActiveWorkSiteAssignments(companyId, date, scope),
            attendanceKioskDeviceRepository.list(companyId, scope),
            loadRecentControlActivity(companyId, date, 25, visibleUserIds),
            loadControlPhotoObjectKeysByUser(companyId, date, visibleUserIds)
        );
    }

    public Map<String, Object> listScheduleTemplates(AuthSessionUser currentUser) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        var templates = loadScheduleTemplates(companyId, scope);
        var assignedCountsByTemplate = loadActiveAssignmentCountsByTemplate(companyId, scope);

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

    public Map<String, Object> scheduleCandidates(
        AuthSessionUser currentUser,
        LocalDate startDate,
        LocalDate endDate,
        int page,
        int size,
        String search,
        Long unitId,
        Long businessId,
        boolean availableOnly
    ) {
        return attendanceScheduleCandidateService.scheduleCandidates(
            currentUser.companyId(),
            hrAttendanceScopeAccess.resolve(currentUser),
            startDate,
            endDate,
            page,
            size,
            search,
            unitId,
            businessId,
            availableOnly
        );
    }

    public Map<String, Object> saveScheduleTemplate(AuthSessionUser currentUser, Long templateId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        if (templateId != null && templateId > 0) {
            loadExistingTemplate(companyId, templateId, scope);
        }
        requireManagedLocationPayload(companyId, scope, payload);
        var saved = saveScheduleTemplate(companyId, currentUser.userId(), templateId, payload);
        return Map.of("template", loadScheduleTemplateMap(companyId, templateIdFrom(saved), scope));
    }

    public Map<String, Object> bulkAssignScheduleTemplate(AuthSessionUser currentUser, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        var templateId = parseLong(payload, "template_id");
        if (templateId != null && templateId > 0) {
            loadExistingTemplate(companyId, templateId, scope);
        }
        for (var userCompanyId : longList(payload, "user_company_ids")) {
            if (userCompanyId != null && userCompanyId > 0) {
                hrAttendanceScopeAccess.requireUserInScope(companyId, scope, userCompanyId);
            }
        }
        return bulkAssignScheduleTemplate(companyId, currentUser.userId(), payload);
    }

    public Map<String, Object> userCalendar(AuthSessionUser currentUser, long userCompanyId, YearMonth month) {
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(currentUser.companyId(), scope, userCompanyId);
        return userCalendar(currentUser.companyId(), userCompanyId, month);
    }

    public Map<String, Object> createPhotoUpload(AuthSessionUser currentUser, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(
            currentUser.companyId(),
            scope,
            requireUserCompanyId(payload)
        );
        return createPhotoUpload(currentUser.companyId(), payload);
    }

    public Map<String, Object> recordKioskEvent(AuthSessionUser currentUser, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(companyId, scope, requireUserCompanyId(payload));

        var kioskDeviceId = normalizeOptionalForeignKey(parseLong(payload, "kiosk_device_id"));
        if (kioskDeviceId != null) {
            hrAttendanceScopeAccess.requireKioskDeviceInScope(companyId, scope, kioskDeviceId);
        }

        return recordKioskEvent(companyId, currentUser.userId(), payload);
    }

    public Map<String, Object> updateDailyRecord(
        AuthSessionUser currentUser,
        long userCompanyId,
        LocalDate date,
        Map<String, Object> payload
    ) {
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(currentUser.companyId(), scope, userCompanyId);
        return updateDailyRecord(currentUser.companyId(), currentUser.userId(), userCompanyId, date, payload);
    }

    public Map<String, Object> bulkUpdateDailyRecords(
        AuthSessionUser currentUser,
        long userCompanyId,
        Map<String, Object> payload
    ) {
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(currentUser.companyId(), scope, userCompanyId);
        return bulkUpdateDailyRecords(currentUser.companyId(), currentUser.userId(), userCompanyId, payload);
    }

    public Map<String, Object> bulkAssignRestDays(
        AuthSessionUser currentUser,
        Map<String, Object> payload
    ) {
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        for (var userCompanyId : extractRestPlanUserCompanyIds(payload)) {
            hrAttendanceScopeAccess.requireUserInScope(currentUser.companyId(), scope, userCompanyId);
        }
        return bulkAssignRestDays(currentUser.companyId(), currentUser.userId(), payload);
    }

    public Map<String, Object> recordManualAttendanceEvent(
        AuthSessionUser currentUser,
        long userCompanyId,
        LocalDate attendanceDate,
        Map<String, Object> payload
    ) {
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(currentUser.companyId(), scope, userCompanyId);
        return recordManualAttendanceEvent(currentUser.companyId(), currentUser.userId(), userCompanyId, attendanceDate, payload);
    }

    public Map<String, Object> listControlLocations(AuthSessionUser currentUser) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        var body = new LinkedHashMap<String, Object>();
        body.put("items", loadLocationRows(companyId, false, scope).stream().map(com.indice.erp.hr.attendance.support.AttendanceLocationPresentation::toLocationMap).toList());
        return body;
    }

    public Map<String, Object> saveLocation(AuthSessionUser currentUser, Long locationId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        if (locationId != null && locationId > 0) {
            hrAttendanceScopeAccess.requireLocationInScope(companyId, scope, locationId);
        }
        requireManagedLocationPayload(companyId, scope, payload);
        return saveLocation(companyId, currentUser.userId(), locationId, payload);
    }

    public void deleteLocation(AuthSessionUser currentUser, long locationId) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireLocationInScope(companyId, scope, locationId);
        deleteLocation(companyId, locationId);
    }

    public Map<String, Object> replaceHrUserAllowedLocations(
        AuthSessionUser currentUser,
        long userCompanyId,
        Map<String, Object> payload
    ) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(companyId, scope, userCompanyId);
        for (var locationId : longList(payload, "location_ids", "allowed_location_ids")) {
            if (locationId != null && locationId > 0) {
                hrAttendanceScopeAccess.requireLocationInScope(companyId, scope, locationId);
            }
        }
        return replaceHrUserAllowedLocations(companyId, currentUser.userId(), userCompanyId, payload);
    }

    public Map<String, Object> bulkAssignActiveWorkSite(AuthSessionUser currentUser, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        var locationId = normalizeOptionalForeignKey(parseLong(payload, "location_id", "work_site_location_id"));
        if (locationId != null) {
            hrAttendanceScopeAccess.requireLocationInScope(companyId, scope, locationId);
        }
        var templateId = normalizeOptionalForeignKey(parseLong(payload, "template_id", "schedule_template_id"));
        if (templateId != null) {
            loadExistingTemplate(companyId, templateId, scope);
        }
        for (var userCompanyId : resolveTargetUserCompanyIds(payload)) {
            hrAttendanceScopeAccess.requireUserInScope(companyId, scope, userCompanyId);
        }
        return bulkAssignActiveWorkSite(companyId, currentUser.userId(), payload);
    }

    public Map<String, Object> clearHrUserWorkAssignments(AuthSessionUser currentUser, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(
            currentUser.companyId(),
            scope,
            requireUserCompanyId(payload)
        );
        return clearHrUserWorkAssignments(currentUser.companyId(), currentUser.userId(), payload);
    }

    public Map<String, Object> listKioskDevices(AuthSessionUser currentUser) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        return attendanceKioskDeviceService.listDevices(companyId, scope);
    }

    public Map<String, Object> saveKioskDevice(AuthSessionUser currentUser, Long kioskDeviceId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        if (kioskDeviceId != null && kioskDeviceId > 0) {
            hrAttendanceScopeAccess.requireKioskDeviceInScope(companyId, scope, kioskDeviceId);
        }
        requireManagedKioskPayload(companyId, scope, payload);
        return saveKioskDevice(companyId, currentUser.userId(), kioskDeviceId, payload);
    }

    public void deleteKioskDevice(AuthSessionUser currentUser, long kioskDeviceId) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireKioskDeviceInScope(companyId, scope, kioskDeviceId);
        deleteKioskDevice(companyId, currentUser.userId(), kioskDeviceId);
    }

    public Map<String, Object> rotateKioskPublicAccessToken(AuthSessionUser currentUser, long kioskDeviceId) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireKioskDeviceInScope(companyId, scope, kioskDeviceId);
        return rotateKioskPublicAccessToken(companyId, currentUser.userId(), kioskDeviceId);
    }

    public Map<String, Object> transitionKioskDevice(
            AuthSessionUser currentUser,
            long kioskDeviceId,
            KioskDefinitionStatus status,
            String reason) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireKioskDeviceInScope(companyId, scope, kioskDeviceId);
        return transitionKioskDevice(
            companyId, currentUser.userId(), kioskDeviceId, status, reason);
    }

    public Map<String, Object> listAccessProfiles(AuthSessionUser currentUser) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        var visibleUserIds = visibleUserCompanyIds(companyId, scope);
        var items = extractItems(attendanceAccessService.listAccessProfiles(companyId)).stream()
            .filter((item) -> isVisibleUser(item.get("user_company_id"), scope, visibleUserIds))
            .toList();
        return Map.of("items", items);
    }

    public Map<String, Object> saveAccessProfile(AuthSessionUser currentUser, Long profileId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        if (profileId != null && profileId > 0) {
            hrAttendanceScopeAccess.requireUserInScope(companyId, scope, attendanceAccessService.loadAccessProfileUserCompanyId(companyId, profileId));
        }
        hrAttendanceScopeAccess.requireUserInScope(companyId, scope, requireUserCompanyId(payload));
        return saveAccessProfile(companyId, currentUser.userId(), profileId, payload);
    }

    public Map<String, Object> listAccessMethods(AuthSessionUser currentUser) {
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        var visibleUserIds = visibleUserCompanyIds(companyId, scope);
        var items = extractItems(attendanceAccessService.listAccessMethods(companyId)).stream()
            .filter((item) -> isVisibleUser(item.get("user_company_id"), scope, visibleUserIds))
            .toList();
        return Map.of("items", items);
    }

    public Map<String, Object> saveAccessMethod(AuthSessionUser currentUser, Long methodId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        if (methodId != null && methodId > 0) {
            hrAttendanceScopeAccess.requireUserInScope(companyId, scope, attendanceAccessService.loadAccessMethodUserCompanyId(companyId, methodId));
        }

        var accessProfileId = parseLong(payload, "access_profile_id");
        if (accessProfileId == null || accessProfileId <= 0) {
            throw new IllegalArgumentException("access_profile_id is required.");
        }
        hrAttendanceScopeAccess.requireUserInScope(companyId, scope, attendanceAccessService.loadAccessProfileUserCompanyId(companyId, accessProfileId));
        return saveAccessMethod(companyId, methodId, payload);
    }

    public Map<String, Object> createFaceVerificationSession(AuthSessionUser currentUser, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var companyId = currentUser.companyId();
        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireUserInScope(companyId, scope, requireUserCompanyId(payload));
        return hrFaceService.createVerificationSession(companyId, currentUser.userId(), payload);
    }

    public Map<String, Object> createFaceVerificationCaptureUpload(
        AuthSessionUser currentUser,
        long sessionId,
        Map<String, Object> payload,
        boolean managementAccess
    ) {
        verifyManagementOrSelfFaceSession(currentUser, sessionId, managementAccess);
        return hrFaceService.createVerificationCaptureUpload(currentUser.companyId(), sessionId, payload);
    }

    public Map<String, Object> completeFaceVerificationSession(
        AuthSessionUser currentUser,
        long sessionId,
        boolean managementAccess
    ) {
        verifyManagementOrSelfFaceSession(currentUser, sessionId, managementAccess);
        return hrFaceService.completeVerificationSession(currentUser.companyId(), currentUser.userId(), sessionId);
    }

    public void markPermissionLeaveDays(
        long companyId,
        long actorUserId,
        long permissionRequestId,
        long userCompanyId,
        LocalDate startDate,
        LocalDate endDate,
        String payrollTreatment
    ) {
        attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        var normalizedPayrollTreatment = normalizeLeavePayrollTreatment(payrollTreatment);
        for (var date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            rebuildDailyRecordProjection(companyId, userCompanyId, date);
            jdbcTemplate.update(
                """
                    UPDATE user_attendance_daily_records
                    SET corrected_status = 'leave',
                        leave_payroll_treatment = ?,
                        permission_request_id = ?,
                        corrected_by = ?,
                        corrected_at = CURRENT_TIMESTAMP,
                        notes = NULL
                    WHERE company_id = ?
                      AND user_company_id = ?
                      AND attendance_date = ?
                    """,
                normalizedPayrollTreatment,
                permissionRequestId,
                actorUserId,
                companyId,
                userCompanyId,
                date
            );
        }
    }

    private String normalizeLeavePayrollTreatment(String payrollTreatment) {
        var normalized = payrollTreatment == null ? "" : payrollTreatment.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "unpaid", "unpaid_leave", "no_pagado", "sin_goce" -> "unpaid";
            default -> "paid";
        };
    }

    private void requireManagedLocationPayload(long companyId, HrOperationalScope scope, Map<String, Object> payload) {
        var locationId = normalizeOptionalForeignKey(parseLong(payload, "location_id", "allowed_location_id", "ubicacion_id"));
        if (locationId != null) {
            hrAttendanceScopeAccess.requireLocationInScope(companyId, scope, locationId);
        }

        var unitId = normalizeOptionalForeignKey(parseLong(payload, "unit_id", "unitId"));
        var businessId = normalizeOptionalForeignKey(parseLong(payload, "business_id", "businessId"));
        if (hrAttendanceScopeAccess.isCorporateOffice(scope)) {
            return;
        }
        if (unitId == null && businessId == null) {
            throw new HrAccessDeniedException("Forbidden");
        }
        hrAttendanceScopeAccess.requireAssignmentInScope(companyId, scope, unitId, businessId);
    }

    private void requireManagedKioskPayload(long companyId, HrOperationalScope scope, Map<String, Object> payload) {
        var locationId = normalizeOptionalForeignKey(parseLong(payload, "location_id"));
        if (locationId != null) {
            hrAttendanceScopeAccess.requireLocationInScope(companyId, scope, locationId);
            return;
        }

        var unitId = normalizeOptionalForeignKey(parseLong(payload, "unit_id"));
        var businessId = normalizeOptionalForeignKey(parseLong(payload, "business_id"));
        if (hrAttendanceScopeAccess.isCorporateOffice(scope)) {
            return;
        }
        if (unitId == null && businessId == null) {
            throw new HrAccessDeniedException("Forbidden");
        }
        hrAttendanceScopeAccess.requireAssignmentInScope(companyId, scope, unitId, businessId);
    }

    private long requireUserCompanyId(Map<String, Object> payload) {
        var userCompanyId = parseLong(payload, "user_company_id");
        if (userCompanyId == null || userCompanyId <= 0) {
            throw new IllegalArgumentException("user_company_id is required.");
        }
        return userCompanyId;
    }

    private java.util.List<Long> resolveTargetUserCompanyIds(Map<String, Object> payload) {
        var userCompanyIds = longList(payload, "user_company_ids");
        if (!userCompanyIds.isEmpty()) {
            return userCompanyIds.stream()
                .filter((userCompanyId) -> userCompanyId != null && userCompanyId > 0)
                .distinct()
                .toList();
        }

        var userCompanyId = parseLong(payload, "user_company_id");
        if (userCompanyId == null || userCompanyId <= 0) {
            return java.util.List.of();
        }
        return java.util.List.of(userCompanyId);
    }

    private long templateIdFrom(Map<String, Object> response) {
        if (!(response.get("template") instanceof Map<?, ?> template)) {
            throw new IllegalStateException("Template response is missing template data.");
        }
        var rawId = template.get("id");
        if (rawId instanceof Number number) {
            return number.longValue();
        }
        throw new IllegalStateException("Template response is missing template id.");
    }

    private java.util.List<Map<String, Object>> extractItems(Map<String, Object> body) {
        if (!(body.get("items") instanceof java.util.List<?> items)) {
            return java.util.List.of();
        }
        return items.stream()
            .filter(Map.class::isInstance)
            .map((item) -> (Map<String, Object>) item)
            .toList();
    }

    private java.util.List<Long> extractRestPlanUserCompanyIds(Map<String, Object> payload) {
        if (!(payload.get("assignments") instanceof java.util.List<?> assignments) || assignments.isEmpty()) {
            throw new IllegalArgumentException("At least one rest assignment is required.");
        }
        if (assignments.size() > 100) {
            throw new IllegalArgumentException("Rest plan is limited to 100 collaborator assignments.");
        }

        var userCompanyIds = new ArrayList<Long>();
        for (var rawAssignment : assignments) {
            if (!(rawAssignment instanceof Map<?, ?> assignment)) {
                throw new IllegalArgumentException("Rest assignments must be valid objects.");
            }
            var assignmentPayload = new LinkedHashMap<String, Object>();
            assignment.forEach((key, value) -> {
                if (key instanceof String stringKey) {
                    assignmentPayload.put(stringKey, value);
                }
            });
            var userCompanyId = parseLong(assignmentPayload, "user_company_id");
            if (userCompanyId <= 0) {
                throw new IllegalArgumentException("Rest assignment user_company_id is required.");
            }
            if (!userCompanyIds.contains(userCompanyId)) {
                userCompanyIds.add(userCompanyId);
            }
        }
        return userCompanyIds;
    }

    private boolean isVisibleUser(Object rawUserCompanyId, HrOperationalScope scope, Set<Long> visibleUserIds) {
        if (hrAttendanceScopeAccess.isCorporateOffice(scope)) {
            return true;
        }
        if (!(rawUserCompanyId instanceof Number number)) {
            return false;
        }
        return visibleUserIds.contains(number.longValue());
    }

    private Set<Long> visibleUserCompanyIds(long companyId, HrOperationalScope scope) {
        return attendanceUserLookupService.listAttendanceUsers(companyId, scope).stream()
            .map((user) -> user.id())
            .collect(java.util.stream.Collectors.toSet());
    }

    private void verifyManagementOrSelfFaceSession(AuthSessionUser currentUser, long sessionId, boolean managementAccess) {
        var companyId = currentUser.companyId();
        if (attendanceUserOwnsFaceVerificationSession(companyId, currentUser.userId(), sessionId)) {
            return;
        }

        if (!managementAccess) {
            throw new HrAccessDeniedException("Forbidden");
        }

        var scope = hrAttendanceScopeAccess.resolve(currentUser);
        hrAttendanceScopeAccess.requireFaceVerificationSessionInScope(companyId, scope, sessionId);
    }

    private boolean attendanceUserOwnsFaceVerificationSession(long companyId, long userId, long sessionId) {
        Long selfUserCompanyId;
        try {
            selfUserCompanyId = resolveSelfUserCompanyId(companyId, userId);
        } catch (NoSuchElementException ex) {
            return false;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_face_verification_sessions
                WHERE company_id = ?
                  AND id = ?
                  AND user_company_id = ?
                """,
            Integer.class,
            companyId,
            sessionId,
            selfUserCompanyId
        );
        return count != null && count > 0;
    }
}
