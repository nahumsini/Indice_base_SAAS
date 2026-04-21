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

    public AuthApiController(SessionAuthService sessionAuthService) {
        this.sessionAuthService = sessionAuthService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpSession session) {
        return sessionAuthService.currentSession(session)
            .<ResponseEntity<?>>map(ResponseEntity::ok)
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
            .<ResponseEntity<?>>map(ResponseEntity::ok)
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
}
