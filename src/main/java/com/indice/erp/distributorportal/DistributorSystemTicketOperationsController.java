package com.indice.erp.distributorportal;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.systemticket.SystemTicketAttachmentService;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.Filters;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.MessageRequest;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.PresignAttachmentRequest;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.RegisterAttachmentRequest;
import com.indice.erp.systemticket.SystemTicketOperationsService;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/distributor-portal/system-ticket-operations")
public class DistributorSystemTicketOperationsController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final SystemTicketOperationsService operations;
    private final SystemTicketAttachmentService attachments;

    public DistributorSystemTicketOperationsController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        SystemTicketOperationsService operations,
        SystemTicketAttachmentService attachments
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.operations = operations;
        this.attachments = attachments;
    }

    @GetMapping
    public ResponseEntity<?> list(
        HttpSession session,
        @RequestParam(name = "q", defaultValue = "") String query,
        @RequestParam(name = "status", defaultValue = "ACTIVE") String status,
        @RequestParam(name = "type", defaultValue = "ALL") String type,
        @RequestParam(name = "priority", defaultValue = "ALL") String priority,
        @RequestParam(name = "module", defaultValue = "") String module,
        @RequestParam(name = "overdue", defaultValue = "false") boolean overdue,
        @RequestParam(name = "from", required = false) Instant from,
        @RequestParam(name = "to", required = false) Instant to
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            return ResponseEntity.ok(operations.listForDistributor(
                actor, new Filters(
                    query, status, type, priority, "ALL", module, "", overdue, from, to
                )
            ));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long ticketId) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            return ResponseEntity.ok(operations.detailForDistributor(actor, ticketId));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/{ticketId}/messages")
    public ResponseEntity<?> message(
        HttpSession session,
        @PathVariable long ticketId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody MessageRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(operations.addMessageFromDistributor(actor, ticketId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/{ticketId}/attachments/presign-upload")
    public ResponseEntity<?> presignAttachment(
        HttpSession session,
        @PathVariable long ticketId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PresignAttachmentRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(attachments.presignForDistributor(actor, ticketId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/{ticketId}/attachments")
    public ResponseEntity<?> registerAttachment(
        HttpSession session,
        @PathVariable long ticketId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody RegisterAttachmentRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(attachments.registerForDistributor(actor, ticketId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof DistributorPortalForbiddenException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        }
        if (exception instanceof NoSuchElementException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", message));
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }
}
