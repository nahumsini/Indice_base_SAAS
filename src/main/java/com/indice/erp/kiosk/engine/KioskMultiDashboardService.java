package com.indice.erp.kiosk.engine;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Effective, safe launcher catalog for authenticated internal users. */
@Service
public class KioskMultiDashboardService {

    private final JdbcTemplate jdbcTemplate;
    private final KioskRegistryService registry;
    private final KioskAdapterRegistry adapterRegistry;
    private final KioskEngineFeatureFlags featureFlags;
    private final KioskSessionService sessions;
    private final KioskEmployeeAccessService employeeAccess;
    private final KioskEmployeeToolCatalogService employeeTools;
    private final KioskActionDispatcher dispatcher;
    private final TabPermissionAccessService tabPermissions;
    private final ModuleAccessService moduleAccess;

    public KioskMultiDashboardService(
            JdbcTemplate jdbcTemplate,
            KioskRegistryService registry,
            KioskAdapterRegistry adapterRegistry,
            KioskEngineFeatureFlags featureFlags,
            KioskSessionService sessions,
            KioskEmployeeAccessService employeeAccess,
            KioskEmployeeToolCatalogService employeeTools,
            KioskActionDispatcher dispatcher,
            TabPermissionAccessService tabPermissions,
            ModuleAccessService moduleAccess) {
        this.jdbcTemplate = jdbcTemplate;
        this.registry = registry;
        this.adapterRegistry = adapterRegistry;
        this.featureFlags = featureFlags;
        this.sessions = sessions;
        this.employeeAccess = employeeAccess;
        this.employeeTools = employeeTools;
        this.dispatcher = dispatcher;
        this.tabPermissions = tabPermissions;
        this.moduleAccess = moduleAccess;
    }

    public List<Map<String, Object>> list(AuthSessionUser user) {
        return eligibleCards(user, true, false);
    }

    /**
     * Returns only the children composed into one active company Multi-kiosk that the current
     * member can actually use. Multi-kiosk membership is company-wide; it deliberately does not
     * create or require a persistent per-person kiosk grant.
     */
    public List<Map<String, Object>> listForMultiKiosk(
            AuthSessionUser user,
            long multiKioskId) {
        if (user == null || user.userCompanyId() == null || multiKioskId <= 0) {
            return List.of();
        }
        var orderedIds = jdbcTemplate.query(
            """
                SELECT item.kiosk_definition_id
                FROM multi_kiosk_items item
                INNER JOIN multi_kiosk_definitions parent
                  ON parent.id = item.multi_kiosk_id
                 AND parent.company_id = ?
                 AND parent.status = 'ACTIVE'
                 AND (parent.expires_at IS NULL OR parent.expires_at > CURRENT_TIMESTAMP)
                WHERE item.multi_kiosk_id = ?
                ORDER BY item.sort_order, item.kiosk_definition_id
                """,
            (rs, rowNum) -> rs.getLong("kiosk_definition_id"),
            user.companyId(), multiKioskId
        );
        if (orderedIds.isEmpty()) return List.of();

        var eligibleById = new LinkedHashMap<Long, Map<String, Object>>();
        eligibleCards(user, false, true).forEach(card ->
            eligibleById.put(((Number) card.get("id")).longValue(), card));
        return orderedIds.stream()
            .map(eligibleById::get)
            .filter(java.util.Objects::nonNull)
            .toList();
    }

    private List<Map<String, Object>> eligibleCards(
            AuthSessionUser user,
            boolean requireExplicitGrant,
            boolean requireEmployeeCenterReady) {
        return registry.list(user.companyId()).stream()
            .filter(definition -> definition.effectiveStatus(java.time.Instant.now()).operational())
            .filter(definition -> !requireExplicitGrant
                || employeeTools.manifestFor(definition).isEmpty())
            .filter(definition -> employeeAccess.isEmployeeEligible(user.companyId(), definition.id()))
            .filter(definition -> featureFlags.adapterEnabled(definition.ownerModule()))
            .filter(definition -> moduleAccess.canAccess(
                user, KioskEmployeeAccessService.moduleSlug(definition.ownerModule())))
            .filter(definition -> tabPermissionAllows(user, definition))
            .filter(definition -> !requireExplicitGrant || hasExplicitGrant(user, definition))
            .filter(definition -> organizationScopeAllows(user, definition))
            .map(this::employeeCenterCandidate)
            .filter(candidate -> !requireEmployeeCenterReady
                || candidate.employeeCenterReady())
            .filter(candidate -> hasEnabledCapability(user, candidate))
            .map(this::card)
            .toList();
    }

    @Transactional
    public Map<String, Object> createSession(
            AuthSessionUser user,
            long kioskDefinitionId,
            String browserSessionReference) {
        var allowed = list(user).stream()
            .anyMatch(card -> ((Number) card.get("id")).longValue() == kioskDefinitionId);
        if (!allowed) {
            throw new KioskUnavailableException();
        }
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var employeeCenterReady = adapter.supportsEmployeeCenter(definition);
        var definitionCapabilities = adapter.capabilities(definition);
        registry.synchronizeCapabilities(definition, definitionCapabilities);
        var capabilities = definitionCapabilities.stream()
            .filter(descriptor -> employeeCapabilityAllowed(
                user, definition, adapter, descriptor, employeeCenterReady))
            .map(KioskCapabilityDescriptor::versionedKey)
            .collect(Collectors.toUnmodifiableSet());
        if (capabilities.isEmpty()) throw new KioskUnavailableException();
        var launch = sessions.createAuthenticatedIndexSession(
            definition, user.userId(), browserSessionReference, capabilities);
        var data = new LinkedHashMap<String, Object>();
        data.put("kiosk_session_id", launch.session().sessionId());
        data.put("kiosk_session_token", launch.accessToken());
        data.put("expires_at", launch.session().expiresAt().toString());
        data.put("granted_capabilities", launch.session().grantedCapabilities());
        data.put("experience_status", employeeCenterReady
            ? "READY" : "SPECIALIZED_VERIFICATION_REQUIRED");
        data.put("workspace", Map.of(
            "channel", "AUTHENTICATED_WEB",
            "kiosk_definition_id", definition.id(),
            "owner_module", definition.ownerModule(),
            "kiosk_type", definition.kioskType(),
            "launch_path", "/kiosk-center/workspace/" + definition.id(),
            "return_path", "/kiosk-center"
        ));
        return Map.copyOf(data);
    }

    @Transactional
    public Map<String, Object> createMobileSession(
            AuthSessionUser user,
            long multiKioskId,
            long kioskDefinitionId,
            String browserSessionReference) {
        requireAllowedForMultiKiosk(user, multiKioskId, kioskDefinitionId);
        if (user.userCompanyId() == null) throw new KioskUnavailableException();
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var employeeCenterReady = adapter.supportsEmployeeCenter(definition);
        var definitionCapabilities = adapter.capabilities(definition);
        registry.synchronizeCapabilities(definition, definitionCapabilities);
        var capabilities = definitionCapabilities.stream()
            .filter(descriptor -> employeeCapabilityAllowed(
                user, definition, adapter, descriptor, employeeCenterReady))
            .map(KioskCapabilityDescriptor::versionedKey)
            .collect(Collectors.toUnmodifiableSet());
        if (capabilities.isEmpty()) throw new KioskUnavailableException();
        var launch = sessions.createMobileMultiKioskSession(
            definition, multiKioskId, user.userId(), user.userCompanyId(),
            browserSessionReference, capabilities);
        var data = new LinkedHashMap<String, Object>();
        data.put("kiosk_session_id", launch.session().sessionId());
        data.put("kiosk_session_token", launch.accessToken());
        data.put("expires_at", launch.session().expiresAt().toString());
        data.put("granted_capabilities", launch.session().grantedCapabilities());
        data.put("experience_status", employeeCenterReady
            ? "READY" : "SPECIALIZED_VERIFICATION_REQUIRED");
        data.put("workspace", Map.of(
            "channel", "MOBILE_MULTI_KIOSK",
            "kiosk_definition_id", definition.id(),
            "owner_module", definition.ownerModule(),
            "kiosk_type", definition.kioskType()
        ));
        return Map.copyOf(data);
    }

    @Transactional
    public Map<String, Object> workspace(
            AuthSessionUser user,
            long kioskDefinitionId,
            String accessToken,
            String browserSessionReference) {
        requireAllowed(user, kioskDefinitionId);
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var principal = sessions.requireAuthenticatedIndexSession(
            definition, accessToken, browserSessionReference, user.userId());
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var employeeCenterReady = adapter.supportsEmployeeCenter(definition);
        var result = new LinkedHashMap<String, Object>();
        result.put("kiosk", card(definition, employeeCenterReady));
        result.put("session", Map.of(
            "id", principal.sessionId(),
            "expires_at", principal.expiresAt().toString(),
            "capabilities", principal.grantedCapabilities()
        ));
        if (!employeeCenterReady) {
            result.put("experience_status", "SPECIALIZED_VERIFICATION_REQUIRED");
            result.put("message", "This kiosk requires its module-specific verification step.");
            return result;
        }
        var context = authenticatedContext(definition, browserSessionReference).resolved(definition, principal);
        result.put("experience_status", "READY");
        result.put("bootstrap", adapter.employeeBootstrap(context));
        return result;
    }

    @Transactional
    public Map<String, Object> mobileWorkspace(
            AuthSessionUser user,
            long multiKioskId,
            long kioskDefinitionId,
            String accessToken,
            String browserSessionReference) {
        requireAllowedForMultiKiosk(user, multiKioskId, kioskDefinitionId);
        if (user.userCompanyId() == null) throw new KioskUnavailableException();
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var principal = sessions.requireMobileMultiKioskSession(
            definition, multiKioskId, accessToken, browserSessionReference,
            user.userId(), user.userCompanyId());
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var employeeCenterReady = adapter.supportsEmployeeCenter(definition);
        var result = new LinkedHashMap<String, Object>();
        result.put("kiosk", card(definition, employeeCenterReady));
        result.put("session", Map.of(
            "id", principal.sessionId(),
            "expires_at", principal.expiresAt().toString(),
            "capabilities", principal.grantedCapabilities()
        ));
        if (!employeeCenterReady) {
            result.put("experience_status", "SPECIALIZED_VERIFICATION_REQUIRED");
            result.put("message", "Este kiosco requiere su verificación especializada antes de operar.");
            return Map.copyOf(result);
        }
        var context = mobileContext(definition, browserSessionReference).resolved(definition, principal);
        result.put("experience_status", "READY");
        result.put("bootstrap", adapter.employeeBootstrap(context));
        return Map.copyOf(result);
    }

    @Transactional
    public KioskDispatchResult executeAction(
            AuthSessionUser user,
            long kioskDefinitionId,
            String versionedCapability,
            String accessToken,
            String browserSessionReference,
            Map<String, Object> payload,
            String idempotencyKey) {
        requireAllowed(user, kioskDefinitionId);
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var employeeCenterReady = adapter.supportsEmployeeCenter(definition);
        if (!employeeCenterReady) {
            throw new UnsupportedOperationException(
                "This kiosk requires its module-specific verification step.");
        }
        var principal = sessions.requireAuthenticatedIndexSession(
            definition, accessToken, browserSessionReference, user.userId());
        var parsed = parseCapability(versionedCapability);
        requireEmployeeCapabilityAllowed(
            user, definition, adapter, parsed.versionedKey(), employeeCenterReady);
        var normalized = new LinkedHashMap<String, Object>(payload == null ? Map.of() : payload);
        normalized.put("kiosk_session_token", accessToken);
        var resourceId = number(normalized.get("resource_id"));
        return dispatcher.dispatchWithMetadata(
            authenticatedContext(definition, browserSessionReference).resolved(definition, principal),
            new KioskActionRequest(parsed.key(), parsed.version(), resourceId, normalized),
            idempotencyKey
        );
    }

    @Transactional
    public KioskDispatchResult executeMobileAction(
            AuthSessionUser user,
            long multiKioskId,
            long kioskDefinitionId,
            String versionedCapability,
            String accessToken,
            String browserSessionReference,
            Map<String, Object> payload,
            String idempotencyKey) {
        requireAllowedForMultiKiosk(user, multiKioskId, kioskDefinitionId);
        if (user.userCompanyId() == null) throw new KioskUnavailableException();
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var employeeCenterReady = adapter.supportsEmployeeCenter(definition);
        if (!employeeCenterReady) {
            throw new UnsupportedOperationException(
                "Este kiosco requiere su verificación especializada antes de operar.");
        }
        var principal = sessions.requireMobileMultiKioskSession(
            definition, multiKioskId, accessToken, browserSessionReference,
            user.userId(), user.userCompanyId());
        var parsed = parseCapability(versionedCapability);
        requireEmployeeCapabilityAllowed(
            user, definition, adapter, parsed.versionedKey(), employeeCenterReady);
        if (!principal.grantedCapabilities().contains(parsed.versionedKey())) {
            throw new SecurityException("Kiosk capability is not granted.");
        }
        var normalized = new LinkedHashMap<String, Object>(payload == null ? Map.of() : payload);
        normalized.put("kiosk_session_token", accessToken);
        var resourceId = number(normalized.get("resource_id"));
        return dispatcher.dispatchWithMetadata(
            mobileContext(definition, browserSessionReference).resolved(definition, principal),
            new KioskActionRequest(parsed.key(), parsed.version(), resourceId, normalized),
            idempotencyKey
        );
    }

    private void requireAllowed(AuthSessionUser user, long kioskDefinitionId) {
        if (list(user).stream().noneMatch(card -> ((Number) card.get("id")).longValue() == kioskDefinitionId)) {
            throw new KioskUnavailableException();
        }
    }

    private void requireAllowedForMultiKiosk(
            AuthSessionUser user,
            long multiKioskId,
            long kioskDefinitionId) {
        if (listForMultiKiosk(user, multiKioskId).stream()
                .noneMatch(card -> ((Number) card.get("id")).longValue() == kioskDefinitionId)) {
            throw new KioskUnavailableException();
        }
    }

    private KioskExecutionContext authenticatedContext(
            KioskResolvedDefinition definition,
            String browserSessionReference) {
        return new KioskExecutionContext(
            definition.ownerModule(), KioskExecutionChannels.AUTHENTICATED_WEB,
            "definition:" + definition.id(),
            "internal", browserSessionReference);
    }

    private KioskExecutionContext mobileContext(
            KioskResolvedDefinition definition,
            String browserSessionReference) {
        return new KioskExecutionContext(
            definition.ownerModule(), KioskExecutionChannels.MOBILE_MULTI_KIOSK,
            "definition:" + definition.id(),
            "mobile", browserSessionReference);
    }

    private ParsedCapability parseCapability(String value) {
        var normalized = value == null ? "" : value.trim();
        var marker = normalized.lastIndexOf('@');
        if (marker <= 0 || marker + 1 >= normalized.length()) {
            throw new IllegalArgumentException("Versioned kiosk capability is required.");
        }
        var rawVersion = normalized.substring(marker + 1);
        if (rawVersion.startsWith("v")) {
            rawVersion = rawVersion.substring(1);
        }
        if (rawVersion.isBlank()) {
            throw new IllegalArgumentException("Versioned kiosk capability is invalid.");
        }
        try {
            return new ParsedCapability(
                normalized.substring(0, marker),
                Integer.parseInt(rawVersion));
        } catch (NumberFormatException failure) {
            throw new IllegalArgumentException("Versioned kiosk capability is invalid.");
        }
    }

    private Long number(Object value) {
        if (value instanceof Number number) return number.longValue();
        try {
            return value == null ? null : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean hasEnabledCapability(
            AuthSessionUser user,
            EmployeeCenterCandidate candidate) {
        var definition = candidate.definition();
        var adapter = candidate.adapter();
        var definitionCapabilities = adapter.capabilities(definition);
        registry.synchronizeCapabilities(definition, definitionCapabilities);
        return definitionCapabilities.stream()
            .anyMatch(capability -> employeeCapabilityAllowed(
                user, definition, adapter, capability, candidate.employeeCenterReady()));
    }

    private EmployeeCenterCandidate employeeCenterCandidate(KioskResolvedDefinition definition) {
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        return new EmployeeCenterCandidate(
            definition, adapter, adapter.supportsEmployeeCenter(definition));
    }

    Set<String> requiredTabPermissionKeys(long companyId, long kioskDefinitionId) {
        var definition = registry.requireById(companyId, kioskDefinitionId);
        return Set.copyOf(adapterRegistry.requireAdapter(definition.ownerModule())
            .employeeCenterTabPermissionKeys(definition));
    }

    boolean tabPermissionAllows(AuthSessionUser user, long kioskDefinitionId) {
        return tabPermissionAllows(user, registry.requireById(user.companyId(), kioskDefinitionId));
    }

    private boolean tabPermissionAllows(AuthSessionUser user, KioskResolvedDefinition definition) {
        var keys = adapterRegistry.requireAdapter(definition.ownerModule())
            .employeeCenterTabPermissionKeys(definition);
        return hasAnyTabPermission(user, keys);
    }

    private boolean employeeCapabilityAllowed(
            AuthSessionUser user,
            KioskResolvedDefinition definition,
            KioskModuleAdapter adapter,
            KioskCapabilityDescriptor capability,
            boolean employeeCenterReady) {
        if (!registry.capabilityEnabled(definition.id(), capability)) {
            return false;
        }
        if (!employeeCenterReady) {
            return true;
        }
        return hasAnyTabPermission(
            user, adapter.employeeCapabilityTabPermissionKeys(definition, capability));
    }

    private void requireEmployeeCapabilityAllowed(
            AuthSessionUser user,
            KioskResolvedDefinition definition,
            KioskModuleAdapter adapter,
            String versionedCapability,
            boolean employeeCenterReady) {
        var capability = adapter.capabilities(definition).stream()
            .filter(candidate -> candidate.versionedKey().equals(versionedCapability))
            .findFirst()
            .orElseThrow(KioskUnavailableException::new);
        if (!employeeCapabilityAllowed(
                user, definition, adapter, capability, employeeCenterReady)) {
            throw new KioskUnavailableException();
        }
    }

    private boolean hasAnyTabPermission(AuthSessionUser user, Set<String> permissionKeys) {
        if (permissionKeys == null || permissionKeys.isEmpty()) {
            return false;
        }
        return tabPermissions.canAccess(
            user, TabPermissionRequirement.any(permissionKeys.toArray(String[]::new)));
    }

    private boolean organizationScopeAllows(AuthSessionUser user, KioskResolvedDefinition definition) {
        if (definition.unitId() == null && definition.businessId() == null) {
            return true;
        }
        if (user.userCompanyId() == null) {
            return false;
        }
        var scopes = jdbcTemplate.query(
            """
                SELECT profile.unit_id, profile.business_id
                FROM user_work_profiles profile
                WHERE profile.company_id = ? AND profile.user_company_id = ?
                  AND LOWER(COALESCE(profile.status, 'active')) IN ('active', 'activo')
                ORDER BY profile.id DESC LIMIT 1
                """,
            (rs, rowNum) -> new OrganizationScope(
                rs.getObject("unit_id", Long.class),
                rs.getObject("business_id", Long.class)),
            user.companyId(), user.userCompanyId()
        );
        if (scopes.isEmpty()) return false;
        var scope = scopes.getFirst();
        if (scope.unitId() == null && scope.businessId() == null) return true;
        if (definition.unitId() != null && !definition.unitId().equals(scope.unitId())) return false;
        return scope.businessId() == null || definition.businessId() == null
            || definition.businessId().equals(scope.businessId());
    }

    private boolean hasExplicitGrant(AuthSessionUser user, KioskResolvedDefinition definition) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT EXISTS(
                    SELECT 1 FROM kiosk_grants
                    WHERE kiosk_definition_id = ? AND status = 'ACTIVE'
                      AND ((identity_type = 'USER' AND identity_id = ?)
                        OR (identity_type = 'EMPLOYEE' AND identity_id = ?))
                )
                """,
            Integer.class,
            definition.id(), user.userId(), user.userCompanyId() == null ? -1L : user.userCompanyId()
        );
        return count != null && count > 0;
    }

    private Map<String, Object> card(EmployeeCenterCandidate candidate) {
        return card(candidate.definition(), candidate.employeeCenterReady());
    }

    private Map<String, Object> card(
            KioskResolvedDefinition definition,
            boolean employeeCenterReady) {
        var card = new LinkedHashMap<String, Object>();
        card.put("id", definition.id());
        card.put("name", definition.name());
        card.put("module", definition.ownerModule());
        card.put("module_slug", KioskEmployeeAccessService.moduleSlug(definition.ownerModule()));
        card.put("kiosk_type", definition.kioskType());
        employeeTools.manifestFor(definition).ifPresent(tool -> {
            card.put("tool_key", tool.toolKey());
            card.put("key", tool.toolKey());
            card.put("workspace_kind", tool.workspaceKind());
            card.put("audience_policy", "COMPANY_MEMBERS");
            card.put("readiness", "AVAILABLE");
        });
        card.put("purpose", purpose(definition.ownerModule()));
        card.put("scope", Map.of(
            "unit_id", definition.unitId() == null ? "" : definition.unitId(),
            "business_id", definition.businessId() == null ? "" : definition.businessId()
        ));
        card.put("availability", employeeCenterReady
            ? "AVAILABLE" : "VERIFICATION_REQUIRED");
        card.put("primary_action", "OPEN");
        return Map.copyOf(card);
    }

    private String purpose(String ownerModule) {
        return switch (ownerModule) {
            case "PROCESS_TASKS" -> "Consultar y actualizar tareas autorizadas";
            case "PETTY_CASH" -> "Consultar y registrar movimientos autorizados";
            default -> "Abrir experiencia autorizada";
        };
    }

    private record ParsedCapability(String key, int version) {
        String versionedKey() {
            return key + "@" + version;
        }
    }

    private record OrganizationScope(Long unitId, Long businessId) {
    }

    private record EmployeeCenterCandidate(
            KioskResolvedDefinition definition,
            KioskModuleAdapter adapter,
            boolean employeeCenterReady) {
    }
}
