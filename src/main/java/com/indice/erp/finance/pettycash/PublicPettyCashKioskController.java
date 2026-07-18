package com.indice.erp.finance.pettycash;

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
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance/petty-cash/public-kiosk/{fundToken}")
public class PublicPettyCashKioskController {

    private final PettyCashKioskAdapter adapter;
    private final KioskActionDispatcher dispatcher;
    private final PettyCashPublicKioskCsrf publicCsrf;
    private final KioskRegistryService registry;
    private final KioskRateLimitService rateLimit;
    private final KioskEngineFeatureFlags flags;

    public PublicPettyCashKioskController(
            PettyCashKioskAdapter adapter,
            KioskActionDispatcher dispatcher,
            PettyCashPublicKioskCsrf publicCsrf,
            KioskRegistryService registry,
            KioskRateLimitService rateLimit,
            KioskEngineFeatureFlags flags) {
        this.adapter = adapter;
        this.dispatcher = dispatcher;
        this.publicCsrf = publicCsrf;
        this.registry = registry;
        this.rateLimit = rateLimit;
        this.flags = flags;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(
            HttpSession session,
            HttpServletRequest request,
            @PathVariable String fundToken) {
        try {
            requireEnabled();
            var definition = registry.resolvePublic(PettyCashKioskCapabilities.OWNER_MODULE, fundToken);
            var context = context(fundToken, request, session).resolved(definition, null);
            rateLimit.requireAllowed(KioskRateLimitType.BOOTSTRAP, context, Map.of());
            registry.synchronizeCapabilities(definition, adapter.capabilities());
            return ResponseEntity.ok(publicCsrf.withToken(session, adapter.bootstrap(context)));
        } catch (NoSuchElementException failure) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kiosk not found."));
        } catch (IllegalArgumentException failure) {
            return ResponseEntity.badRequest().body(Map.of("message", failure.getMessage()));
        }
    }

    @PostMapping("/identify")
    public ResponseEntity<?> identify(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String fundToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        try {
            return ResponseEntity.ok(execute(
                context(fundToken, request, session), PettyCashKioskCapabilities.IDENTITY_VERIFY,
                null, payload, null));
        } catch (IllegalArgumentException failure) {
            return ResponseEntity.badRequest().body(Map.of("message", failure.getMessage()));
        }
    }

    @PostMapping("/receipts")
    public ResponseEntity<?> createReceipt(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String fundToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        return ResponseEntity.status(HttpStatus.CREATED).body(execute(
            context(fundToken, request, session), PettyCashKioskCapabilities.RECEIPT_CREATE,
            null, payload, compatibleKey(idempotencyKey)));
    }

    @PostMapping("/settlement-lines/{settlementLineId}/attachments/presign-upload")
    public ResponseEntity<?> createAttachmentUpload(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String fundToken,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        try {
            return ResponseEntity.ok(execute(
                context(fundToken, request, session), PettyCashKioskCapabilities.ATTACHMENT_PRESIGN,
                settlementLineId, payload, compatibleKey(idempotencyKey)));
        } catch (ObjectStorageDisabledException failure) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", failure.getMessage()));
        }
    }

    @PostMapping("/settlement-lines/{settlementLineId}/attachments")
    public ResponseEntity<?> registerAttachment(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String fundToken,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(execute(
                context(fundToken, request, session), PettyCashKioskCapabilities.ATTACHMENT_REGISTER,
                settlementLineId, payload, compatibleKey(idempotencyKey)));
        } catch (ObjectStorageDisabledException failure) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", failure.getMessage()));
        }
    }

    @PostMapping("/settlement-lines/{settlementLineId}/attachments/query")
    public ResponseEntity<?> listAttachments(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String fundToken,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        return ResponseEntity.ok(execute(
            context(fundToken, request, session), PettyCashKioskCapabilities.ATTACHMENTS_READ,
            settlementLineId, payload, null));
    }

    @DeleteMapping("/receipts/{settlementLineId}")
    public ResponseEntity<?> deleteReceipt(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String fundToken,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) return csrfError;
        return ResponseEntity.ok(execute(
            context(fundToken, request, session), PettyCashKioskCapabilities.RECEIPT_DELETE,
            settlementLineId, payload, compatibleKey(idempotencyKey)));
    }

    private Map<String, Object> execute(
            KioskExecutionContext context,
            String capability,
            Long resourceId,
            Map<String, Object> payload,
            String idempotencyKey) {
        requireEnabled();
        var request = resourceId == null
            ? KioskActionRequest.of(capability, payload)
            : KioskActionRequest.forResource(capability, resourceId, payload);
        return dispatcher.dispatch(context, request, idempotencyKey);
    }

    private KioskExecutionContext context(
            String fundToken, HttpServletRequest request, HttpSession session) {
        var networkSignal = KioskClientNetworkSignal.from(request);
        return KioskExecutionContext.publicLink(
            PettyCashKioskCapabilities.OWNER_MODULE, fundToken, networkSignal, session.getId());
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.sessionsEnabled() || !flags.auditEnabled()
                || !flags.adapterEnabled(PettyCashKioskCapabilities.OWNER_MODULE)) {
            throw new KioskUnavailableException();
        }
    }

    private String compatibleKey(String value) {
        return value == null || value.isBlank() ? "legacy-" + UUID.randomUUID() : value;
    }
}
