package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentUploadRequest;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskPinRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicProviderRegistrationRequest;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskClientNetworkSignal;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.NoSuchElementException;
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
@RequestMapping("/api/v1/finance/public-payable-kiosks/{token}")
public class PublicPayableKioskController {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final PayableKioskAdapter adapter;
    private final PayableKioskService service;
    private final KioskActionDispatcher dispatcher;
    private final PublicPayableKioskCsrf csrf;
    private final KioskRegistryService registry;
    private final KioskRateLimitService rateLimit;
    private final KioskEngineFeatureFlags flags;
    private final ObjectMapper objectMapper;

    public PublicPayableKioskController(
            PayableKioskAdapter adapter,
            PayableKioskService service,
            KioskActionDispatcher dispatcher,
            PublicPayableKioskCsrf csrf,
            KioskRegistryService registry,
            KioskRateLimitService rateLimit,
            KioskEngineFeatureFlags flags,
            ObjectMapper objectMapper) {
        this.adapter = adapter;
        this.service = service;
        this.dispatcher = dispatcher;
        this.csrf = csrf;
        this.registry = registry;
        this.rateLimit = rateLimit;
        this.flags = flags;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(
            HttpSession session, HttpServletRequest request, @PathVariable String token) {
        requireEnabled();
        var definition = registry.resolvePublic(PayableKioskCapabilities.OWNER_MODULE, token);
        var context = context(token, request, session).resolved(definition, null);
        rateLimit.requireAllowed(KioskRateLimitType.BOOTSTRAP, context, Map.of());
        registry.synchronizeCapabilities(definition, adapter.capabilities());
        return ResponseEntity.ok(csrf.withToken(session, adapter.bootstrap(context)));
    }

    @PostMapping("/authenticate")
    public ResponseEntity<?> authenticate(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String token,
            @Valid @RequestBody PayableKioskPinRequest pinRequest) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        var payload = Map.<String, Object>of(
            "pin", pinRequest.pin(), "credential_payload", pinRequest.pin(), "auth_method", "pin");
        var response = execute(
            context(token, request, session), PayableKioskCapabilities.IDENTITY_VERIFY,
            null, payload, null);
        service.rememberLegacyAuthorization(session, token, response);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/provider-registrations")
    public ResponseEntity<?> registerProvider(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @Valid @RequestBody PublicProviderRegistrationRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        return ResponseEntity.status(HttpStatus.CREATED).body(execute(
            context(token, servletRequest, session), PayableKioskCapabilities.PROVIDER_REGISTER,
            null, map(request), compatibleKey(idempotencyKey)));
    }

    @PostMapping("/payables")
    public ResponseEntity<?> createPayable(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @Valid @RequestBody PublicPayableRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        var payload = service.withLegacySession(session, token, map(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(execute(
            context(token, servletRequest, session), PayableKioskCapabilities.PAYABLE_CREATE,
            null, payload, compatibleKey(idempotencyKey)));
    }

    @PostMapping("/payables/{expenseId}/attachments/presign-upload")
    public ResponseEntity<?> presignAttachment(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @PathVariable long expenseId,
            @Valid @RequestBody ExpenseAttachmentUploadRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        try {
            var payload = service.withLegacySession(session, token, map(request));
            return ResponseEntity.ok(execute(
                context(token, servletRequest, session), PayableKioskCapabilities.ATTACHMENT_PRESIGN,
                expenseId, payload, compatibleKey(idempotencyKey)));
        } catch (ObjectStorageDisabledException failure) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", failure.getMessage()));
        }
    }

    @PostMapping("/payables/{expenseId}/attachments")
    public ResponseEntity<?> registerAttachment(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @PathVariable long expenseId,
            @Valid @RequestBody RegisterExpenseAttachmentRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        try {
            var payload = service.withLegacySession(session, token, map(request));
            return ResponseEntity.status(HttpStatus.CREATED).body(execute(
                context(token, servletRequest, session), PayableKioskCapabilities.ATTACHMENT_REGISTER,
                expenseId, payload, compatibleKey(idempotencyKey)));
        } catch (ObjectStorageDisabledException failure) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", failure.getMessage()));
        }
    }

    @GetMapping("/face")
    public ResponseEntity<?> faceStatus(
            HttpSession session,
            HttpServletRequest request,
            @PathVariable String token) {
        var payload = service.withLegacySession(session, token, Map.of());
        return ResponseEntity.ok(execute(
            context(token, request, session), PayableKioskCapabilities.FACE_ENROLLMENT_STATUS,
            null, payload, null));
    }

    @PostMapping("/face/enrollments")
    public ResponseEntity<?> beginFaceEnrollment(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @RequestBody Map<String, Object> requestPayload) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        return ResponseEntity.status(HttpStatus.CREATED).body(execute(
            context(token, request, session), PayableKioskCapabilities.FACE_ENROLLMENT_BEGIN,
            null, sessionPayload(session, token, requestPayload), compatibleKey(idempotencyKey)));
    }

    @PostMapping("/face/enrollments/{enrollmentId}/captures/presign-upload")
    public ResponseEntity<?> presignFaceEnrollmentCapture(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @PathVariable String enrollmentId,
            @RequestBody Map<String, Object> requestPayload) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        var payload = sessionPayload(session, token, requestPayload);
        payload.put("enrollment_id", enrollmentId);
        return ResponseEntity.ok(execute(
            context(token, request, session), PayableKioskCapabilities.FACE_ENROLLMENT_CAPTURE_PRESIGN,
            null, payload, compatibleKey(idempotencyKey)));
    }

    @PostMapping("/face/enrollments/{enrollmentId}/complete")
    public ResponseEntity<?> completeFaceEnrollment(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @PathVariable String enrollmentId) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        var payload = sessionPayload(session, token, Map.of());
        payload.put("enrollment_id", enrollmentId);
        return ResponseEntity.ok(execute(
            context(token, request, session), PayableKioskCapabilities.FACE_ENROLLMENT_COMPLETE,
            null, payload, compatibleKey(idempotencyKey)));
    }

    @PostMapping("/face/consent/withdraw")
    public ResponseEntity<?> withdrawFaceConsent(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        return ResponseEntity.ok(execute(
            context(token, request, session), PayableKioskCapabilities.FACE_CONSENT_WITHDRAW,
            null, sessionPayload(session, token, Map.of()), compatibleKey(idempotencyKey)));
    }

    @PostMapping("/face/verifications")
    public ResponseEntity<?> beginFaceVerification(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        return ResponseEntity.status(HttpStatus.CREATED).body(execute(
            context(token, request, session), PayableKioskCapabilities.FACE_VERIFICATION_BEGIN,
            null, sessionPayload(session, token, Map.of()), compatibleKey(idempotencyKey)));
    }

    @PostMapping("/face/verifications/{verificationId}/captures/presign-upload")
    public ResponseEntity<?> presignFaceVerificationCapture(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @PathVariable String verificationId,
            @RequestBody Map<String, Object> requestPayload) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        var payload = sessionPayload(session, token, requestPayload);
        payload.put("verification_id", verificationId);
        return ResponseEntity.ok(execute(
            context(token, request, session), PayableKioskCapabilities.FACE_VERIFICATION_CAPTURE_PRESIGN,
            null, payload, compatibleKey(idempotencyKey)));
    }

    @PostMapping("/face/verifications/{verificationId}/complete")
    public ResponseEntity<?> completeFaceVerification(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String token,
            @PathVariable String verificationId) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        var payload = sessionPayload(session, token, Map.of());
        payload.put("verification_id", verificationId);
        return ResponseEntity.ok(execute(
            context(token, request, session), PayableKioskCapabilities.FACE_VERIFICATION_COMPLETE,
            null, payload, compatibleKey(idempotencyKey)));
    }

    private Map<String, Object> execute(
            KioskExecutionContext context,
            String capability,
            Long resourceId,
            Map<String, Object> payload,
            String idempotencyKey) {
        requireEnabled();
        var action = resourceId == null
            ? KioskActionRequest.of(capability, payload)
            : KioskActionRequest.forResource(capability, resourceId, payload);
        return dispatcher.dispatch(context, action, idempotencyKey);
    }

    private KioskExecutionContext context(
            String token, HttpServletRequest request, HttpSession session) {
        var networkSignal = KioskClientNetworkSignal.from(request);
        return KioskExecutionContext.publicLink(
            PayableKioskCapabilities.OWNER_MODULE, token, networkSignal, session.getId());
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }

    private LinkedHashMap<String, Object> sessionPayload(
            HttpSession session,
            String token,
            Map<String, Object> payload) {
        return new LinkedHashMap<>(service.withLegacySession(session, token, payload));
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.sessionsEnabled() || !flags.auditEnabled()
                || !flags.adapterEnabled(PayableKioskCapabilities.OWNER_MODULE)) {
            throw new KioskUnavailableException();
        }
    }

    private String compatibleKey(String value) {
        return value == null || value.isBlank() ? "legacy-" + UUID.randomUUID() : value;
    }
}
