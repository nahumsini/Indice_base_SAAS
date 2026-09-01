package com.indice.erp.pos.purchaseorder.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskClientNetworkSignal;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskSessionService;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentRegisterRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalLoginRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.purchaseorder.PurchaseOrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Keeps the legacy POS URLs while executing every public operation through Engine v2. */
@Service
public class ProcurementSupplierPortalPublicGateway {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final String COMPAT_SESSION_ATTRIBUTE =
        ProcurementSupplierPortalPublicGateway.class.getName() + ".compatSession";
    private static final Duration COMPAT_INACTIVITY = Duration.ofMinutes(15);

    private final ProcurementSupplierPortalAdapter adapter;
    private final KioskActionDispatcher dispatcher;
    private final KioskRegistryService registry;
    private final KioskRateLimitService rateLimit;
    private final KioskSessionService sessions;
    private final SessionCsrfService csrf;
    private final KioskEngineFeatureFlags flags;
    private final PurchaseOrderService purchaseOrders;
    private final PurchaseOrderRepository repository;
    private final ObjectMapper objectMapper;
    private final ProcurementSupplierPortalIdentityService identities;

    public ProcurementSupplierPortalPublicGateway(
            ProcurementSupplierPortalAdapter adapter,
            KioskActionDispatcher dispatcher,
            KioskRegistryService registry,
            KioskRateLimitService rateLimit,
            KioskSessionService sessions,
            SessionCsrfService csrf,
            KioskEngineFeatureFlags flags,
            PurchaseOrderService purchaseOrders,
            PurchaseOrderRepository repository,
            ObjectMapper objectMapper,
            ProcurementSupplierPortalIdentityService identities) {
        this.adapter = adapter;
        this.dispatcher = dispatcher;
        this.registry = registry;
        this.rateLimit = rateLimit;
        this.sessions = sessions;
        this.csrf = csrf;
        this.flags = flags;
        this.purchaseOrders = purchaseOrders;
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.identities = identities;
    }

    public Map<String, Object> bootstrap(
            String portalCode,
            HttpServletRequest request,
            HttpSession browserSession) {
        if (!engineEnabled()) {
            return legacyBootstrap(portalCode, browserSession);
        }
        var definition = registry.resolvePublicForBootstrap(
            ProcurementSupplierPortalCapabilities.OWNER_MODULE, token(portalCode));
        var context = context(portalCode, request, browserSession).resolved(definition, null);
        rateLimit.requireAllowed(KioskRateLimitType.BOOTSTRAP, context, Map.of());
        registry.synchronizeCapabilities(definition, adapter.capabilities());
        var response = new LinkedHashMap<>(adapter.bootstrap(context));
        response.put("csrfToken", csrf.ensureCsrf(browserSession));
        response.put("configurationVersion", definition.configurationVersion());
        response.put("adapterVersion", definition.adapterVersion());
        return response;
    }

    public Map<String, Object> authenticate(
            String portalCode,
            String csrfToken,
            String idempotencyKey,
            String pin,
            HttpServletRequest request,
            HttpSession browserSession) {
        if (!engineEnabled()) {
            return legacyAuthenticate(portalCode, csrfToken, pin, browserSession);
        }
        requireCsrf(browserSession, csrfToken);
        var payload = Map.<String, Object>of(
            "pin", pin,
            "credential_payload", pin,
            "auth_method", "pin"
        );
        var result = dispatcher.dispatchWithMetadata(
            context(portalCode, request, browserSession),
            KioskActionRequest.of(ProcurementSupplierPortalCapabilities.IDENTITY_VERIFY, payload),
            blank(idempotencyKey)
        );
        var response = new LinkedHashMap<>(result.data());
        response.remove("engine_identity");
        if (response.get("context") instanceof Map<?, ?> legacyContext) {
            legacyContext.forEach((key, value) -> response.putIfAbsent(String.valueOf(key), value));
        }
        response.put("sessionId", result.kioskSessionId());
        response.put("kioskSessionId", result.kioskSessionId());
        response.put("sessionToken", response.get("kiosk_session_token"));
        response.put("kioskSessionToken", response.get("kiosk_session_token"));
        response.put("expiresAt", response.get("expires_at"));
        response.put("csrfToken", csrf.ensureCsrf(browserSession));
        return response;
    }

    public Map<String, Object> execute(
            String portalCode,
            String csrfToken,
            String idempotencyKey,
            String sessionToken,
            String legacyPin,
            String capability,
            Long resourceId,
            Map<String, Object> payload,
        HttpServletRequest request,
        HttpSession browserSession) {
        if (!engineEnabled()) {
            var normalizedLegacyPin = blank(legacyPin);
            if (blank(sessionToken) == null && normalizedLegacyPin != null) {
                return legacyExecute(portalCode, legacyPin, capability, payload);
            }
            requireCsrf(browserSession, csrfToken);
            var access = repository.findSupplierPortalAccessByCode(token(portalCode))
                .orElseThrow(KioskUnavailableException::new);
            requireCompatSession(access, sessionToken, browserSession);
            return legacySessionExecute(access, capability, payload);
        }
        requireCsrf(browserSession, csrfToken);
        var normalized = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        normalized.remove("pin");
        var effectiveSessionToken = blank(sessionToken);
        if (effectiveSessionToken == null && legacyPin != null && !legacyPin.isBlank()) {
            var authentication = authenticate(
                portalCode, csrfToken, null, legacyPin, request, browserSession);
            effectiveSessionToken = String.valueOf(authentication.get("kiosk_session_token"));
        }
        if (effectiveSessionToken == null) {
            throw new SecurityException("Supplier portal authentication is required.");
        }
        normalized.put("kiosk_session_token", effectiveSessionToken);
        var action = resourceId == null
            ? KioskActionRequest.of(capability, normalized)
            : KioskActionRequest.forResource(capability, resourceId, normalized);
        return dispatcher.dispatch(
            context(portalCode, request, browserSession), action, blank(idempotencyKey));
    }

    public long legacyReference(String portalCode) {
        if (!engineEnabled()) {
            return repository.findSupplierPortalAccessByCode(token(portalCode))
                .map(PurchaseOrderRepository.SupplierPortalAccessRecord::id)
                .orElseThrow(KioskUnavailableException::new);
        }
        var definition = registry.resolvePublic(
            ProcurementSupplierPortalCapabilities.OWNER_MODULE, token(portalCode));
        if (definition.legacyReferenceId() == null || definition.legacyReferenceId() <= 0) {
            throw new KioskUnavailableException();
        }
        return definition.legacyReferenceId();
    }

    public Map<String, Object> closeSession(
            String portalCode,
            String csrfToken,
            String sessionToken,
            HttpServletRequest request,
            HttpSession browserSession) {
        if (!engineEnabled()) {
            var normalizedToken = blank(sessionToken);
            if (normalizedToken != null) {
                requireCsrf(browserSession, csrfToken);
                var access = repository.findSupplierPortalAccessByCode(token(portalCode))
                    .orElseThrow(KioskUnavailableException::new);
                requireCompatSession(access, normalizedToken, browserSession);
            }
            browserSession.removeAttribute(COMPAT_SESSION_ATTRIBUTE);
            return Map.of("closed", true);
        }
        requireCsrf(browserSession, csrfToken);
        var normalizedToken = blank(sessionToken);
        if (normalizedToken == null) {
            throw new SecurityException("Supplier portal authentication is required.");
        }
        var payload = Map.<String, Object>of("kiosk_session_token", normalizedToken);
        var result = dispatcher.dispatchWithMetadata(
            context(portalCode, request, browserSession),
            KioskActionRequest.of(ProcurementSupplierPortalCapabilities.CATALOG_READ, payload),
            null
        );
        var definition = registry.resolvePublic(
            ProcurementSupplierPortalCapabilities.OWNER_MODULE, token(portalCode));
        sessions.revoke(result.kioskSessionId(), definition);
        return Map.of("closed", true);
    }

    private KioskExecutionContext context(
            String portalCode,
            HttpServletRequest request,
            HttpSession browserSession) {
        var networkSignal = KioskClientNetworkSignal.from(request);
        return new KioskExecutionContext(
            ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            KioskExecutionChannels.LEGACY_PUBLIC_LINK,
            token(portalCode),
            networkSignal,
            browserSession.getId()
        );
    }

    private void requireCsrf(HttpSession session, String csrfToken) {
        try {
            csrf.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException failure) {
            throw new SecurityException("Kiosk browser validation failed.");
        }
    }

    private boolean engineEnabled() {
        return flags.registryEnabled() && flags.sessionsEnabled() && flags.auditEnabled()
            && flags.adapterEnabled(ProcurementSupplierPortalCapabilities.OWNER_MODULE);
    }

    private Map<String, Object> legacyBootstrap(String portalCode, HttpSession browserSession) {
        var access = repository.findSupplierPortalAccessByCode(token(portalCode))
            .orElseThrow(KioskUnavailableException::new);
        var response = new LinkedHashMap<String, Object>();
        var expired = access.expiresAt() != null && !access.expiresAt().isAfter(java.time.Instant.now());
        response.put("status", expired ? "EXPIRED" : access.status());
        if (access.expiresAt() != null) response.put("expiresAt", access.expiresAt().toString());
        response.put("csrfToken", csrf.ensureCsrf(browserSession));
        response.put("legacyMode", true);
        response.put("inactivityTimeoutSeconds", COMPAT_INACTIVITY.toSeconds());
        return response;
    }

    private Map<String, Object> legacyAuthenticate(
            String portalCode,
            String csrfToken,
            String pin,
            HttpSession browserSession) {
        // A request without the bootstrap CSRF token is an original v1 client. Its
        // response remains byte-for-byte compatible and actions can keep sending a
        // PIN in the body. The new UI opts into the bounded compatibility session.
        if (blank(csrfToken) == null) {
            return map(purchaseOrders.authenticateSupplierPortal(
                token(portalCode), new SupplierPortalLoginRequest(pin)));
        }
        requireCsrf(browserSession, csrfToken);
        var access = repository.findSupplierPortalAccessByCode(token(portalCode))
            .orElseThrow(KioskUnavailableException::new);
        var verified = identities.verify(access, pin);
        var opaqueToken = String.valueOf(verified.get("kiosk_session_token"));
        var expiresAt = Instant.parse(String.valueOf(verified.get("expires_at")));
        var now = Instant.now();
        var sessionId = UUID.randomUUID().toString();
        browserSession.setAttribute(COMPAT_SESSION_ATTRIBUTE, new CompatSession(
            access.companyId(), access.id(), sessionId, sha256(opaqueToken), expiresAt, now));

        var context = map(purchaseOrders.supplierPortalContext(access));
        var response = new LinkedHashMap<String, Object>(context);
        response.put("context", context);
        response.put("sessionId", sessionId);
        response.put("kioskSessionId", sessionId);
        response.put("sessionToken", opaqueToken);
        response.put("kioskSessionToken", opaqueToken);
        response.put("expiresAt", expiresAt.toString());
        response.put("csrfToken", csrf.ensureCsrf(browserSession));
        response.put("legacyMode", true);
        return response;
    }

    private Map<String, Object> legacyExecute(
            String portalCode,
            String pin,
            String capability,
            Map<String, Object> payload) {
        var normalized = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        if (pin != null && !pin.isBlank()) normalized.put("pin", pin.trim());
        return switch (capability) {
            case ProcurementSupplierPortalCapabilities.CATALOG_READ -> map(
                purchaseOrders.authenticateSupplierPortal(
                    token(portalCode), new SupplierPortalLoginRequest(requiredPin(normalized))));
            case ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE -> map(
                purchaseOrders.createPublicSupplierSubmission(token(portalCode),
                    objectMapper.convertValue(normalized, SupplierPortalSubmissionRequest.class)));
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN -> map(
                purchaseOrders.createPublicSupplierInvoiceUpload(token(portalCode),
                    objectMapper.convertValue(normalized, SupplierPortalDocumentUploadRequest.class)));
            case ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT -> map(
                purchaseOrders.createPublicSupplierInvoice(token(portalCode),
                    objectMapper.convertValue(normalized, SupplierPortalInvoiceRequest.class)));
            default -> throw new KioskUnavailableException();
        };
    }

    private Map<String, Object> legacySessionExecute(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            String capability,
            Map<String, Object> payload) {
        var normalized = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        normalized.remove("pin");
        normalized.remove("kiosk_session_token");
        return switch (capability) {
            case ProcurementSupplierPortalCapabilities.CATALOG_READ -> map(
                purchaseOrders.supplierPortalContext(access));
            case ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE -> map(
                purchaseOrders.createPublicSupplierSubmission(access,
                    objectMapper.convertValue(normalized, SupplierPortalSubmissionRequest.class)));
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN -> map(
                purchaseOrders.createPublicSupplierInvoiceUpload(access,
                    objectMapper.convertValue(normalized, SupplierPortalDocumentUploadRequest.class)));
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER ->
                purchaseOrders.registerPublicSupplierInvoiceUpload(access,
                    objectMapper.convertValue(normalized, SupplierPortalDocumentRegisterRequest.class));
            case ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT -> map(
                purchaseOrders.createPublicSupplierInvoice(access,
                    objectMapper.convertValue(normalized, SupplierPortalInvoiceRequest.class)));
            default -> throw new KioskUnavailableException();
        };
    }

    private void requireCompatSession(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            String rawToken,
            HttpSession browserSession) {
        var normalizedToken = blank(rawToken);
        var stored = browserSession.getAttribute(COMPAT_SESSION_ATTRIBUTE);
        if (normalizedToken == null || !(stored instanceof CompatSession compat)) {
            throw new SecurityException("Supplier portal authentication is required.");
        }
        var now = Instant.now();
        var expired = !compat.expiresAt().isAfter(now)
            || !compat.lastSeenAt().plus(COMPAT_INACTIVITY).isAfter(now);
        var matchesBoundary = compat.companyId() == access.companyId()
            && compat.accessId() == access.id();
        if (expired || !matchesBoundary
                || !MessageDigest.isEqual(compat.tokenHash(), sha256(normalizedToken))) {
            browserSession.removeAttribute(COMPAT_SESSION_ATTRIBUTE);
            throw new SecurityException("Supplier portal authentication is required.");
        }
        browserSession.setAttribute(COMPAT_SESSION_ATTRIBUTE, new CompatSession(
            compat.companyId(), compat.accessId(), compat.sessionId(), compat.tokenHash(),
            compat.expiresAt(), now));
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private String requiredPin(Map<String, Object> payload) {
        var value = payload.get("pin");
        if (value == null || String.valueOf(value).isBlank()) {
            throw new SecurityException("Supplier portal authentication is required.");
        }
        return String.valueOf(value).trim();
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }

    private String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String token(String value) {
        var normalized = blank(value);
        return normalized == null ? "" : normalized.toUpperCase(Locale.ROOT);
    }

    private record CompatSession(
        long companyId,
        long accessId,
        String sessionId,
        byte[] tokenHash,
        Instant expiresAt,
        Instant lastSeenAt
    ) implements java.io.Serializable {
        private CompatSession {
            tokenHash = tokenHash.clone();
        }

        public byte[] tokenHash() {
            return tokenHash.clone();
        }
    }
}
