package com.indice.erp.internaldevelopment;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.EntryRequest;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Filters;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-admin/internal-development")
public class InternalDevelopmentController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final InternalDevelopmentService service;

    public InternalDevelopmentController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        InternalDevelopmentService service
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> workspace(
        HttpSession session,
        @RequestParam(name = "q", defaultValue = "") String query,
        @RequestParam(name = "type", defaultValue = "ALL") String type,
        @RequestParam(name = "area", defaultValue = "ALL") String area,
        @RequestParam(name = "status", defaultValue = "ALL") String status,
        @RequestParam(name = "owner", required = false) Long owner,
        @RequestParam(name = "from", required = false) LocalDate from,
        @RequestParam(name = "to", required = false) LocalDate to
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            return ResponseEntity.ok(service.workspace(
                actor.userId(),
                new Filters(query, type, area, status, owner, from, to)
            ));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/{entryId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long entryId) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            return ResponseEntity.ok(service.detail(actor.userId(), entryId));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody EntryRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(service.create(actor.userId(), request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/{entryId}")
    public ResponseEntity<?> update(
        HttpSession session,
        @PathVariable long entryId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody EntryRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.update(actor.userId(), entryId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof PlatformAdminForbiddenException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        }
        if (exception instanceof NoSuchElementException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", message));
        }
        if (exception instanceof InternalDevelopmentConflictException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }
}
