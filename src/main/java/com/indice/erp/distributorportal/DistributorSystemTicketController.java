package com.indice.erp.distributorportal;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.systemticket.SystemTicketService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/distributor-portal/system-tickets")
public class DistributorSystemTicketController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final SystemTicketService tickets;

    public DistributorSystemTicketController(SessionAuthService auth, SessionCsrfService csrf, SystemTicketService tickets) {
        this.auth = auth;
        this.csrf = csrf;
        this.tickets = tickets;
    }

    @GetMapping
    public ResponseEntity<?> list(
        HttpSession session,
        @RequestParam(name = "q", defaultValue = "") String query,
        @RequestParam(name = "status", defaultValue = "ACTIVE") String status,
        @RequestParam(name = "type", defaultValue = "ALL") String type
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            return ResponseEntity.ok(tickets.listForDistributor(actor, query, status, type));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody SystemTicketService.CreateRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(tickets.create(actor, request));
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
