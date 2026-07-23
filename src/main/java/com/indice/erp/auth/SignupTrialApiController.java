package com.indice.erp.auth;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/signup")
@ConditionalOnProperty(name = "app.billing.signup.internal-trial-enabled", havingValue = "true")
public class SignupTrialApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final SignupTrialService signupTrialService;

    public SignupTrialApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        SignupTrialService signupTrialService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.signupTrialService = signupTrialService;
    }

    @PostMapping("/trial")
    public ResponseEntity<?> startTrial(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody SignupCheckoutRequest request
    ) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        try {
            signupTrialService.startTrial(request, session);
            return sessionAuthService.currentSession(session)
                .<ResponseEntity<?>>map((body) -> ResponseEntity.status(HttpStatus.CREATED).body(sessionBody(body, session)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Trial was created but session could not be loaded.")));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private Map<String, Object> sessionBody(AuthSessionResponse body, HttpSession session) {
        return Map.of("user", body.user(), "company", body.company(), "csrfToken", sessionCsrfService.ensureCsrf(session));
    }
}
