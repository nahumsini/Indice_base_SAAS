package com.indice.erp.pos.customerdisplay;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskClientNetworkSignal;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairRequest;
import com.indice.erp.pos.kiosk.PointOfSaleKioskAdapter;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Strangler gateway that keeps v1 URLs while applying Kiosk Engine v2 controls. */
@Service
public class CustomerDisplayKioskGateway {

    private final CustomerDisplayService service;
    private final CustomerDisplayAuditService audit;
    private final PointOfSaleKioskAdapter adapter;
    private final KioskActionDispatcher dispatcher;
    private final KioskRegistryService registry;
    private final KioskRateLimitService rateLimit;
    private final SessionCsrfService csrf;
    private final KioskEngineFeatureFlags flags;

    public CustomerDisplayKioskGateway(
            CustomerDisplayService service,
            CustomerDisplayAuditService audit,
            PointOfSaleKioskAdapter adapter,
            KioskActionDispatcher dispatcher,
            KioskRegistryService registry,
            KioskRateLimitService rateLimit,
            SessionCsrfService csrf,
            KioskEngineFeatureFlags flags) {
        this.service = service;
        this.audit = audit;
        this.adapter = adapter;
        this.dispatcher = dispatcher;
        this.registry = registry;
        this.rateLimit = rateLimit;
        this.csrf = csrf;
        this.flags = flags;
    }

    public Map<String, Object> pairingBootstrap(
            HttpServletRequest request,
            HttpSession session) {
        requireEnabled();
        var context = pairingContext(request, session);
        rateLimit.requireAllowed(KioskRateLimitType.BOOTSTRAP, context, Map.of());
        return Map.of(
            "csrfToken", csrf.ensureCsrf(session),
            "status", "READY",
            "onlineOnly", true,
            "pairingCodeLength", 6
        );
    }

    public Map<String, Object> pair(
            CustomerDisplayPairRequest requestBody,
            String csrfToken,
            String idempotencyKey,
            HttpServletRequest request,
            HttpSession session) {
        requireEnabled();
        requireCsrf(session, csrfToken);
        rateLimit.requireAllowed(
            KioskRateLimitType.DEVICE_PAIRING, pairingContext(request, session), Map.of());
        try {
            var rawToken = service.publicTokenForPairingCode(requestBody.pairingCode());
            var definition = registry.resolvePublic(
                PointOfSaleKioskCapabilities.OWNER_MODULE, rawToken);
            requireCustomerDisplay(definition.kioskType());
            var payload = new LinkedHashMap<String, Object>();
            payload.put("pairing_code", requestBody.pairingCode());
            if (requestBody.deviceName() != null) {
                payload.put("device_name", requestBody.deviceName());
            }
            return dispatcher.dispatch(
                publicContext(rawToken, request, session),
                KioskActionRequest.of(
                    PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_PAIR, payload),
                requireIdempotencyKey(idempotencyKey)
            );
        } catch (KioskUnavailableException | SecurityException failure) {
            throw PosApiException.notFound("Pairing code expired or not found.");
        }
    }

    public Map<String, Object> state(
            String deviceToken,
            HttpServletRequest request,
            HttpSession session) {
        requireEnabled();
        try {
            var definition = registry.resolvePublic(
                PointOfSaleKioskCapabilities.OWNER_MODULE, deviceToken);
            requireCustomerDisplay(definition.kioskType());
            var context = publicContext(deviceToken, request, session).resolved(definition, null);
            rateLimit.requireAllowed(KioskRateLimitType.QUERY, context, Map.of());
            var capabilities = adapter.capabilities(definition);
            registry.synchronizeCapabilities(definition, capabilities);
            var action = KioskActionRequest.of(
                PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_STATE_READ, Map.of());
            adapter.authorize(context, action).requireAllowed();
            adapter.validate(context, action).requireValid();
            var response = adapter.execute(context, action);
            var device = service.requireActiveDevice(deviceToken);
            if (service.claimConnectionAudit(device.id())) {
                audit.recordConnection(context, device);
            }
            return response;
        } catch (KioskUnavailableException | SecurityException failure) {
            throw PosApiException.notFound("Customer display not found.");
        }
    }

    private KioskExecutionContext publicContext(
            String accessReference,
            HttpServletRequest request,
            HttpSession session) {
        return KioskExecutionContext.publicLink(
            PointOfSaleKioskCapabilities.OWNER_MODULE,
            accessReference,
            networkSignal(request),
            session.getId()
        );
    }

    private KioskExecutionContext pairingContext(
            HttpServletRequest request,
            HttpSession session) {
        return KioskExecutionContext.publicLink(
            PointOfSaleKioskCapabilities.OWNER_MODULE,
            "customer-display-pairing",
            networkSignal(request),
            session.getId()
        );
    }

    private String networkSignal(HttpServletRequest request) {
        return KioskClientNetworkSignal.from(request);
    }

    private void requireCsrf(HttpSession session, String csrfToken) {
        try {
            csrf.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException failure) {
            throw PosApiException.forbidden("Kiosk browser validation failed.");
        }
    }

    private String requireIdempotencyKey(String value) {
        if (value == null || value.isBlank()) {
            throw PosApiException.badRequest("Idempotency-Key is required.");
        }
        return value.trim();
    }

    private void requireCustomerDisplay(String kioskType) {
        if (!PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(kioskType)) {
            throw new KioskUnavailableException();
        }
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.sessionsEnabled() || !flags.auditEnabled()
                || !flags.adapterEnabled(PointOfSaleKioskCapabilities.OWNER_MODULE)) {
            throw PosApiException.notFound("Customer display not found.");
        }
    }
}
