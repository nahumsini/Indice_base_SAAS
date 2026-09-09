package com.indice.erp.kiosk.engine;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.finance.payablekiosk.PayableKioskCapabilities;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementSupplierPortalCapabilities;
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
 * Stable tool catalog for the company-wide Provider Center.
 *
 * <p>Definitions are internal Engine subjects. The central Provider Center PIN is the provider
 * access authority; modules continue owning their data and operation invariants.</p>
 */
@Service
public class KioskProviderToolCatalogService {

    public static final String RESERVED_CODE_PREFIX = "INDICE-PROVIDER-TOOL-";
    public static final String PROPOSALS = "provider.proposals@1";
    public static final String ORDERS_AND_INVOICES = "provider.orders-and-invoices@1";
    public static final String PAYABLES = "provider.payables@1";
    public static final String TRACKING = "provider.tracking@1";

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final List<ProviderToolManifest> MANIFESTS = List.of(
        new ProviderToolManifest(
            PROPOSALS, ProcurementSupplierPortalCapabilities.OWNER_MODULE, "pos",
            ProcurementSupplierPortalCapabilities.PROVIDER_PROPOSALS_KIOSK_TYPE,
            RESERVED_CODE_PREFIX + "PROPOSALS-V1", "Productos y propuestas",
            "Propón productos, envía propuestas y responde solicitudes de cotización.",
            "PROVIDER_PROPOSALS", "procurement", Set.of(
                ProcurementSupplierPortalCapabilities.PROVIDER_PROPOSALS_READ + "@1",
                ProcurementSupplierPortalCapabilities.PROVIDER_PROPOSAL_SUBMIT + "@1",
                ProcurementSupplierPortalCapabilities.PROVIDER_QUOTE_RESPOND + "@1",
                ProcurementSupplierPortalCapabilities.PROVIDER_PROFILE_CHANGE_SUBMIT + "@1")),
        new ProviderToolManifest(
            ORDERS_AND_INVOICES, ProcurementSupplierPortalCapabilities.OWNER_MODULE, "pos",
            ProcurementSupplierPortalCapabilities.PROVIDER_ORDERS_KIOSK_TYPE,
            RESERVED_CODE_PREFIX + "ORDERS-INVOICES-V1", "Órdenes y facturas",
            "Confirma órdenes, solicita ajustes y factura una orden autorizada.",
            "PROVIDER_ORDERS_INVOICES", "procurement", Set.of(
                ProcurementSupplierPortalCapabilities.PROVIDER_ORDERS_READ + "@1",
                ProcurementSupplierPortalCapabilities.PROVIDER_ORDER_RESPOND + "@1",
                ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN + "@1",
                ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER + "@1",
                ProcurementSupplierPortalCapabilities.PROVIDER_ORDER_INVOICE_SUBMIT + "@1")),
        new ProviderToolManifest(
            PAYABLES, PayableKioskCapabilities.OWNER_MODULE, "expenses",
            PayableKioskCapabilities.PROVIDER_CENTER_KIOSK_TYPE,
            RESERVED_CODE_PREFIX + "PAYABLES-V1", "Cuentas por pagar",
            "Envía cuentas por pagar directamente a Gastos para revisión.",
            "PROVIDER_PAYABLES", "payables", Set.of(
                PayableKioskCapabilities.PROVIDER_CENTER_READ + "@1",
                PayableKioskCapabilities.PAYABLE_CREATE + "@1",
                PayableKioskCapabilities.ATTACHMENT_PRESIGN + "@1",
                PayableKioskCapabilities.ATTACHMENT_REGISTER + "@1",
                PayableKioskCapabilities.PROFILE_READ + "@1",
                PayableKioskCapabilities.PROFILE_CHANGE_SUBMIT + "@1")),
        new ProviderToolManifest(
            TRACKING, ProviderCenterCapabilities.OWNER_MODULE, "provider_center",
            ProviderCenterCapabilities.KIOSK_TYPE,
            RESERVED_CODE_PREFIX + "TRACKING-V1", "Seguimiento y pagos",
            "Consulta el estado compartible de propuestas, órdenes, cuentas y pagos.",
            "PROVIDER_TRACKING", "tracking", Set.of(
                ProviderCenterCapabilities.TRACKING_READ + "@1"))
    );
    private static final Map<String, ProviderToolManifest> BY_KEY = manifestsByKey();

    private final JdbcTemplate jdbcTemplate;
    private final ModuleAccessService moduleAccess;
    private final KioskEngineFeatureFlags featureFlags;

    public KioskProviderToolCatalogService(
            JdbcTemplate jdbcTemplate,
            ModuleAccessService moduleAccess,
            KioskEngineFeatureFlags featureFlags) {
        this.jdbcTemplate = jdbcTemplate;
        this.moduleAccess = moduleAccess;
        this.featureFlags = featureFlags;
    }

    public List<Map<String, Object>> availableTools(long companyId) {
        return MANIFESTS.stream()
            .filter(tool -> available(companyId, tool))
            .map(this::catalogRow)
            .toList();
    }

    /** The Provider Center is one fixed business flow, not a menu assembled per provider. */
    public List<String> requiredToolKeys() {
        return MANIFESTS.stream().map(ProviderToolManifest::toolKey).toList();
    }

    public List<String> normalizeToolKeys(Object rawValue) {
        if (rawValue == null) return List.of();
        if (!(rawValue instanceof Collection<?> values)) {
            throw new IllegalArgumentException("tool_keys must be a list.");
        }
        var result = new LinkedHashSet<String>();
        for (var value : values) {
            var key = value == null ? "" : String.valueOf(value).trim().toLowerCase(Locale.ROOT);
            if (key.isBlank() || !BY_KEY.containsKey(key)) {
                throw new IllegalArgumentException("tool_keys contains an unsupported provider tool.");
            }
            result.add(key);
        }
        return List.copyOf(result);
    }

    public void requireAvailable(long companyId, List<String> keys) {
        for (var key : keys == null ? List.<String>of() : keys) {
            if (!available(companyId, require(key))) {
                throw new IllegalArgumentException("One or more provider tools are unavailable.");
            }
        }
    }

    @Transactional
    public List<Long> provisionDefinitions(long companyId, long actorUserId, List<String> keys) {
        requireAvailable(companyId, keys);
        var result = new java.util.ArrayList<Long>();
        for (var key : keys) result.add(ensureDefinition(companyId, actorUserId, require(key)).id());
        return List.copyOf(result);
    }

    public Optional<ProviderToolManifest> manifestFor(KioskResolvedDefinition definition) {
        if (definition == null || definition.legacyReferenceId() != null) return Optional.empty();
        return manifestForCode(
            definition.ownerModule(), definition.kioskType(), definition.code(),
            definition.legacyReferenceId());
    }

    public Optional<ProviderToolManifest> manifestForCode(
            String ownerModule, String kioskType, String code, Long legacyReferenceId) {
        if (legacyReferenceId != null || code == null) return Optional.empty();
        return MANIFESTS.stream()
            .filter(tool -> tool.reservedCode().equals(code))
            .filter(tool -> tool.ownerModule().equals(ownerModule))
            .filter(tool -> tool.kioskType().equals(kioskType))
            .findFirst();
    }

    public Map<String, Object> detailRow(ProviderToolManifest tool, long definitionId, int sortOrder) {
        var row = new LinkedHashMap<>(catalogRow(tool));
        row.put("id", definitionId);
        row.put("kiosk_definition_id", definitionId);
        row.put("sort_order", sortOrder);
        return Map.copyOf(row);
    }

    private boolean available(long companyId, ProviderToolManifest tool) {
        if (!featureFlags.adapterEnabled(tool.ownerModule())) return false;
        if (TRACKING.equals(tool.toolKey())) {
            return moduleAccess.companyCanAccess(companyId, "pos")
                || moduleAccess.companyCanAccess(companyId, "expenses");
        }
        return moduleAccess.companyCanAccess(companyId, tool.moduleSlug());
    }

    private ProviderToolManifest require(String value) {
        var key = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        var tool = BY_KEY.get(key);
        if (tool == null) throw new IllegalArgumentException("Unsupported provider tool.");
        return tool;
    }

    private InternalDefinition ensureDefinition(
            long companyId, long actorUserId, ProviderToolManifest tool) {
        var current = findDefinition(companyId, tool);
        if (current.isPresent()) return requireValidDefinition(current.get(), tool);
        var token = randomToken();
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
                              'PROVIDER', 0, 'MODULE_GRANT', NULL, ?, ?, NULL, 0, ?, 'es-MX', 1, 1, ?, ?)
                    """,
                companyId, tool.ownerModule(), tool.kioskType(), tool.reservedCode(), tool.name(),
                tool.description(), sha256(token), tokenHint(token), tool.themeKey(), actorUserId,
                actorUserId) == 1;
        } catch (DuplicateKeyException concurrentProvision) {
            // The company/module/code key makes concurrent provisioning idempotent.
        }
        var saved = findDefinition(companyId, tool)
            .orElseThrow(() -> new IllegalStateException("Provider tool definition could not be provisioned."));
        saved = requireValidDefinition(saved, tool);
        if (inserted) auditCreated(saved, tool, actorUserId);
        return saved;
    }

    private Optional<InternalDefinition> findDefinition(long companyId, ProviderToolManifest tool) {
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
                rs.getString("employee_assignment_policy"), rs.getObject("unit_id", Long.class),
                rs.getObject("business_id", Long.class), rs.getObject("location_id", Long.class),
                rs.getTimestamp("expires_at"), rs.getString("public_token_hash"),
                rs.getString("protected_public_token"), rs.getBoolean("legacy_token_recoverable")),
            companyId, tool.ownerModule(), tool.reservedCode()).stream().findFirst();
    }

    private InternalDefinition requireValidDefinition(
            InternalDefinition definition, ProviderToolManifest tool) {
        var valid = definition.companyId() > 0
            && tool.ownerModule().equals(definition.ownerModule())
            && tool.kioskType().equals(definition.kioskType())
            && tool.reservedCode().equals(definition.code())
            && definition.legacyReferenceId() == null
            && "ACTIVE".equals(definition.status())
            && "CONTROLLED".equals(definition.accessLevel())
            && "PROVIDER".equals(definition.audience())
            && !definition.employeeCenterEnabled()
            && "MODULE_GRANT".equals(definition.assignmentPolicy())
            && definition.unitId() == null && definition.businessId() == null
            && definition.locationId() == null && definition.expiresAt() == null
            && definition.publicTokenHash() != null && !definition.publicTokenHash().isBlank()
            && (definition.protectedPublicToken() == null || definition.protectedPublicToken().isBlank())
            && !definition.legacyTokenRecoverable();
        if (!valid) throw new SecurityException("Reserved provider tool definition is invalid.");
        return definition;
    }

    private Map<String, Object> catalogRow(ProviderToolManifest tool) {
        var row = new LinkedHashMap<String, Object>();
        row.put("tool_key", tool.toolKey());
        row.put("key", tool.toolKey());
        row.put("name", tool.name());
        row.put("description", tool.description());
        row.put("owner_module", tool.ownerModule());
        row.put("module_slug", tool.moduleSlug());
        row.put("kiosk_type", tool.kioskType());
        row.put("workspace_kind", tool.workspaceKind());
        row.put("audience_policy", "PROVIDER_CENTER_PIN");
        row.put("capabilities", tool.capabilities().stream().sorted().toList());
        row.put("availability", "AVAILABLE");
        row.put("readiness", "AVAILABLE");
        return Map.copyOf(row);
    }

    private void auditCreated(
            InternalDefinition definition, ProviderToolManifest tool, long actorUserId) {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, kiosk_definition_id, historical_kiosk_id, company_id, owner_module,
                    event_type, outcome, actor_type, actor_id, snapshot_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, 'PROVIDER_TOOL_DEFINITION_CREATED', 'SUCCEEDED',
                          'USER', ?, JSON_OBJECT('tool_key', ?, 'internal', TRUE),
                          TIMESTAMPADD(DAY, 365, CURRENT_TIMESTAMP))
                """,
            UUID.randomUUID().toString(), definition.id(), definition.id(), definition.companyId(),
            tool.ownerModule(), actorUserId, tool.toolKey());
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
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private static Map<String, ProviderToolManifest> manifestsByKey() {
        var result = new LinkedHashMap<String, ProviderToolManifest>();
        for (var tool : MANIFESTS) {
            if (result.put(tool.toolKey(), tool) != null) {
                throw new IllegalStateException("Duplicate provider tool key: " + tool.toolKey());
            }
        }
        return Map.copyOf(result);
    }

    public record ProviderToolManifest(
        String toolKey, String ownerModule, String moduleSlug, String kioskType,
        String reservedCode, String name, String description, String workspaceKind,
        String themeKey, Set<String> capabilities) {}

    private record InternalDefinition(
        long id, long companyId, String ownerModule, String kioskType,
        Long legacyReferenceId, String code, String status, String accessLevel,
        String audience, boolean employeeCenterEnabled, String assignmentPolicy,
        Long unitId, Long businessId, Long locationId, java.sql.Timestamp expiresAt,
        String publicTokenHash, String protectedPublicToken, boolean legacyTokenRecoverable) {}
}
