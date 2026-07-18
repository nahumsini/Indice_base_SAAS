package com.indice.erp.kiosk.engine;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
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
    private final ProcessTaskAssignmentScopeService processTaskScope;

    public KioskMultiDashboardService(
            JdbcTemplate jdbcTemplate,
            KioskRegistryService registry,
            KioskAdapterRegistry adapterRegistry,
            KioskEngineFeatureFlags featureFlags,
            KioskSessionService sessions,
            ProcessTaskAssignmentScopeService processTaskScope) {
        this.jdbcTemplate = jdbcTemplate;
        this.registry = registry;
        this.adapterRegistry = adapterRegistry;
        this.featureFlags = featureFlags;
        this.sessions = sessions;
        this.processTaskScope = processTaskScope;
    }

    public List<Map<String, Object>> list(AuthSessionUser user) {
        var moduleAccess = moduleAccess(user);
        return registry.list(user.companyId()).stream()
            .filter(definition -> definition.effectiveStatus(java.time.Instant.now()).operational())
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
        data.put("workspace", Map.of(
            "channel", "AUTHENTICATED_WEB",
            "kiosk_definition_id", definition.id(),
            "owner_module", definition.ownerModule(),
            "kiosk_type", definition.kioskType(),
            "return_path", "/multi-kiosk"
        ));
        return Map.copyOf(data);
    }

    private boolean hasEnabledCapability(KioskResolvedDefinition definition) {
        var adapter = adapterRegistry.requireAdapter(definition.ownerModule());
        var definitionCapabilities = adapter.capabilities(definition);
        registry.synchronizeCapabilities(definition, definitionCapabilities);
        return definitionCapabilities.stream()
            .anyMatch(capability -> registry.capabilityEnabled(definition.id(), capability));
    }

    private boolean scopeAllows(AuthSessionUser user, KioskResolvedDefinition definition) {
        if ("PROCESS_TASKS".equals(definition.ownerModule())) {
            return processTaskScope.canAccessKioskScope(
                user.companyId(), user.userId(), definition.unitId(), definition.businessId());
        }
        return hasExplicitGrant(user, definition);
    }

    private boolean hasExplicitGrant(AuthSessionUser user, KioskResolvedDefinition definition) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM kiosk_grants
                WHERE kiosk_definition_id = ? AND status = 'ACTIVE'
                  AND ((identity_type = 'USER' AND identity_id = ?)
                    OR (identity_type = 'EMPLOYEE' AND identity_id = ?))
                """,
            Integer.class,
            definition.id(), user.userId(), user.userCompanyId() == null ? -1L : user.userCompanyId()
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
        card.put("kiosk_type", definition.kioskType());
        card.put("purpose", purpose(definition.ownerModule()));
        card.put("scope", Map.of(
            "unit_id", definition.unitId() == null ? "" : definition.unitId(),
            "business_id", definition.businessId() == null ? "" : definition.businessId()
        ));
        card.put("availability", "AVAILABLE");
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
}
