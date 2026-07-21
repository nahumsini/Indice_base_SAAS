package com.indice.erp.billing.portal;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing/recovery")
public class BillingRecoveryApiController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final BillingRecoveryService service;

    public BillingRecoveryApiController(SessionAuthService auth, SessionCsrfService csrf,
                                        BillingRecoveryService service) {
        this.auth = auth;
        this.csrf = csrf;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> snapshot(HttpSession session) {
        var user = auth.currentUser(session).orElse(null);
        if (user == null) return unauthorized();
        try {
            return ResponseEntity.ok(service.snapshot(user.companyId(), user.userId()));
        } catch (RuntimeException failure) {
            return error(failure);
        }
    }

    @PostMapping("/portal")
    public ResponseEntity<?> portal(HttpSession session,
                                    @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
                                    @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
        var user = auth.currentUser(session).orElse(null);
        if (user == null) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.createPortal(user.companyId(), user.userId(), idempotencyKey));
        } catch (RuntimeException failure) {
            return error(failure);
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    private ResponseEntity<?> error(RuntimeException failure) {
        var message = failure.getMessage() == null ? "Billing recovery could not be opened." : failure.getMessage();
        if (failure instanceof SecurityException) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        if (failure instanceof NoSuchElementException) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", message));
        if (failure instanceof IllegalStateException) return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }
}
