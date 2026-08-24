package com.indice.erp.auth;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class ManagedCompanyContextApiController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final ManagedCompanyContextService managedCompanies;

    public ManagedCompanyContextApiController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        ManagedCompanyContextService managedCompanies
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.managedCompanies = managedCompanies;
    }

    @GetMapping("/managed-companies")
    public ResponseEntity<?> current(HttpSession session) {
        var actor = auth.currentActor(session);
        if (actor.isEmpty()) return unauthorized();
        return ResponseEntity.ok(managedCompanies.current(actor.get(), session));
    }

    @PostMapping("/managed-company")
    public ResponseEntity<?> activate(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody(required = false) ManagedCompanyRequest request
    ) {
        var actor = auth.currentActor(session);
        if (actor.isEmpty()) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            if (request == null || request.company_id() == null || request.company_id() <= 0) {
                return ResponseEntity.badRequest().body(message("A client company is required."));
            }
            return ResponseEntity.ok(managedCompanies.activate(actor.get(), request.company_id(), session));
        } catch (ManagedCompanyContextForbiddenException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(exception.getMessage()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(exception.getMessage()));
        }
    }

    @DeleteMapping("/managed-company")
    public ResponseEntity<?> clear(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var actor = auth.currentActor(session);
        if (actor.isEmpty()) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(managedCompanies.clear(actor.get(), session));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message(exception.getMessage()));
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(message("Authentication is required."));
    }

    private Map<String, String> message(String value) {
        return Map.of("message", value);
    }

    public record ManagedCompanyRequest(Long company_id) {
    }
}
