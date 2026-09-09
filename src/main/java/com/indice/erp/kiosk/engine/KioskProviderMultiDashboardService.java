package com.indice.erp.kiosk.engine;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Safe launcher boundary for one provider authenticated by the company Provider Center. */
@Service
public class KioskProviderMultiDashboardService {

    private final JdbcTemplate jdbcTemplate;
    private final KioskRegistryService registry;
    private final KioskAdapterRegistry adapters;
    private final KioskProviderToolCatalogService tools;
    private final ProviderCenterAccessPolicy providerAccess;
    private final KioskSessionService sessions;
    private final KioskActionDispatcher dispatcher;

    public KioskProviderMultiDashboardService(
            JdbcTemplate jdbcTemplate,
            KioskRegistryService registry,
            KioskAdapterRegistry adapters,
            KioskProviderToolCatalogService tools,
            ProviderCenterAccessPolicy providerAccess,
            KioskSessionService sessions,
            KioskActionDispatcher dispatcher) {
        this.jdbcTemplate = jdbcTemplate;
        this.registry = registry;
        this.adapters = adapters;
        this.tools = tools;
        this.providerAccess = providerAccess;
        this.sessions = sessions;
        this.dispatcher = dispatcher;
    }

    public List<Map<String, Object>> listForMultiKiosk(
            long companyId, long multiKioskId, long providerId) {
        if (companyId <= 0 || multiKioskId <= 0 || providerId <= 0
                || !providerAccess.hasAccess(companyId, providerId)) {
            return List.of();
        }
        return orderedDefinitionIds(companyId, multiKioskId).stream()
            .map(id -> candidate(companyId, providerId, id))
            .filter(java.util.Objects::nonNull)
            .map(this::card)
            .toList();
    }

    @Transactional
    public Map<String, Object> createSession(
            long companyId,
            long multiKioskId,
            long providerId,
            long kioskDefinitionId,
            String browserSessionReference) {
        var candidate = requireAllowed(companyId, multiKioskId, providerId, kioskDefinitionId);
        var capabilities = enabledCapabilities(candidate);
        if (capabilities.isEmpty()) throw new KioskUnavailableException();
        var launch = sessions.createProviderMultiKioskSession(
            candidate.definition(), multiKioskId, providerId, browserSessionReference, capabilities);
        return Map.of(
            "kiosk_session_id", launch.session().sessionId(),
            "kiosk_session_token", launch.accessToken(),
            "expires_at", launch.session().expiresAt().toString(),
            "granted_capabilities", launch.session().grantedCapabilities(),
            "experience_status", "READY",
            "workspace", Map.of(
                "channel", KioskExecutionChannels.PROVIDER_MULTI_KIOSK,
                "kiosk_definition_id", candidate.definition().id(),
                "owner_module", candidate.definition().ownerModule(),
                "kiosk_type", candidate.definition().kioskType()));
    }

    @Transactional
    public Map<String, Object> workspace(
            long companyId,
            long multiKioskId,
            long providerId,
            long kioskDefinitionId,
            String accessToken,
            String browserSessionReference) {
        var candidate = requireAllowed(companyId, multiKioskId, providerId, kioskDefinitionId);
        var principal = sessions.requireProviderMultiKioskSession(
            candidate.definition(), multiKioskId, accessToken, browserSessionReference, providerId);
        var result = new LinkedHashMap<String, Object>();
        result.put("kiosk", card(candidate));
        result.put("session", Map.of(
            "id", principal.sessionId(),
            "expires_at", principal.expiresAt().toString(),
            "capabilities", principal.grantedCapabilities()));
        result.put("experience_status", "READY");
        result.put("bootstrap", candidate.adapter().providerBootstrap(
            providerContext(candidate.definition(), browserSessionReference)
                .resolved(candidate.definition(), principal)));
        return Map.copyOf(result);
    }

    @Transactional
    public KioskDispatchResult executeAction(
            long companyId,
            long multiKioskId,
            long providerId,
            long kioskDefinitionId,
            String versionedCapability,
            String accessToken,
            String browserSessionReference,
            Map<String, Object> payload,
            String idempotencyKey) {
        var candidate = requireAllowed(companyId, multiKioskId, providerId, kioskDefinitionId);
        var parsed = parseCapability(versionedCapability);
        var allowed = enabledCapabilities(candidate);
        if (!allowed.contains(parsed.versionedKey())) throw new KioskUnavailableException();
        var principal = sessions.requireProviderMultiKioskSession(
            candidate.definition(), multiKioskId, accessToken, browserSessionReference, providerId);
        if (!principal.grantedCapabilities().contains(parsed.versionedKey())) {
            throw new SecurityException("Provider capability is not granted.");
        }
        var normalized = new LinkedHashMap<String, Object>(payload == null ? Map.of() : payload);
        normalized.put("kiosk_session_token", accessToken);
        var resourceId = number(normalized.get("resource_id"));
        return dispatcher.dispatchWithMetadata(
            providerContext(candidate.definition(), browserSessionReference)
                .resolved(candidate.definition(), principal),
            new KioskActionRequest(parsed.key(), parsed.version(), resourceId, normalized),
            idempotencyKey);
    }

    private ProviderCandidate requireAllowed(
            long companyId, long multiKioskId, long providerId, long kioskDefinitionId) {
        if (!orderedDefinitionIds(companyId, multiKioskId).contains(kioskDefinitionId)) {
            throw new KioskUnavailableException();
        }
        var candidate = candidate(companyId, providerId, kioskDefinitionId);
        if (candidate == null) throw new KioskUnavailableException();
        return candidate;
    }

    private ProviderCandidate candidate(long companyId, long providerId, long definitionId) {
        try {
            var definition = registry.requireById(companyId, definitionId);
            if (!definition.effectiveStatus(java.time.Instant.now()).operational()
                    || tools.manifestFor(definition).isEmpty()) return null;
            var adapter = adapters.requireAdapter(definition.ownerModule());
            if (!adapter.supportsProviderCenter(definition)
                    || !providerAccess.hasAccess(companyId, providerId)) return null;
            registry.synchronizeCapabilities(definition, adapter.capabilities(definition));
            var candidate = new ProviderCandidate(definition, adapter, tools.manifestFor(definition).orElseThrow());
            return enabledCapabilities(candidate).isEmpty() ? null : candidate;
        } catch (RuntimeException unavailable) {
            return null;
        }
    }

    private Set<String> enabledCapabilities(ProviderCandidate candidate) {
        var advertised = candidate.manifest().capabilities();
        return candidate.adapter().capabilities(candidate.definition()).stream()
            .filter(descriptor -> advertised.contains(descriptor.versionedKey()))
            .filter(descriptor -> registry.capabilityEnabled(candidate.definition().id(), descriptor))
            .map(KioskCapabilityDescriptor::versionedKey)
            .collect(Collectors.toUnmodifiableSet());
    }

    private List<Long> orderedDefinitionIds(long companyId, long multiKioskId) {
        return jdbcTemplate.query(
            """
                SELECT item.kiosk_definition_id
                FROM multi_kiosk_items item
                INNER JOIN multi_kiosk_definitions parent
                  ON parent.id = item.multi_kiosk_id
                 AND parent.company_id = ?
                 AND parent.audience_type = 'PROVIDER'
                 AND parent.status = 'ACTIVE'
                 AND (parent.expires_at IS NULL OR parent.expires_at > CURRENT_TIMESTAMP)
                WHERE item.multi_kiosk_id = ?
                ORDER BY item.sort_order, item.kiosk_definition_id
                """,
            (rs, rowNum) -> rs.getLong("kiosk_definition_id"),
            companyId, multiKioskId);
    }

    private Map<String, Object> card(ProviderCandidate candidate) {
        var definition = candidate.definition();
        var tool = candidate.manifest();
        return Map.of(
            "id", definition.id(),
            "tool_key", tool.toolKey(),
            "name", tool.name(),
            "module", definition.ownerModule(),
            "module_slug", tool.moduleSlug(),
            "kiosk_type", definition.kioskType(),
            "workspace_kind", tool.workspaceKind(),
            "purpose", tool.description(),
            "availability", "AVAILABLE",
            "primary_action", "OPEN");
    }

    private KioskExecutionContext providerContext(
            KioskResolvedDefinition definition, String browserSessionReference) {
        return new KioskExecutionContext(
            definition.ownerModule(), KioskExecutionChannels.PROVIDER_MULTI_KIOSK,
            "definition:" + definition.id(), "provider-center", browserSessionReference);
    }

    private ParsedCapability parseCapability(String value) {
        var normalized = value == null ? "" : value.trim();
        var marker = normalized.lastIndexOf('@');
        if (marker <= 0 || marker == normalized.length() - 1) {
            throw new IllegalArgumentException("Versioned kiosk capability is required.");
        }
        var version = normalized.substring(marker + 1);
        if (version.startsWith("v")) version = version.substring(1);
        try {
            return new ParsedCapability(normalized.substring(0, marker), Integer.parseInt(version));
        } catch (NumberFormatException invalid) {
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

    private record ProviderCandidate(
        KioskResolvedDefinition definition,
        KioskModuleAdapter adapter,
        KioskProviderToolCatalogService.ProviderToolManifest manifest) {}

    private record ParsedCapability(String key, int version) {
        String versionedKey() { return key + "@" + version; }
    }
}
