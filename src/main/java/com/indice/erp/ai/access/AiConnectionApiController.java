package com.indice.erp.ai.access;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
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
@RequestMapping("/api/v1/ai/connections")
public class AiConnectionApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService csrfService;
    private final AiAccessTokenService tokenService;

    public AiConnectionApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService csrfService,
        AiAccessTokenService tokenService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.csrfService = csrfService;
        this.tokenService = tokenService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty() || sessionAuthService.isPublicDemoSession(session)) {
            return unauthorized();
        }
        try {
            return ResponseEntity.ok(Map.of("connections", tokenService.list(user.get())));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
        HttpSession session,
        @RequestHeader(value = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody(required = false) CreateConnectionRequest request
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty() || sessionAuthService.isPublicDemoSession(session)) {
            return unauthorized();
        }
        try {
            csrfService.requireCsrf(session, csrfToken);
            var safeRequest = request == null ? new CreateConnectionRequest(null, null) : request;
            return ResponseEntity.status(HttpStatus.CREATED).body(
                tokenService.issue(user.get(), safeRequest.label(), safeRequest.expiresInDays())
            );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", exception.getMessage()));
        }
    }

    @DeleteMapping("/{connectionId}")
    public ResponseEntity<?> revoke(
        HttpSession session,
        @RequestHeader(value = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long connectionId
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty() || sessionAuthService.isPublicDemoSession(session)) {
            return unauthorized();
        }
        try {
            csrfService.requireCsrf(session, csrfToken);
            return tokenService.revoke(user.get(), connectionId)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    public record CreateConnectionRequest(String label, Integer expiresInDays) {
    }
}
