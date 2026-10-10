package com.indice.erp.kiosk.api;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.kiosk.engine.MultiKioskService;
import com.indice.erp.messaging.MessagingAccess;
import com.indice.erp.messaging.MessagingAttachmentService;
import com.indice.erp.messaging.MessagingService;
import com.indice.erp.messaging.MessagingTaskService;
import com.indice.erp.kiosk.engine.KioskMultiDashboardService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskEmployeeToolCatalogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import static com.indice.erp.messaging.MessagingContracts.*;

/** Alternate PIN trust boundary; all conversation and attachment policy stays with Messaging. */
@RestController
@RequestMapping("/api/v2/multi-kiosks/public/{publicToken}/messaging")
public class MultiKioskMessagingController {
    private final KioskEngineFeatureFlags flags;
    private final SessionCsrfService csrf;
    private final MultiKioskService kiosks;
    private final MessagingAccess access;
    private final MessagingService messaging;
    private final MessagingAttachmentService attachments;
    private final KioskV2ResponseFactory responses;
    private final MessagingTaskService tasks;
    private final KioskMultiDashboardService dashboard;

    public MultiKioskMessagingController(KioskEngineFeatureFlags flags, SessionCsrfService csrf,
            MultiKioskService kiosks, MessagingAccess access, MessagingService messaging,
            MessagingAttachmentService attachments, KioskV2ResponseFactory responses,
            MessagingTaskService tasks,KioskMultiDashboardService dashboard) {
        this.flags = flags; this.csrf = csrf; this.kiosks = kiosks; this.access = access;
        this.messaging = messaging; this.attachments = attachments; this.responses = responses;
        this.tasks=tasks; this.dashboard=dashboard;
    }

    private Actor actor(HttpServletRequest request, String token) {
        if (!flags.registryEnabled() || !flags.sessionsEnabled() || !flags.auditEnabled()
                || !flags.multiDashboardEnabled()) throw new KioskUnavailableException();
        var session = request.getSession(false);
        if (session == null) throw new SecurityException("Employee session required.");
        boolean mutation = !"GET".equals(request.getMethod());
        if (mutation) {
            try { csrf.requireCsrf(session, request.getHeader("X-CSRF-Token")); }
            catch (IllegalArgumentException failure) { throw new KioskCsrfException(); }
        }
        // Read cursors and background polling must not prolong a shared-device session.
        boolean activity = mutation && !request.getRequestURI().endsWith("/read");
        return access.memberActor(kiosks.requireEmployeeSession(token,
            request.getHeader("X-Multi-Kiosk-Session-Token"), session.getId(), activity));
    }

    private ResponseEntity<?> result(Object data) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(responses.success(data, null, null));
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<?> messagingFailure(org.springframework.web.server.ResponseStatusException failure) {
        return ResponseEntity.status(failure.getStatusCode()).cacheControl(CacheControl.noStore())
            .body(responses.error("MESSAGING_REQUEST_REJECTED", "No fue posible completar esta solicitud.",
                failure.getStatusCode().value() == 429));
    }

    @GetMapping("/context")
    public ResponseEntity<?> context(HttpServletRequest r, @PathVariable String publicToken) {
        return result(messaging.context(actor(r, publicToken)));
    }
    private KioskResolvedDefinition taskDefinition(HttpServletRequest r,String token) {
        var context=kiosks.employeeContext(token,r.getHeader("X-Multi-Kiosk-Session-Token"),r.getSession(false).getId());
        return dashboard.personalOverviewDefinition(context.user(),context.multiKioskId(),
            KioskEmployeeToolCatalogService.MY_TASKS_TOOL_KEY,"process-tasks.task.create@1");
    }
    @GetMapping("/task-context")
    public ResponseEntity<?> taskContext(HttpServletRequest r,@PathVariable String publicToken) {
        var a=actor(r,publicToken);
        return result(tasks.context(a,true,taskDefinition(r,publicToken)));
    }
    @PostMapping("/conversations/{id}/tasks")
    public ResponseEntity<?> task(HttpServletRequest r,@PathVariable String publicToken,@PathVariable long id,@RequestBody MessagingTaskService.CreateTask body) {
        var a=actor(r,publicToken);
        return result(tasks.create(a,id,body,true,taskDefinition(r,publicToken)));
    }
    @GetMapping("/unread")
    public ResponseEntity<?> unread(HttpServletRequest r, @PathVariable String publicToken) {
        return result(messaging.unread(actor(r, publicToken)));
    }
    @GetMapping("/directory")
    public ResponseEntity<?> directory(HttpServletRequest r, @PathVariable String publicToken,
            @RequestParam(defaultValue = "") String q) {
        return result(messaging.directory(actor(r, publicToken), q));
    }
    @GetMapping("/conversations")
    public ResponseEntity<?> list(HttpServletRequest r, @PathVariable String publicToken,
            @RequestParam(defaultValue = "ALL") String filter, @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int offset) {
        return result(messaging.list(actor(r, publicToken), filter, q, offset));
    }
    @PostMapping("/conversations")
    public ResponseEntity<?> create(HttpServletRequest r, @PathVariable String publicToken, @RequestBody Create body) {
        return result(messaging.create(actor(r, publicToken), body));
    }
    @GetMapping("/conversations/{id}")
    public ResponseEntity<?> detail(HttpServletRequest r, @PathVariable String publicToken, @PathVariable long id,
            @RequestParam(defaultValue = "0") long after, @RequestParam(defaultValue = "0") long before) {
        return result(messaging.detail(actor(r, publicToken), id, after, before));
    }
    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<?> send(HttpServletRequest r, @PathVariable String publicToken,
            @PathVariable long id, @RequestBody Send body) {
        return result(messaging.send(actor(r, publicToken), id, body));
    }
    @PostMapping("/conversations/{id}/read")
    public ResponseEntity<?> read(HttpServletRequest r, @PathVariable String publicToken,
            @PathVariable long id, @RequestBody Read body) {
        messaging.read(actor(r, publicToken), id, body);
        return result(java.util.Map.of());
    }
    @PostMapping("/conversations/{id}/attachments")
    public ResponseEntity<?> upload(HttpServletRequest r, @PathVariable String publicToken,
            @PathVariable long id, @RequestBody PhotoUpload body) {
        return result(attachments.presign(actor(r, publicToken), id, body));
    }
    @GetMapping("/conversations/{id}/attachments/{attachmentId}")
    public ResponseEntity<?> photo(HttpServletRequest r, @PathVariable String publicToken,
            @PathVariable long id, @PathVariable String attachmentId) {
        return result(attachments.download(actor(r, publicToken), id, attachmentId));
    }
}
