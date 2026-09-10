package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.announcements.HrAnnouncementActor;
import com.indice.erp.hr.announcements.HrAnnouncementService;
import com.indice.erp.hr.permissions.HrPermissionCommandService;
import com.indice.erp.hr.permissions.HrPermissionQueryService;
import com.indice.erp.hr.permissions.PermissionActor;
import com.indice.erp.hr.records.HrRecordService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Employee-only projection for the native Human Resources kiosk app.
 *
 * <p>Every source query remains owned by its HR domain. This service resolves the authenticated
 * user inside the company, applies the domain's self-service scope and removes management-only
 * fields before returning data to a shared kiosk device.
 */
@Service
public class HumanResourcesEmployeeKioskService {

    private static final String ANNOUNCEMENTS_READ =
        AttendanceKioskCapabilities.ANNOUNCEMENTS_READ + "@1";
    private static final String RECORDS_READ = AttendanceKioskCapabilities.RECORDS_READ + "@1";
    private static final String PERMISSIONS_READ =
        AttendanceKioskCapabilities.PERMISSIONS_READ + "@1";

    private static final List<String> ANNOUNCEMENT_FIELDS = List.of(
        "id", "title", "type", "published_at", "author_name", "content", "is_read");
    private static final List<String> RECORD_FIELDS = List.of(
        "id", "record_number", "record_type", "severity", "status", "title", "description",
        "actions_taken", "event_date", "created_at", "updated_at");
    private static final List<String> PERMISSION_FIELDS = List.of(
        "id", "folio", "type", "payrollTreatment", "startDate", "endDate", "days", "halfDay",
        "status", "reason", "createdAt", "updatedAt");

    private final JdbcTemplate jdbcTemplate;
    private final HrAnnouncementService announcementService;
    private final HrRecordService recordService;
    private final HrPermissionQueryService permissionQueryService;
    private final HrPermissionCommandService permissionCommandService;

    public HumanResourcesEmployeeKioskService(
            JdbcTemplate jdbcTemplate,
            HrAnnouncementService announcementService,
            HrRecordService recordService,
            HrPermissionQueryService permissionQueryService,
            HrPermissionCommandService permissionCommandService) {
        this.jdbcTemplate = jdbcTemplate;
        this.announcementService = announcementService;
        this.recordService = recordService;
        this.permissionQueryService = permissionQueryService;
        this.permissionCommandService = permissionCommandService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> bootstrap(
            long companyId,
            long userId,
            Set<String> grantedCapabilities) {
        var granted = grantedCapabilities == null ? Set.<String>of() : grantedCapabilities;
        var result = new LinkedHashMap<String, Object>();
        if (granted.stream().noneMatch(Set.of(
                ANNOUNCEMENTS_READ, RECORDS_READ, PERMISSIONS_READ)::contains)) {
            return Map.of();
        }

        final EmployeeActor actor;
        try {
            actor = requireActor(companyId, userId);
        } catch (RuntimeException unavailable) {
            putUnavailableSections(result, granted);
            return Map.copyOf(result);
        }

        if (granted.contains(ANNOUNCEMENTS_READ)) {
            result.put("announcements", resilientSection(() -> announcements(actor)));
        }
        if (granted.contains(RECORDS_READ)) {
            result.put("records", resilientSection(() -> records(actor)));
        }
        if (granted.contains(PERMISSIONS_READ)) {
            result.put("permissions", resilientSection(() -> permissions(actor)));
        }
        return Map.copyOf(result);
    }

    @Transactional
    public Map<String, Object> createPermission(
            long companyId,
            long userId,
            Map<String, Object> payload) {
        var actor = requireActor(companyId, userId);
        var created = permissionCommandService.createOwn(permissionActor(actor), payload);
        var result = new LinkedHashMap<String, Object>();
        result.put("permissionId", created.get("permissionId"));
        result.put("permission", sanitizeMap(asMap(created.get("permission")), PERMISSION_FIELDS));
        return Map.copyOf(result);
    }

    private Map<String, Object> announcements(EmployeeActor actor) {
        var source = announcementService.listAnnouncements(announcementActor(actor));
        var items = sanitizeItems(source.get("items"), ANNOUNCEMENT_FIELDS);
        return availableSection(items, Map.of("total", items.size()));
    }

    private Map<String, Object> records(EmployeeActor actor) {
        var source = recordService.listAssignedRecords(
            authUser(actor), Map.of("page", 1, "size", 50));
        return availableSection(
            sanitizeItems(source.get("rows"), RECORD_FIELDS),
            sanitizeMap(asMap(source.get("summary")), List.of(
                "total_count", "pending_count", "reviewed_count", "resolved_count",
                "high_severity_count")));
    }

    private Map<String, Object> permissions(EmployeeActor actor) {
        var source = permissionQueryService.listOwn(permissionActor(actor), Map.of());
        return availableSection(
            sanitizeItems(source.get("items"), PERMISSION_FIELDS),
            sanitizeMap(asMap(source.get("summary")), List.of(
                "total", "pending", "approved", "rejected")));
    }

    private EmployeeActor requireActor(long companyId, long userId) {
        var rows = jdbcTemplate.query(
            """
                SELECT uc.id AS user_company_id,
                       COALESCE(NULLIF(u.full_name, ''), u.email, CONCAT('User ', u.id)) AS user_name,
                       COALESCE(uc.role, 'user') AS role,
                       wp.unit_id,
                       wp.business_id,
                       COALESCE(wp.department, '') AS department
                FROM user_companies uc
                JOIN users u ON u.id = uc.user_id
                LEFT JOIN user_work_profiles wp
                  ON wp.user_company_id = uc.id
                 AND wp.company_id = uc.company_id
                 AND LOWER(COALESCE(wp.status, 'active')) IN ('active', 'activo')
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                ORDER BY CASE WHEN wp.id IS NULL THEN 1 ELSE 0 END, wp.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new EmployeeActor(
                userId,
                companyId,
                rs.getLong("user_company_id"),
                safe(rs.getString("user_name")),
                safe(rs.getString("role")),
                nullableLong(rs.getObject("unit_id")),
                nullableLong(rs.getObject("business_id")),
                safe(rs.getString("department"))),
            userId,
            companyId);
        if (rows.isEmpty()) {
            throw new SecurityException("Authenticated employee is not active in this company.");
        }
        return rows.getFirst();
    }

    private HrAnnouncementActor announcementActor(EmployeeActor actor) {
        return new HrAnnouncementActor(
            actor.userId(), actor.companyId(), actor.userCompanyId(), actor.userName(), actor.role(),
            actor.unitId(), actor.businessId(), actor.department(), List.of(), false);
    }

    private PermissionActor permissionActor(EmployeeActor actor) {
        return new PermissionActor(
            actor.userId(), actor.companyId(), actor.userCompanyId(), actor.userName(), actor.role(),
            List.of());
    }

    private AuthSessionUser authUser(EmployeeActor actor) {
        return new AuthSessionUser(
            actor.userId(), actor.companyId(), actor.userCompanyId(), actor.userName(), actor.role());
    }

    private Map<String, Object> resilientSection(Supplier<Map<String, Object>> loader) {
        try {
            return loader.get();
        } catch (RuntimeException unavailable) {
            return unavailableSection();
        }
    }

    private Map<String, Object> availableSection(
            List<Map<String, Object>> items,
            Map<String, Object> summary) {
        var section = new LinkedHashMap<String, Object>();
        section.put("available", true);
        section.put("items", items);
        section.put("summary", summary);
        return Map.copyOf(section);
    }

    private Map<String, Object> unavailableSection() {
        return Map.of("available", false, "items", List.of(), "summary", Map.of());
    }

    private void putUnavailableSections(Map<String, Object> result, Set<String> granted) {
        if (granted.contains(ANNOUNCEMENTS_READ)) {
            result.put("announcements", unavailableSection());
        }
        if (granted.contains(RECORDS_READ)) {
            result.put("records", unavailableSection());
        }
        if (granted.contains(PERMISSIONS_READ)) {
            result.put("permissions", unavailableSection());
        }
    }

    private List<Map<String, Object>> sanitizeItems(Object value, List<String> allowedFields) {
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        return items.stream()
            .filter(Map.class::isInstance)
            .map(this::asMap)
            .map(item -> sanitizeMap(item, allowedFields))
            .toList();
    }

    private Map<String, Object> sanitizeMap(Map<String, Object> source, List<String> allowedFields) {
        var result = new LinkedHashMap<String, Object>();
        for (var field : allowedFields) {
            if (source.containsKey(field) && source.get(field) != null) {
                result.put(field, source.get(field));
            }
        }
        return Map.copyOf(result);
    }

    private Map<String, Object> asMap(Object value) {
        if (!(value instanceof Map<?, ?> raw)) {
            return Map.of();
        }
        var result = new LinkedHashMap<String, Object>();
        raw.forEach((key, item) -> result.put(String.valueOf(key), item));
        return result;
    }

    private Long nullableLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private record EmployeeActor(
        long userId,
        long companyId,
        long userCompanyId,
        String userName,
        String role,
        Long unitId,
        Long businessId,
        String department
    ) {
    }
}
