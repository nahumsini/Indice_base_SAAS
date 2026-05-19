package com.indice.erp.auth;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;

    public AuthApiController(SessionAuthService sessionAuthService, SessionCsrfService sessionCsrfService) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpSession session) {
        return sessionAuthService.currentSession(session)
            .<ResponseEntity<?>>map(body -> ResponseEntity.ok(sessionBody(body, session)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "message", "User is not authenticated"
            )));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpSession session) {
        var attempt = sessionAuthService.loginJson(request.email(), request.password(), session);
        if (!attempt.success()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "message", attempt.message()
            ));
        }

        return sessionAuthService.currentSession(session)
            .<ResponseEntity<?>>map(body -> ResponseEntity.ok(sessionBody(body, session)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Session was created but could not be loaded"
            )));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        sessionAuthService.logout(session);
        return ResponseEntity.ok(Map.of("success", true));
    }

    public record LoginRequest(
        String email,
        String password
    ) {
    }

    private Map<String, Object> sessionBody(AuthSessionResponse body, HttpSession session) {
        return Map.of(
            "user", body.user(),
            "company", body.company(),
            "csrfToken", sessionCsrfService.ensureCsrf(session)
        );
    }
}
