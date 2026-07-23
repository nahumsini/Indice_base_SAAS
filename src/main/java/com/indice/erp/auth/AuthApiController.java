package com.indice.erp.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final LoginAuditService loginAuditService;

    public AuthApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        LoginAuditService loginAuditService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.loginAuditService = loginAuditService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpSession session) {
        return sessionAuthService.currentSession(session)
            .<ResponseEntity<?>>map(body -> ResponseEntity.ok(sessionBody(body, session)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "message", "User is not authenticated"
            )));
    }

    @GetMapping("/csrf")
    public ResponseEntity<?> csrf(HttpSession session) {
        return ResponseEntity.ok(Map.of("csrfToken", sessionCsrfService.ensureCsrf(session)));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
        @RequestBody LoginRequest request,
        HttpSession session,
        HttpServletRequest servletRequest,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            loginAuditService.record(
                request == null ? "" : request.email(),
                null,
                null,
                null,
                false,
                ex.getMessage(),
                LoginAuditContext.from(servletRequest, session)
            );
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        var attempt = sessionAuthService.loginJson(
            request.companyName(),
            request.email(),
            request.password(),
            session,
            LoginAuditContext.from(servletRequest, session)
        );
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

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody SignupRequest request, HttpSession session) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of(
            "message", "Create account is completed through the signup trial flow."
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        sessionAuthService.logout(session);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/company")
    public ResponseEntity<?> switchCompany(
        @RequestBody SwitchCompanyRequest request,
        HttpSession session,
        HttpServletRequest servletRequest,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        if (request == null || request.company_id() == null || request.company_id() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "A valid company_id is required."));
        }
        if (!sessionAuthService.switchActiveCompany(session, request.company_id())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "message", "The requested company is not available for this session."
            ));
        }

        servletRequest.changeSessionId();
        sessionCsrfService.rotateCsrf(session);
        return sessionAuthService.currentSession(session)
            .<ResponseEntity<?>>map(body -> ResponseEntity.ok(sessionBody(body, session)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "The active company changed but the session could not be loaded."
            )));
    }

    public record LoginRequest(
        String companyName,
        String email,
        String password
    ) {
    }

    public record SwitchCompanyRequest(
        Long company_id
    ) {
    }

    private Map<String, Object> sessionBody(AuthSessionResponse body, HttpSession session) {
        return Map.of(
            "user", body.user(),
            "company", body.company(),
            "companies", body.companies(),
            "csrfToken", sessionCsrfService.ensureCsrf(session)
        );
    }
}
