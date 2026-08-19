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
    private final AuthLockoutService lockoutService;
    private final LoginMfaChallengeService mfaChallengeService;
    private final LoginSecurityEmailService loginSecurityEmailService;
    private final AuthSecurityProperties securityProperties;

    public AuthApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        LoginAuditService loginAuditService,
        AuthLockoutService lockoutService,
        LoginMfaChallengeService mfaChallengeService,
        LoginSecurityEmailService loginSecurityEmailService,
        AuthSecurityProperties securityProperties
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.loginAuditService = loginAuditService;
        this.lockoutService = lockoutService;
        this.mfaChallengeService = mfaChallengeService;
        this.loginSecurityEmailService = loginSecurityEmailService;
        this.securityProperties = securityProperties;
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
            recordPasswordAudit(request, "BLOCKED", AuthFailureReason.CSRF_INVALID, ex.getMessage(),
                null, null, null, null, null, LoginAuditContext.from(servletRequest, session));
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        if (request == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "message", "Invalid company, email, or password."
            ));
        }

        var auditContext = LoginAuditContext.from(servletRequest, session);
        var emailNormalized = normalize(request.email());
        var companyNameNormalized = normalize(request.companyName());
        var lockout = lockoutService.passwordLockout(emailNormalized, companyNameNormalized);
        if (lockout.locked()) {
            recordPasswordAudit(request, "BLOCKED", AuthFailureReason.ACCOUNT_LOCKED,
                "Account is temporarily locked.", null, null, null, null, lockout, auditContext);
            return ResponseEntity.status(HttpStatus.LOCKED).body(Map.of(
                "message", "Invalid login or account temporarily locked."
            ));
        }

        var verification = sessionAuthService.verifyLoginCredentials(
            request.companyName(),
            request.email(),
            request.password()
        );
        if (!verification.success()) {
            var lockable = !verification.emailNormalized().isBlank() && !verification.companyNameNormalized().isBlank();
            var failureLockout = lockable
                ? lockoutService.recordPasswordFailure(verification)
                : AuthLockoutService.LockoutState.open();
            recordCredentialAudit(verification, failureLockout.locked() ? "BLOCKED" : "FAILURE",
                verification.failureReasonCode(), verification.message(), failureLockout, auditContext);
            loginSecurityEmailService.sendPasswordFailure(verification, failureLockout, auditContext);
            return ResponseEntity.status(failureLockout.locked() ? HttpStatus.LOCKED : HttpStatus.UNAUTHORIZED).body(Map.of(
                "message", failureLockout.locked()
                    ? "Invalid login or account temporarily locked."
                    : "Invalid company, email, or password."
            ));
        }

        if (securityProperties.isMfaEnabled() && securityProperties.isMfaRequired()) {
            recordCredentialAudit(verification, "SUCCESS", AuthFailureReason.MFA_REQUIRED,
                "Password accepted; MFA required.", AuthLockoutService.LockoutState.open(), auditContext);
            var challenge = mfaChallengeService.startChallenge(verification.login(), session.getId(), auditContext);
            if (challenge.blocked()) {
                return ResponseEntity.status(HttpStatus.LOCKED).body(Map.of(
                    "message", challenge.message()
                ));
            }
            if (!challenge.started()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "message", challenge.message()
                ));
            }
            return ResponseEntity.ok(mfaBody(challenge));
        }

        recordCredentialAudit(verification, "SUCCESS", null,
            "Password accepted.", AuthLockoutService.LockoutState.open(), auditContext);
        servletRequest.changeSessionId();
        sessionAuthService.storeAuthenticatedSession(session, verification.login());
        sessionCsrfService.rotateCsrf(session);
        loginSecurityEmailService.sendLoginSuccess(verification.login(), auditContext);
        return sessionAuthService.currentSession(session)
            .<ResponseEntity<?>>map(body -> ResponseEntity.ok(sessionBody(body, session)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Session was created but could not be loaded"
            )));
    }

    @PostMapping("/login/otp/verify")
    public ResponseEntity<?> verifyOtp(
        @RequestBody LoginOtpVerifyRequest request,
        HttpSession session,
        HttpServletRequest servletRequest,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            loginAuditService.record(LoginAuditEvent.builder()
                .eventType("MFA_VERIFY")
                .stage("MFA")
                .outcome("BLOCKED")
                .failureReasonCode(AuthFailureReason.CSRF_INVALID)
                .failureMessageSafe(ex.getMessage())
                .context(LoginAuditContext.from(servletRequest, session))
                .build());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        var result = mfaChallengeService.verify(
            request == null ? "" : request.challengeId(),
            request == null ? "" : request.otpCode(),
            session.getId(),
            LoginAuditContext.from(servletRequest, session)
        );
        if (!result.success()) {
            return ResponseEntity.status(result.blocked() ? HttpStatus.LOCKED : HttpStatus.UNAUTHORIZED).body(Map.of(
                "message", result.message()
            ));
        }
        servletRequest.changeSessionId();
        sessionAuthService.storeAuthenticatedSession(session, result.login());
        sessionCsrfService.rotateCsrf(session);
        loginSecurityEmailService.sendLoginSuccess(result.login(), LoginAuditContext.from(servletRequest, session));
        return sessionAuthService.currentSession(session)
            .<ResponseEntity<?>>map(body -> ResponseEntity.ok(sessionBody(body, session)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Session was created but could not be loaded"
            )));
    }

    @PostMapping("/login/otp/resend")
    public ResponseEntity<?> resendOtp(
        @RequestBody LoginOtpResendRequest request,
        HttpSession session,
        HttpServletRequest servletRequest,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
        var result = mfaChallengeService.resendChallenge(
            request == null ? "" : request.challengeId(),
            session.getId(),
            LoginAuditContext.from(servletRequest, session)
        );
        if (result.blocked()) {
            return ResponseEntity.status(HttpStatus.LOCKED).body(Map.of("message", result.message()));
        }
        if (!result.started()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", result.message()));
        }
        return ResponseEntity.ok(mfaBody(result));
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

    public record LoginOtpVerifyRequest(
        String challengeId,
        String otpCode
    ) {
    }

    public record LoginOtpResendRequest(
        String challengeId
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

    private Map<String, Object> mfaBody(LoginMfaChallengeService.MfaStartResult challenge) {
        return Map.of(
            "mfaRequired", true,
            "challengeId", challenge.challengeReference(),
            "maskedDestination", challenge.maskedDestination(),
            "expiresInSeconds", challenge.expiresInSeconds(),
            "resendAvailableInSeconds", challenge.resendAvailableInSeconds()
        );
    }

    private void recordPasswordAudit(
        LoginRequest request,
        String outcome,
        String reasonCode,
        String safeMessage,
        Long userId,
        Long companyId,
        Long userCompanyId,
        String role,
        AuthLockoutService.LockoutState lockout,
        LoginAuditContext context
    ) {
        loginAuditService.record(LoginAuditEvent.builder()
            .eventType("LOGIN")
            .stage("PASSWORD")
            .outcome(outcome)
            .emailNormalized(normalize(request == null ? "" : request.email()))
            .companyNameNormalized(normalize(request == null ? "" : request.companyName()))
            .userId(userId)
            .companyId(companyId)
            .userCompanyId(userCompanyId)
            .role(role)
            .failureReasonCode(reasonCode)
            .failureMessageSafe(safeMessage)
            .context(context)
            .lockoutUntil(lockout == null ? null : lockout.lockedUntil())
            .attemptsUsed(lockout == null ? null : lockout.failureCount())
            .build());
    }

    private void recordCredentialAudit(
        LoginCredentialVerificationResult verification,
        String outcome,
        String reasonCode,
        String safeMessage,
        AuthLockoutService.LockoutState lockout,
        LoginAuditContext context
    ) {
        loginAuditService.record(LoginAuditEvent.builder()
            .eventType("LOGIN")
            .stage("PASSWORD")
            .outcome(outcome)
            .emailNormalized(verification.emailNormalized())
            .companyNameNormalized(verification.companyNameNormalized())
            .userId(verification.userId())
            .companyId(verification.companyId())
            .userCompanyId(verification.userCompanyId())
            .role(verification.role())
            .failureReasonCode(reasonCode)
            .failureMessageSafe(safeMessage)
            .context(context)
            .lockoutUntil(lockout.lockedUntil())
            .attemptsUsed(lockout.failureCount())
            .build());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
