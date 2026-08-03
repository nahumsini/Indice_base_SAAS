package com.indice.erp.kiosk.engine;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.auth.AuthSessionUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Effective, safe launcher catalog for authenticated internal users. */
@Service
public class KioskMultiDashboardService {

    private static final Set<String> FULL_MODULE_ACCESS_ROLES = Set.of("root", "superadmin");
    private final JdbcTemplate jdbcTemplate;
    private final KioskRegistryService registry;
    private final KioskAdapterRegistry adapterRegistry;
    private final KioskEngineFeatureFlags featureFlags;
    private final KioskSessionService sessions;
    private final KioskEmployeeAccessService employeeAccess;
    private final KioskActionDispatcher dispatcher;

    public KioskMultiDashboardService(
            JdbcTemplate jdbcTemplate,
            KioskRegistryService registry,
            KioskAdapterRegistry adapterRegistry,
            KioskEngineFeatureFlags featureFlags,
            KioskSessionService sessions,
            KioskEmployeeAccessService employeeAccess,
            KioskActionDispatcher dispatcher) {
        this.jdbcTemplate = jdbcTemplate;
        this.registry = registry;
        this.adapterRegistry = adapterRegistry;
        this.featureFlags = featureFlags;
        this.sessions = sessions;
        this.employeeAccess = employeeAccess;
        this.dispatcher = dispatcher;
    }

    public List<Map<String, Object>> list(AuthSessionUser user) {
        var moduleAccess = moduleAccess(user);
        return registry.list(user.companyId()).stream()
            .filter(definition -> definition.effectiveStatus(java.time.Instant.now()).operational())
            .filter(definition -> employeeAccess.isEmployeeEligible(user.companyId(), definition.id()))
            .filter(definition -> featureFlags.adapterEnabled(definition.ownerModule()))
            .filter(definition -> moduleAccess.allModules()
                || moduleAccess.slugs().contains(moduleSlug(definition.ownerModule())))
            .filter(definition -> scopeAllows(user, definition))
            .filter(this::hasEnabledCapability)
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
        var definitionCapabilities = adapter.capabilities(definition);
        registry.synchronizeCapabilities(definition, definitionCapabilities);
        var capabilities = definitionCapabilities.stream()
            .filter(descriptor -> registry.capabilityEnabled(definition.id(), descriptor))
            .map(KioskCapabilityDescriptor::versionedKey)
            .collect(Collectors.toUnmodifiableSet());
        var launch = sessions.createAuthenticatedIndexSession(
            definition, user.userId(), browserSessionReference, capabilities);
        var data = new LinkedHashMap<String, Object>();
        data.put("kiosk_session_id", launch.session().sessionId());
        data.put("kiosk_session_token", launch.accessToken());
        data.put("expires_at", launch.session().expiresAt().toString());
        data.put("granted_capabilities", launch.session().grantedCapabilities());
        data.put("experience_status", adapter.supportsEmployeeCenter(definition)
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
        requireAllowed(user, kioskDefinitionId);
        if (user.userCompanyId() == null) throw new KioskUnavailableException();
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var definitionCapabilities = adapter.capabilities(definition);
        registry.synchronizeCapabilities(definition, definitionCapabilities);
        var capabilities = definitionCapabilities.stream()
            .filter(descriptor -> registry.capabilityEnabled(definition.id(), descriptor))
            .map(KioskCapabilityDescriptor::versionedKey)
            .collect(Collectors.toUnmodifiableSet());
        var launch = sessions.createMobileMultiKioskSession(
            definition, multiKioskId, user.userId(), user.userCompanyId(),
            browserSessionReference, capabilities);
        var data = new LinkedHashMap<String, Object>();
        data.put("kiosk_session_id", launch.session().sessionId());
        data.put("kiosk_session_token", launch.accessToken());
        data.put("expires_at", launch.session().expiresAt().toString());
        data.put("granted_capabilities", launch.session().grantedCapabilities());
        data.put("experience_status", adapter.supportsEmployeeCenter(definition)
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
        var result = new LinkedHashMap<String, Object>();
        result.put("kiosk", card(definition));
        result.put("session", Map.of(
            "id", principal.sessionId(),
            "expires_at", principal.expiresAt().toString(),
            "capabilities", principal.grantedCapabilities()
        ));
        if (!adapter.supportsEmployeeCenter(definition)) {
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
        requireAllowed(user, kioskDefinitionId);
        if (user.userCompanyId() == null) throw new KioskUnavailableException();
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var principal = sessions.requireMobileMultiKioskSession(
            definition, multiKioskId, accessToken, browserSessionReference,
            user.userId(), user.userCompanyId());
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var result = new LinkedHashMap<String, Object>();
        result.put("kiosk", card(definition));
        result.put("session", Map.of(
            "id", principal.sessionId(),
            "expires_at", principal.expiresAt().toString(),
            "capabilities", principal.grantedCapabilities()
        ));
        if (!adapter.supportsEmployeeCenter(definition)) {
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
        if (!adapter.supportsEmployeeCenter(definition)) {
            throw new UnsupportedOperationException(
                "This kiosk requires its module-specific verification step.");
        }
        sessions.requireAuthenticatedIndexSession(
            definition, accessToken, browserSessionReference, user.userId());
        var parsed = parseCapability(versionedCapability);
        var normalized = new LinkedHashMap<String, Object>(payload == null ? Map.of() : payload);
        normalized.put("kiosk_session_token", accessToken);
        var resourceId = number(normalized.get("resource_id"));
        return dispatcher.dispatchWithMetadata(
            authenticatedContext(definition, browserSessionReference).resolved(definition, null),
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
        requireAllowed(user, kioskDefinitionId);
        if (user.userCompanyId() == null) throw new KioskUnavailableException();
        var definition = registry.requireById(user.companyId(), kioskDefinitionId);
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        if (!adapter.supportsEmployeeCenter(definition)) {
            throw new UnsupportedOperationException(
                "Este kiosco requiere su verificación especializada antes de operar.");
        }
        var principal = sessions.requireMobileMultiKioskSession(
            definition, multiKioskId, accessToken, browserSessionReference,
            user.userId(), user.userCompanyId());
        var parsed = parseCapability(versionedCapability);
        if (!principal.grantedCapabilities().contains(versionedCapability)) {
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

    private KioskExecutionContext authenticatedContext(
            KioskResolvedDefinition definition,
            String browserSessionReference) {
        return new KioskExecutionContext(
            definition.ownerModule(), "AUTHENTICATED_WEB", "definition:" + definition.id(),
            "internal", browserSessionReference);
    }

    private KioskExecutionContext mobileContext(
            KioskResolvedDefinition definition,
            String browserSessionReference) {
        return new KioskExecutionContext(
            definition.ownerModule(), "MOBILE_MULTI_KIOSK", "definition:" + definition.id(),
            "mobile", browserSessionReference);
    }

    private ParsedCapability parseCapability(String value) {
        var normalized = value == null ? "" : value.trim();
        var marker = normalized.lastIndexOf("@v");
        if (marker <= 0 || marker + 2 >= normalized.length()) {
            throw new IllegalArgumentException("Versioned kiosk capability is required.");
        }
        try {
            return new ParsedCapability(
                normalized.substring(0, marker),
                Integer.parseInt(normalized.substring(marker + 2)));
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

    private boolean hasEnabledCapability(KioskResolvedDefinition definition) {
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var definitionCapabilities = adapter.capabilities(definition);
        registry.synchronizeCapabilities(definition, definitionCapabilities);
        return definitionCapabilities.stream()
            .anyMatch(capability -> registry.capabilityEnabled(definition.id(), capability));
    }

    private boolean scopeAllows(AuthSessionUser user, KioskResolvedDefinition definition) {
        return hasExplicitGrant(user, definition) && organizationScopeAllows(user, definition);
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
                SELECT (
                    EXISTS(
                        SELECT 1 FROM kiosk_grants
                        WHERE kiosk_definition_id = ? AND status = 'ACTIVE'
                          AND ((identity_type = 'USER' AND identity_id = ?)
                            OR (identity_type = 'EMPLOYEE' AND identity_id = ?))
                    ) OR EXISTS(
                        SELECT 1
                        FROM multi_kiosk_items item
                        INNER JOIN multi_kiosk_definitions parent
                          ON parent.id = item.multi_kiosk_id
                         AND parent.company_id = ?
                         AND parent.status = 'ACTIVE'
                         AND (parent.expires_at IS NULL OR parent.expires_at > CURRENT_TIMESTAMP)
                        INNER JOIN multi_kiosk_assignments assignment
                          ON assignment.multi_kiosk_id = parent.id
                         AND assignment.status = 'ACTIVE'
                        WHERE item.kiosk_definition_id = ?
                          AND assignment.user_company_id = ?
                    )
                )
                """,
            Integer.class,
            definition.id(), user.userId(), user.userCompanyId() == null ? -1L : user.userCompanyId(),
            user.companyId(), definition.id(), user.userCompanyId() == null ? -1L : user.userCompanyId()
        );
        return count != null && count > 0;
    }

    private ModuleAccess moduleAccess(AuthSessionUser user) {
        var role = normalizeRole(user.role());
        if (FULL_MODULE_ACCESS_ROLES.contains(role)) {
            return new ModuleAccess(true, Set.of());
        }
        var userCompanyId = user.userCompanyId();
        if (userCompanyId == null) {
            userCompanyId = jdbcTemplate.query(
                """
                    SELECT id FROM user_companies
                    WHERE company_id = ? AND user_id = ?
                      AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                    ORDER BY id DESC LIMIT 1
                    """,
                (rs, rowNum) -> rs.getLong("id"), user.companyId(), user.userId()
            ).stream().findFirst().orElse(null);
        }
        if (userCompanyId == null) {
            return new ModuleAccess(false, Set.of());
        }
        var slugs = jdbcTemplate.query(
            "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ?",
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")),
            userCompanyId
        );
        return new ModuleAccess(false, Set.copyOf(slugs));
    }

    private Map<String, Object> card(KioskResolvedDefinition definition) {
        var card = new LinkedHashMap<String, Object>();
        card.put("id", definition.id());
        card.put("name", definition.name());
        card.put("module", definition.ownerModule());
        card.put("module_slug", KioskEmployeeAccessService.moduleSlug(definition.ownerModule()));
        card.put("kiosk_type", definition.kioskType());
        card.put("purpose", purpose(definition.ownerModule()));
        card.put("scope", Map.of(
            "unit_id", definition.unitId() == null ? "" : definition.unitId(),
            "business_id", definition.businessId() == null ? "" : definition.businessId()
        ));
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        card.put("availability", adapter.supportsEmployeeCenter(definition)
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

    private String moduleSlug(String ownerModule) {
        return switch (ownerModule) {
            case "PROCESS_TASKS" -> "processes";
            case "PETTY_CASH" -> "petty_cash";
            case "HUMAN_RESOURCES" -> "human_resources";
            case "EXPENSES" -> "expenses";
            default -> ModuleSlugNormalizer.normalize(ownerModule);
        };
    }

    private String normalizeRole(String role) {
        var value = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(value) ? "superadmin" : value;
    }

    private record ModuleAccess(boolean allModules, Set<String> slugs) {
    }

    private record ParsedCapability(String key, int version) {
    }

    private record OrganizationScope(Long unitId, Long businessId) {
    }
}
