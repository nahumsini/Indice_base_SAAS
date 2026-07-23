package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskBrowserSessionReference;
import com.indice.erp.kiosk.engine.KioskClientNetworkSignal;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Compatibility gateway: legacy RH URLs now execute through Kiosk Engine v2. */
@Service
public class AttendancePublicKioskEngineGateway {

    private final AttendanceKioskAdapter adapter;
    private final KioskActionDispatcher dispatcher;
    private final KioskRegistryService registry;
    private final KioskRateLimitService rateLimit;
    private final KioskBrowserSessionReference browserSessionReference;
    private final SessionCsrfService csrf;
    private final KioskEngineFeatureFlags flags;

    public AttendancePublicKioskEngineGateway(
            AttendanceKioskAdapter adapter,
            KioskActionDispatcher dispatcher,
            KioskRegistryService registry,
            KioskRateLimitService rateLimit,
            KioskBrowserSessionReference browserSessionReference,
            SessionCsrfService csrf,
            KioskEngineFeatureFlags flags) {
        this.adapter = adapter;
        this.dispatcher = dispatcher;
        this.registry = registry;
        this.rateLimit = rateLimit;
        this.browserSessionReference = browserSessionReference;
        this.csrf = csrf;
        this.flags = flags;
    }

    public Map<String, Object> bootstrap(
            String token, HttpServletRequest request, HttpSession browserSession) {
        requireEnabled();
        var definition = registry.resolvePublic(AttendanceKioskCapabilities.OWNER_MODULE, token);
        var context = context(token, request, browserSession).resolved(definition, null);
        rateLimit.requireAllowed(KioskRateLimitType.BOOTSTRAP, context, Map.of());
        registry.synchronizeCapabilities(definition, adapter.capabilities());
        var response = new LinkedHashMap<>(adapter.bootstrap(context));
        response.put("csrfToken", csrf.ensureCsrf(browserSession));
        response.put("accessLevel", definition.accessLevel().name());
        response.put("configurationVersion", definition.configurationVersion());
        return response;
    }

    public Map<String, Object> identify(
            String token,
            String csrfToken,
            Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession browserSession) {
        requireCsrf(browserSession, csrfToken);
        var normalized = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        normalized.putIfAbsent("auth_method", "pin");
        if (!normalized.containsKey("credential_payload") && normalized.containsKey("pin")) {
            normalized.put("credential_payload", normalized.get("pin"));
        }
        return execute(token, request, browserSession, AttendanceKioskCapabilities.IDENTITY_VERIFY,
            null, normalized, null);
    }

    public Map<String, Object> executeMutation(
            String token,
            String csrfToken,
            String idempotencyKey,
            String capability,
            Long resourceId,
            Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession browserSession) {
        requireCsrf(browserSession, csrfToken);
        return execute(token, request, browserSession, capability, resourceId, payload,
            compatibleKey(idempotencyKey));
    }

    private Map<String, Object> execute(
            String token,
            HttpServletRequest request,
            HttpSession browserSession,
            String capability,
            Long resourceId,
            Map<String, Object> payload,
            String idempotencyKey) {
        requireEnabled();
        var action = resourceId == null
            ? KioskActionRequest.of(capability, payload)
            : KioskActionRequest.forResource(capability, resourceId, payload);
        return dispatcher.dispatch(context(token, request, browserSession), action, idempotencyKey);
    }

    private KioskExecutionContext context(
            String token, HttpServletRequest request, HttpSession browserSession) {
        var networkSignal = KioskClientNetworkSignal.from(request);
        return KioskExecutionContext.publicLink(
            AttendanceKioskCapabilities.OWNER_MODULE, token, networkSignal,
            browserSessionReference.resolve(browserSession));
    }

    private void requireCsrf(HttpSession session, String value) {
        try {
            csrf.requireCsrf(session, value);
        } catch (IllegalArgumentException failure) {
            throw new SecurityException("Kiosk browser validation failed.");
        }
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.sessionsEnabled() || !flags.auditEnabled()
                || !flags.adapterEnabled(AttendanceKioskCapabilities.OWNER_MODULE)) {
            throw new KioskUnavailableException();
        }
    }

    private String compatibleKey(String value) {
        return value == null || value.isBlank() ? "legacy-" + UUID.randomUUID() : value.trim();
    }
}
