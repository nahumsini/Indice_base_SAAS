package com.indice.erp.kiosk.api;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAdapterRegistry;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskClientNetworkSignal;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/kiosks/public/{token}")
public class KioskPublicV2Controller {

    private static final String CHALLENGE_ATTRIBUTE = "kiosk.v2.challenge.";
    private static final long CHALLENGE_TTL_SECONDS = 300;
    private final KioskRegistryService kioskRegistry;
    private final KioskAdapterRegistry adapterRegistry;
    private final KioskActionDispatcher dispatcher;
    private final KioskRateLimitService rateLimitService;
    private final SessionCsrfService csrfService;
    private final KioskEngineFeatureFlags featureFlags;
    private final KioskV2ResponseFactory responses;
    private final CommercialLifecycleAccessService commercialAccess;

    public KioskPublicV2Controller(
            KioskRegistryService kioskRegistry,
            KioskAdapterRegistry adapterRegistry,
            KioskActionDispatcher dispatcher,
            KioskRateLimitService rateLimitService,
            SessionCsrfService csrfService,
            KioskEngineFeatureFlags featureFlags,
            KioskV2ResponseFactory responses,
            CommercialLifecycleAccessService commercialAccess) {
        this.kioskRegistry = kioskRegistry;
        this.adapterRegistry = adapterRegistry;
        this.dispatcher = dispatcher;
        this.rateLimitService = rateLimitService;
        this.csrfService = csrfService;
        this.featureFlags = featureFlags;
        this.responses = responses;
        this.commercialAccess = commercialAccess;
    }

    @GetMapping("/bootstrap")
    public Map<String, Object> bootstrap(
            @PathVariable String token,
            HttpServletRequest request,
            HttpSession session) {
        var resolved = resolvedForBootstrap(token, request);
        commercialAccess.requireRead(resolved.definition().companyId());
        rateLimitService.requireAllowed(KioskRateLimitType.BOOTSTRAP, resolved.context(), Map.of());
        var adapter = adapterRegistry.requireAdapter(resolved.definition().ownerModule());
        kioskRegistry.synchronizeCapabilities(
            resolved.definition(), adapter.capabilities(resolved.definition()));
        var data = new LinkedHashMap<>(adapter.bootstrap(resolved.context()));
        data.put("csrfToken", csrfService.ensureCsrf(session));
        data.put("accessLevel", resolved.definition().accessLevel().name());
        data.put("configurationVersion", resolved.definition().configurationVersion());
        data.put("adapterVersion", resolved.definition().adapterVersion());
        return responses.success(data, null, null);
    }

    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(
            @PathVariable String token,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            HttpServletRequest request,
            HttpSession session) {
        requireCsrf(session, csrfToken);
        var resolved = resolved(token, request);
        commercialAccess.requireRead(resolved.definition().companyId());
        rateLimitService.requireAllowed(KioskRateLimitType.QUERY, resolved.context(), Map.of());
        var challengeId = UUID.randomUUID().toString();
        session.setAttribute(
            CHALLENGE_ATTRIBUTE + challengeId,
            new long[] {resolved.definition().id(), Instant.now().plusSeconds(CHALLENGE_TTL_SECONDS).getEpochSecond()}
        );
        var availableFactors = switch (resolved.definition().accessLevel()) {
            case PUBLIC -> List.<String>of();
            case IDENTIFIED -> List.of("IDENTIFICATION");
            case VERIFIED -> List.of("EMAIL_OTP");
            case CONTROLLED -> List.of("PIN");
        };
        var data = Map.of(
            "sessionId", challengeId,
            "status", availableFactors.isEmpty() ? "READY" : "IDENTIFICATION_REQUIRED",
            "accessLevel", resolved.definition().accessLevel().name(),
            "availableFactors", availableFactors
        );
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(responses.success(data, challengeId, null));
    }

    @PostMapping("/sessions/{sessionId}/verify-pin")
    public Map<String, Object> verifyPin(
            @PathVariable String token,
            @PathVariable String sessionId,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession browserSession) {
        requireCsrf(browserSession, csrfToken);
        var resolved = resolved(token, request);
        commercialAccess.requireRead(resolved.definition().companyId());
        requireChallenge(browserSession, sessionId, resolved.definition().id());
        var adapter = adapterRegistry.requireAdapter(resolved.definition().ownerModule());
        var capability = adapter.capabilities(resolved.definition()).stream()
            .filter(candidate -> candidate.key().endsWith(".identity.verify"))
            .findFirst()
            .orElseThrow(() -> new UnsupportedOperationException("PIN verification is not available."));
        var normalized = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        normalized.put("auth_method", "pin");
        if (!normalized.containsKey("credential_payload") && normalized.containsKey("pin")) {
            normalized.put("credential_payload", normalized.get("pin"));
        }
        var result = dispatcher.dispatchWithMetadata(
            resolved.context(),
            new KioskActionRequest(capability.key(), capability.version(), null, normalized),
            idempotencyKey
        );
        browserSession.removeAttribute(CHALLENGE_ATTRIBUTE + sessionId);
        return responses.success(result.data(), result.kioskSessionId(), result.versionedCapability());
    }

    @PostMapping("/sessions/{sessionId}/verify-email")
    public void verifyEmail() {
        throw new UnsupportedOperationException("Email verification is not available for this kiosk.");
    }

    @PostMapping("/sessions/{sessionId}/face-verifications")
    public Map<String, Object> verifyFace(
            @PathVariable String token,
            @PathVariable String sessionId,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession browserSession) {
        requireCsrf(browserSession, csrfToken);
        var resolved = resolved(token, request);
        commercialAccess.requireRead(resolved.definition().companyId());
        var adapter = adapterRegistry.requireAdapter(resolved.definition().ownerModule());
        var capability = adapter.capabilities(resolved.definition()).stream()
            .filter(candidate -> candidate.key().endsWith(".face.verification.begin"))
            .findFirst()
            .orElseThrow(() -> new UnsupportedOperationException(
                "Face verification is not available for this kiosk."));
        var normalized = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        normalized.put("expected_session_id", sessionId);
        var result = dispatcher.dispatchWithMetadata(
            resolved.context(),
            new KioskActionRequest(
                capability.key(), capability.version(), null,
                normalized),
            idempotencyKey);
        if (result.kioskSessionId() == null || !sessionId.equals(result.kioskSessionId())) {
            throw new SecurityException("Kiosk session is not valid.");
        }
        return responses.success(result.data(), result.kioskSessionId(), result.versionedCapability());
    }

    @GetMapping("/capabilities")
    public Map<String, Object> capabilities(@PathVariable String token, HttpServletRequest request, HttpSession session) {
        var resolved = resolved(token, request);
        commercialAccess.requireRead(resolved.definition().companyId());
        rateLimitService.requireAllowed(KioskRateLimitType.QUERY, resolved.context(), Map.of());
        var adapter = adapterRegistry.requireAdapter(resolved.definition().ownerModule());
        var definitionCapabilities = adapter.capabilities(resolved.definition());
        kioskRegistry.synchronizeCapabilities(resolved.definition(), definitionCapabilities);
        var items = definitionCapabilities.stream()
            .filter(descriptor -> kioskRegistry.capabilityEnabled(resolved.definition().id(), descriptor))
            .map(this::capabilityMap)
            .toList();
        return responses.success(Map.of("items", items), null, null);
    }

    @PostMapping("/actions/{capabilityKey}")
    public Map<String, Object> executeAction(
            @PathVariable String token,
            @PathVariable String capabilityKey,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession session) {
        requireCsrf(session, csrfToken);
        var resolved = resolved(token, request);
        var parsed = parseCapability(capabilityKey);
        var descriptor = adapterRegistry.requireAdapter(resolved.definition().ownerModule())
            .capabilities(resolved.definition()).stream()
            .filter(candidate -> candidate.key().equals(parsed.key()) && candidate.version() == parsed.version())
            .findFirst()
            .orElseThrow(() -> new UnsupportedOperationException("Kiosk capability is not available."));
        if (descriptor.mutation()) commercialAccess.requireWrite(resolved.definition().companyId());
        else commercialAccess.requireRead(resolved.definition().companyId());
        var resourceId = number(payload == null ? null : payload.get("resource_id"));
        var result = dispatcher.dispatchWithMetadata(
            resolved.context(),
            new KioskActionRequest(parsed.key(), parsed.version(), resourceId, payload),
            idempotencyKey
        );
        return responses.success(result.data(), result.kioskSessionId(), result.versionedCapability());
    }

    @PostMapping("/files/presign-upload")
    public Map<String, Object> presignFile(
            @PathVariable String token,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession session) {
        return executeFile(token, csrfToken, idempotencyKey, payload, request, session, ".presign");
    }

    @PostMapping("/files/register")
    public Map<String, Object> registerFile(
            @PathVariable String token,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession session) {
        return executeFile(token, csrfToken, idempotencyKey, payload, request, session, ".register");
    }

    private Map<String, Object> executeFile(
            String token,
            String csrfToken,
            String idempotencyKey,
            Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession session,
            String capabilitySuffix) {
        requireCsrf(session, csrfToken);
        var resolved = resolved(token, request);
        commercialAccess.requireWrite(resolved.definition().companyId());
        var adapter = adapterRegistry.requireAdapter(resolved.definition().ownerModule());
        var capability = adapter.capabilities(resolved.definition()).stream()
            .filter(candidate -> candidate.key().endsWith(capabilitySuffix))
            .findFirst()
            .orElseThrow(() -> new UnsupportedOperationException("File operation is not available."));
        var resourceId = number(payload == null ? null : payload.get("resource_id"));
        var result = dispatcher.dispatchWithMetadata(
            resolved.context(),
            new KioskActionRequest(capability.key(), capability.version(), resourceId, payload),
            idempotencyKey
        );
        return responses.success(result.data(), result.kioskSessionId(), result.versionedCapability());
    }

    private ResolvedRequest resolved(String token, HttpServletRequest request) {
        if (!featureFlags.registryEnabled() || !featureFlags.sessionsEnabled() || !featureFlags.auditEnabled()) {
            throw new UnsupportedOperationException("Kiosk Engine v2 is not enabled.");
        }
        var definition = kioskRegistry.resolvePublic(token);
        if (!featureFlags.adapterEnabled(definition.ownerModule())) {
            throw new UnsupportedOperationException("Kiosk module adapter is not enabled.");
        }
        kioskRegistry.touchPresence(definition.id());
        return new ResolvedRequest(
            definition,
            context(definition.ownerModule(), token, request).resolved(definition, null));
    }

    private ResolvedRequest resolvedForBootstrap(String token, HttpServletRequest request) {
        if (!featureFlags.registryEnabled() || !featureFlags.sessionsEnabled() || !featureFlags.auditEnabled()) {
            throw new UnsupportedOperationException("Kiosk Engine v2 is not enabled.");
        }
        var definition = kioskRegistry.resolvePublicForBootstrap(token);
        if (!featureFlags.adapterEnabled(definition.ownerModule())) {
            throw new UnsupportedOperationException("Kiosk module adapter is not enabled.");
        }
        if (definition.effectiveStatus(Instant.now()).operational()) {
            kioskRegistry.touchPresence(definition.id());
        }
        return new ResolvedRequest(
            definition,
            context(definition.ownerModule(), token, request).resolved(definition, null));
    }

    private void requireCsrf(HttpSession session, String csrfToken) {
        try {
            csrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException failure) {
            throw new KioskCsrfException();
        }
    }

    private KioskExecutionContext context(
            String ownerModule,
            String token,
            HttpServletRequest request) {
        var session = request.getSession();
        var networkSignal = KioskClientNetworkSignal.from(request);
        return KioskExecutionContext.publicLink(ownerModule, token, networkSignal, session.getId());
    }

    private void requireChallenge(HttpSession session, String sessionId, long definitionId) {
        var value = session.getAttribute(CHALLENGE_ATTRIBUTE + sessionId);
        if (!(value instanceof long[] challenge)
                || challenge.length != 2
                || challenge[0] != definitionId
                || challenge[1] <= Instant.now().getEpochSecond()) {
            session.removeAttribute(CHALLENGE_ATTRIBUTE + sessionId);
            throw new SecurityException("Kiosk session is not valid.");
        }
    }

    private Map<String, Object> capabilityMap(KioskCapabilityDescriptor descriptor) {
        return Map.of(
            "key", descriptor.key(), "version", descriptor.version(),
            "versionedKey", descriptor.versionedKey(),
            "operationPolicy", descriptor.operationPolicy().name(),
            "accessLevel", descriptor.accessLevel().name(),
            "mutation", descriptor.mutation(), "sensitive", descriptor.sensitive()
        );
    }

    private ParsedCapability parseCapability(String value) {
        var separator = value.lastIndexOf('@');
        if (separator < 1) {
            return new ParsedCapability(value, 1);
        }
        try {
            return new ParsedCapability(value.substring(0, separator),
                Integer.parseInt(value.substring(separator + 1)));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Capability version is invalid.");
        }
    }

    private Long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? null : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("resource_id must be numeric.");
        }
    }

    private record ParsedCapability(String key, int version) {
        String versionedKey() {
            return key + "@" + version;
        }
    }

    private record ResolvedRequest(
            com.indice.erp.kiosk.engine.KioskResolvedDefinition definition,
            KioskExecutionContext context) {
    }
}
