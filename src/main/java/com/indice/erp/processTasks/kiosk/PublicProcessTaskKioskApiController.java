package com.indice.erp.processTasks.kiosk;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskClientNetworkSignal;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
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
@RequestMapping("/api/v1/process-tasks/public-kiosk/{deviceToken}")
public class PublicProcessTaskKioskApiController {

    private final ProcessTaskKioskAdapter kioskAdapter;
    private final KioskActionDispatcher actionDispatcher;
    private final PublicProcessTaskKioskCsrf publicCsrf;
    private final KioskRateLimitService rateLimitService;
    private final KioskEngineFeatureFlags featureFlags;

    public PublicProcessTaskKioskApiController(
            ProcessTaskKioskAdapter kioskAdapter,
            KioskActionDispatcher actionDispatcher,
            PublicProcessTaskKioskCsrf publicCsrf,
            KioskRateLimitService rateLimitService,
            KioskEngineFeatureFlags featureFlags) {
        this.kioskAdapter = kioskAdapter;
        this.actionDispatcher = actionDispatcher;
        this.publicCsrf = publicCsrf;
        this.rateLimitService = rateLimitService;
        this.featureFlags = featureFlags;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(
            HttpSession session,
            HttpServletRequest servletRequest,
            @PathVariable String deviceToken) {
        try {
            if (!featureFlags.registryEnabled()
                    || !featureFlags.adapterEnabled(ProcessTaskKioskCapabilities.OWNER_MODULE)) {
                throw new NoSuchElementException("Kiosk not found.");
            }
            var context = context(deviceToken, servletRequest, session);
            rateLimitService.requireAllowed(KioskRateLimitType.BOOTSTRAP, context, Map.of());
            return ResponseEntity.ok(publicCsrf.withToken(session, kioskAdapter.bootstrap(context)));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/identify")
    public ResponseEntity<?> identify(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String deviceToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(execute(
                context(deviceToken, servletRequest, session),
                ProcessTaskKioskCapabilities.IDENTITY_VERIFY, payload, idempotencyKey));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            var status = ex.getMessage() != null && ex.getMessage().contains("Too many failed PIN attempts")
                ? HttpStatus.TOO_MANY_REQUESTS
                : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks")
    public ResponseEntity<?> tasks(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String deviceToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(execute(
                context(deviceToken, servletRequest, session),
                ProcessTaskKioskCapabilities.TASKS_READ, payload, idempotencyKey));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/create")
    public ResponseEntity<?> createTask(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String deviceToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                execute(context(deviceToken, servletRequest, session),
                    ProcessTaskKioskCapabilities.TASK_CREATE, payload, idempotencyKey));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/{taskId}/complete")
    public ResponseEntity<?> complete(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String deviceToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(execute(
                context(deviceToken, servletRequest, session),
                ProcessTaskKioskCapabilities.TASK_COMPLETE, taskId, payload, idempotencyKey));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/{taskId}/responsible")
    public ResponseEntity<?> assignResponsible(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String deviceToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(execute(
                context(deviceToken, servletRequest, session),
                ProcessTaskKioskCapabilities.TASK_RESPONSIBLE_ASSIGN, taskId, payload, idempotencyKey));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/{taskId}/attachments/presign-upload")
    public ResponseEntity<?> createAttachmentUpload(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String deviceToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(execute(
                context(deviceToken, servletRequest, session),
                ProcessTaskKioskCapabilities.TASK_ATTACHMENT_PRESIGN, taskId, payload, idempotencyKey));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/{taskId}/attachments")
    public ResponseEntity<?> registerAttachment(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String deviceToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                execute(
                    context(deviceToken, servletRequest, session),
                    ProcessTaskKioskCapabilities.TASK_ATTACHMENT_REGISTER,
                    taskId,
                    payload,
                    idempotencyKey
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private KioskExecutionContext context(
            String deviceToken,
            HttpServletRequest request,
            HttpSession session) {
        var networkSignal = KioskClientNetworkSignal.from(request);
        return KioskExecutionContext.publicLink(
            ProcessTaskKioskCapabilities.OWNER_MODULE,
            deviceToken,
            networkSignal,
            session.getId()
        );
    }

    private Map<String, Object> execute(
            KioskExecutionContext context,
            String capability,
            Map<String, Object> payload,
            String idempotencyKey) {
        return actionDispatcher.dispatch(
            context, KioskActionRequest.of(capability, payload), idempotencyKey);
    }

    private Map<String, Object> execute(
            KioskExecutionContext context,
            String capability,
            long resourceId,
            Map<String, Object> payload,
            String idempotencyKey) {
        return actionDispatcher.dispatch(
            context,
            KioskActionRequest.forResource(capability, resourceId, payload),
            idempotencyKey
        );
    }
}
