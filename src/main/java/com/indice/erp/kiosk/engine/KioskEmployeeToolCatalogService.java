package com.indice.erp.kiosk.engine;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskCapabilities;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskCapabilities;
import com.indice.erp.sales.kiosk.RouteSalesKioskCapabilities;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Collection;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Code-owned catalog of native employee tools exposed by a Multi-kiosk.
 *
 * <p>The public product contract is the stable {@code toolKey}. Internal definitions are created
 * lazily only as compatibility subjects for the existing Engine session, capability, audit and
 * idempotency tables. They are never catalog authority and never own a recoverable public token.
 */
@Service
public class KioskEmployeeToolCatalogService {

    public static final String RESERVED_CODE_PREFIX = "INDICE-EMPLOYEE-TOOL-";
    public static final String ATTENDANCE_TOOL_KEY = "employee.attendance@1";
    public static final String ATTENDANCE_DISPLAY_NAME = "Recursos Humanos";
    public static final String MY_TASKS_TOOL_KEY = "employee.my-tasks@1";
    public static final String ROUTE_SALES_TOOL_KEY = "employee.route-sales@1";
    public static final String ATTENDANCE_KIOSK_TYPE = "employee_attendance";
    public static final String MY_TASKS_KIOSK_TYPE = "employee_tasks";
    public static final String ROUTE_SALES_KIOSK_TYPE = "employee_route_sales";
    public static final String ATTENDANCE_RESERVED_CODE =
        RESERVED_CODE_PREFIX + "ATTENDANCE-V1";
    public static final String MY_TASKS_RESERVED_CODE =
        RESERVED_CODE_PREFIX + "MY-TASKS-V1";
    public static final String ROUTE_SALES_RESERVED_CODE =
        RESERVED_CODE_PREFIX + "ROUTE-SALES-V1";

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final List<EmployeeToolManifest> MANIFESTS = List.of(
        new EmployeeToolManifest(
            ATTENDANCE_TOOL_KEY,
            AttendanceKioskCapabilities.OWNER_MODULE,
            "human_resources",
            ATTENDANCE_KIOSK_TYPE,
            ATTENDANCE_RESERVED_CODE,
            ATTENDANCE_DISPLAY_NAME,
            "Registra asistencia y consulta comunicados, actas y permisos.",
            "ATTENDANCE",
            "attendance",
            Set.of(
                "human_resources.attendance",
                "human_resources.control",
                "human_resources.announcements",
                "human_resources.records",
                "human_resources.permissions"),
            Set.of(
                AttendanceKioskCapabilities.PHOTO_PRESIGN + "@1",
                AttendanceKioskCapabilities.PUNCH_CREATE + "@1",
                AttendanceKioskCapabilities.ANNOUNCEMENTS_READ + "@1",
                AttendanceKioskCapabilities.RECORDS_READ + "@1",
                AttendanceKioskCapabilities.PERMISSIONS_READ + "@1",
                AttendanceKioskCapabilities.PERMISSION_CREATE + "@1")
        ),
        new EmployeeToolManifest(
            MY_TASKS_TOOL_KEY,
            ProcessTaskKioskCapabilities.OWNER_MODULE,
            "processes",
            MY_TASKS_KIOSK_TYPE,
            MY_TASKS_RESERVED_CODE,
            "Mis tareas",
            "Consulta, registra y completa únicamente tareas propias del colaborador.",
            "MY_TASKS",
            "process-tasks",
            Set.of("processes.calendar"),
            Set.of(
                ProcessTaskKioskCapabilities.TASKS_READ + "@1",
                ProcessTaskKioskCapabilities.TASK_CREATE + "@1",
                ProcessTaskKioskCapabilities.TASK_COMPLETE + "@1")
        ),
        new EmployeeToolManifest(
            ROUTE_SALES_TOOL_KEY,
            RouteSalesKioskCapabilities.OWNER_MODULE,
            "crm",
            ROUTE_SALES_KIOSK_TYPE,
            ROUTE_SALES_RESERVED_CODE,
            "Venta en ruta",
            "Registra clientes, cobra y termina ventas propias desde el celular.",
            "ROUTE_SALES",
            "sales",
            Set.of("crm.sales"),
            Set.of(
                RouteSalesKioskCapabilities.WORKSPACE_READ + "@1",
                RouteSalesKioskCapabilities.CONTACT_CREATE + "@1",
                RouteSalesKioskCapabilities.SALE_CREATE + "@1",
                RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_PRESIGN + "@1",
                RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_REGISTER + "@1")
        )
    );
    private static final Map<String, EmployeeToolManifest> BY_KEY = manifestsByKey();

    private final JdbcTemplate jdbcTemplate;
    private final ModuleAccessService moduleAccess;
    private final KioskEngineFeatureFlags featureFlags;

    public KioskEmployeeToolCatalogService(
            JdbcTemplate jdbcTemplate,
            ModuleAccessService moduleAccess,
            KioskEngineFeatureFlags featureFlags) {
        this.jdbcTemplate = jdbcTemplate;
        this.moduleAccess = moduleAccess;
        this.featureFlags = featureFlags;
    }

    /** Catalog authority: code manifest intersected only with active company entitlement. */
    public List<Map<String, Object>> availableTools(long companyId) {
        return MANIFESTS.stream()
            .filter(tool -> moduleAccess.companyCanAccess(companyId, tool.moduleSlug()))
            .filter(tool -> featureFlags.adapterEnabled(tool.ownerModule()))
            .map(this::catalogRow)
            .toList();
    }

    public List<String> normalizeToolKeys(Object rawValue) {
        if (rawValue == null) {
            return List.of();
        }
        if (!(rawValue instanceof Collection<?> values)) {
            throw new IllegalArgumentException("tool_keys must be a list.");
        }
        var result = new LinkedHashSet<String>();
        for (var value : values) {
            var key = value == null ? "" : String.valueOf(value).trim().toLowerCase(Locale.ROOT);
            if (key.isBlank() || !BY_KEY.containsKey(key)) {
                throw new IllegalArgumentException("tool_keys contains an unsupported tool.");
            }
            result.add(key);
        }
        if (result.size() > 24) {
            throw new IllegalArgumentException("tool_keys contains too many items.");
        }
        return List.copyOf(result);
    }

    public void requireAvailable(long companyId, List<String> toolKeys) {
        for (var key : toolKeys == null ? List.<String>of() : toolKeys) {
            var tool = require(key);
            if (!moduleAccess.companyCanAccess(companyId, tool.moduleSlug())
                    || !featureFlags.adapterEnabled(tool.ownerModule())) {
                throw new IllegalArgumentException("One or more employee tools are unavailable.");
            }
        }
    }

    /**
     * Provisions compatibility definitions for selected tools. The surrounding Multi-kiosk use
     * case owns the transaction; this method also remains transactional when invoked directly.
     */
    @Transactional
    public List<Long> provisionDefinitions(
            long companyId,
            long actorUserId,
            List<String> toolKeys) {
        if (companyId <= 0 || actorUserId <= 0) {
            throw new IllegalArgumentException("Company and actor are required.");
        }
        requireAvailable(companyId, toolKeys);
        var ids = new java.util.ArrayList<Long>();
        for (var key : toolKeys) {
            ids.add(ensureDefinition(companyId, actorUserId, require(key)).id());
        }
        return List.copyOf(ids);
    }

    public Optional<EmployeeToolManifest> manifestFor(KioskResolvedDefinition definition) {
        if (definition == null || definition.legacyReferenceId() != null) {
            return Optional.empty();
        }
        return MANIFESTS.stream()
            .filter(tool -> tool.reservedCode().equals(definition.code()))
            .filter(tool -> tool.ownerModule().equals(definition.ownerModule()))
            .filter(tool -> tool.kioskType().equals(definition.kioskType()))
            .findFirst();
    }

    public Optional<EmployeeToolManifest> manifestForCode(
            String ownerModule,
            String kioskType,
            String code,
            Long legacyReferenceId) {
        if (legacyReferenceId != null || code == null) {
            return Optional.empty();
        }
        return MANIFESTS.stream()
            .filter(tool -> tool.reservedCode().equals(code))
            .filter(tool -> tool.ownerModule().equals(ownerModule))
            .filter(tool -> tool.kioskType().equals(kioskType))
            .findFirst();
    }

    public boolean isReservedCode(String code) {
        return code != null && code.startsWith(RESERVED_CODE_PREFIX);
    }

    public Map<String, Object> detailRow(EmployeeToolManifest tool, long definitionId, int sortOrder) {
        var row = new LinkedHashMap<>(catalogRow(tool));
        row.put("id", definitionId);
        row.put("kiosk_definition_id", definitionId);
        row.put("sort_order", sortOrder);
        return Map.copyOf(row);
    }

    private EmployeeToolManifest require(String toolKey) {
        var normalized = toolKey == null ? "" : toolKey.trim().toLowerCase(Locale.ROOT);
        var tool = BY_KEY.get(normalized);
        if (tool == null) {
            throw new IllegalArgumentException("Unsupported employee tool.");
        }
        return tool;
    }

    private InternalDefinition ensureDefinition(
            long companyId,
            long actorUserId,
            EmployeeToolManifest tool) {
        var current = findDefinition(companyId, tool);
        if (current.isPresent()) {
            return requireValidDefinition(current.get(), tool);
        }

        var rawInternalToken = randomToken();
        var inserted = false;
        try {
            inserted = jdbcTemplate.update(
                """
                    INSERT INTO kiosk_definitions (
                        company_id, owner_module, kiosk_type, legacy_reference_id, code, name,
                        description, status, unit_id, business_id, location_id, access_level,
                        audience, employee_center_enabled, employee_assignment_policy, expires_at,
                        public_token_hash, public_token_hint, protected_public_token,
                        legacy_token_recoverable, theme_key, default_locale,
                        configuration_version, adapter_version, created_by, updated_by
                    ) VALUES (?, ?, ?, NULL, ?, ?, ?, 'ACTIVE', NULL, NULL, NULL, 'CONTROLLED',
                              'EMPLOYEE', 1, 'COMPANY', NULL, ?, ?, NULL, 0, ?, 'es-MX', 1, 1, ?, ?)
                    """,
                companyId, tool.ownerModule(), tool.kioskType(), tool.reservedCode(),
                tool.name(), tool.description(), sha256(rawInternalToken), tokenHint(rawInternalToken),
                tool.themeKey(), actorUserId, actorUserId
            ) == 1;
        } catch (DuplicateKeyException concurrentProvision) {
            // The unique company/module/code boundary resolves concurrent idempotent provisioning.
        }

        var saved = findDefinition(companyId, tool)
            .orElseThrow(() -> new IllegalStateException("Employee tool definition could not be provisioned."));
        saved = requireValidDefinition(saved, tool);
        if (inserted) {
            auditCreated(saved, tool, actorUserId);
        }
        return saved;
    }

    private Optional<InternalDefinition> findDefinition(long companyId, EmployeeToolManifest tool) {
        return jdbcTemplate.query(
            """
                SELECT id, company_id, owner_module, kiosk_type, legacy_reference_id, code,
                       status, access_level, audience, employee_center_enabled,
                       employee_assignment_policy, unit_id, business_id, location_id, expires_at,
                       public_token_hash, protected_public_token, legacy_token_recoverable
                FROM kiosk_definitions
                WHERE company_id = ? AND owner_module = ? AND code = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new InternalDefinition(
                rs.getLong("id"), rs.getLong("company_id"), rs.getString("owner_module"),
                rs.getString("kiosk_type"), rs.getObject("legacy_reference_id", Long.class),
                rs.getString("code"), rs.getString("status"), rs.getString("access_level"),
                rs.getString("audience"), rs.getBoolean("employee_center_enabled"),
                rs.getString("employee_assignment_policy"),
                rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class),
                rs.getObject("location_id", Long.class), rs.getTimestamp("expires_at"),
                rs.getString("public_token_hash"), rs.getString("protected_public_token"),
                rs.getBoolean("legacy_token_recoverable")),
            companyId, tool.ownerModule(), tool.reservedCode()
        ).stream().findFirst();
    }

    private InternalDefinition requireValidDefinition(
            InternalDefinition definition,
            EmployeeToolManifest tool) {
        var valid = definition.companyId() > 0
            && tool.ownerModule().equals(definition.ownerModule())
            && tool.kioskType().equals(definition.kioskType())
            && tool.reservedCode().equals(definition.code())
            && definition.legacyReferenceId() == null
            && "ACTIVE".equals(definition.status())
            && "CONTROLLED".equals(definition.accessLevel())
            && "EMPLOYEE".equals(definition.audience())
            && definition.employeeCenterEnabled()
            && "COMPANY".equals(definition.assignmentPolicy())
            && definition.unitId() == null
            && definition.businessId() == null
            && definition.locationId() == null
            && definition.expiresAt() == null
            && definition.publicTokenHash() != null
            && !definition.publicTokenHash().isBlank()
            && (definition.protectedPublicToken() == null || definition.protectedPublicToken().isBlank())
            && !definition.legacyTokenRecoverable();
        if (!valid) {
            throw new SecurityException("Reserved employee tool definition is invalid.");
        }
        return definition;
    }

    private Map<String, Object> catalogRow(EmployeeToolManifest tool) {
        var row = new LinkedHashMap<String, Object>();
        row.put("tool_key", tool.toolKey());
        row.put("key", tool.toolKey());
        row.put("name", tool.name());
        row.put("description", tool.description());
        row.put("owner_module", tool.ownerModule());
        row.put("module_slug", tool.moduleSlug());
        row.put("kiosk_type", tool.kioskType());
        row.put("workspace_kind", tool.workspaceKind());
        row.put("audience_policy", "COMPANY_MEMBERS");
        row.put("required_tab_scopes", tool.requiredTabScopes().stream().sorted().toList());
        row.put("capabilities", tool.capabilities().stream().sorted().toList());
        row.put("availability", "AVAILABLE");
        row.put("readiness", "AVAILABLE");
        return Map.copyOf(row);
    }

    private void auditCreated(
            InternalDefinition definition,
            EmployeeToolManifest tool,
            long actorUserId) {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, kiosk_definition_id, historical_kiosk_id, company_id, owner_module,
                    event_type, outcome, actor_type, actor_id, snapshot_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, 'EMPLOYEE_TOOL_DEFINITION_CREATED', 'SUCCEEDED',
                          'USER', ?, JSON_OBJECT('tool_key', ?, 'internal', TRUE),
                          TIMESTAMPADD(DAY, 365, CURRENT_TIMESTAMP))
                """,
            UUID.randomUUID().toString(), definition.id(), definition.id(), definition.companyId(),
            tool.ownerModule(), actorUserId, tool.toolKey()
        );
    }

    private String randomToken() {
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String tokenHint(String token) {
        return token.substring(0, 6) + "..." + token.substring(token.length() - 6);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private static Map<String, EmployeeToolManifest> manifestsByKey() {
        var result = new LinkedHashMap<String, EmployeeToolManifest>();
        for (var tool : MANIFESTS) {
            if (result.put(tool.toolKey(), tool) != null) {
                throw new IllegalStateException("Duplicate employee tool key: " + tool.toolKey());
            }
        }
        return Map.copyOf(result);
    }

    public record EmployeeToolManifest(
            String toolKey,
            String ownerModule,
            String moduleSlug,
            String kioskType,
            String reservedCode,
            String name,
            String description,
            String workspaceKind,
            String themeKey,
            Set<String> requiredTabScopes,
            Set<String> capabilities) {
    }

    private record InternalDefinition(
            long id,
            long companyId,
            String ownerModule,
            String kioskType,
            Long legacyReferenceId,
            String code,
            String status,
            String accessLevel,
            String audience,
            boolean employeeCenterEnabled,
            String assignmentPolicy,
            Long unitId,
            Long businessId,
            Long locationId,
            java.sql.Timestamp expiresAt,
            String publicTokenHash,
            String protectedPublicToken,
            boolean legacyTokenRecoverable) {
    }
}
