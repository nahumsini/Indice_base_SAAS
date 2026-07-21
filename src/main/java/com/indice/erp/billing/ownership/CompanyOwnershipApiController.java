package com.indice.erp.billing.ownership;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/account/ownership")
public class CompanyOwnershipApiController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final CompanyOwnershipTransferService service;

    public CompanyOwnershipApiController(SessionAuthService auth, SessionCsrfService csrf,
                                         CompanyOwnershipTransferService service) {
        this.auth = auth;
        this.csrf = csrf;
        this.service = service;
    }

    @PostMapping("/transfers")
    public ResponseEntity<?> request(HttpSession session,
                                     @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
                                     @RequestBody TransferRequest body) {
        try {
            var user = auth.currentUser(session).orElse(null);
            if (user == null) return unauthorized();
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                service.request(user.companyId(), user.userId(), body.target_email(), body.reason())
            );
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/transfers/accept")
    public ResponseEntity<?> accept(HttpSession session,
                                    @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
                                    @RequestBody AcceptRequest body) {
        try {
            var user = auth.currentUser(session).orElse(null);
            if (user == null) return unauthorized();
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.accept(user.userId(), body.token()));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof OwnershipForbiddenException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        }
        if (exception instanceof NoSuchElementException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", message));
        }
        if (exception instanceof IllegalStateException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    public record TransferRequest(String target_email, String reason) {}
    public record AcceptRequest(String token) {}
}
