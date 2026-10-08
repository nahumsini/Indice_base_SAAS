package com.indice.erp.billing.signup;

import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Explicit public signup surface: session CSRF, durable network limit, then verified-email activation. */
@RestController
@RequestMapping("/api/v1/billing/signup/trial-entry")
public class PublicTrialEntryController {
    private final SessionCsrfService csrf;
    private final PublicTrialEntryService service;
    private final PublicTrialEntryRateLimit rate;

    public PublicTrialEntryController(SessionCsrfService csrf, PublicTrialEntryService service, PublicTrialEntryRateLimit rate) {
        this.csrf = csrf; this.service = service; this.rate = rate;
    }

    @GetMapping("/config")
    public PublicTrialEntryContracts.Config config() { return service.config(); }

    @PostMapping("/interest")
    public ResponseEntity<PublicTrialEntryContracts.Continuation> start(@RequestBody PublicTrialEntryContracts.Start input,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        @RequestHeader(name = "Idempotency-Key", required = false) String key,
        HttpServletRequest request, HttpSession session) {
        requireAllowed(session, token, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.start(input, key, session.getId()));
    }

    @PostMapping("/account")
    public ResponseEntity<PublicTrialEntryContracts.Result> activate(@RequestBody PublicTrialEntryContracts.Activate input,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        HttpServletRequest request, HttpSession session) {
        requireAllowed(session, token, request);
        var result = service.activate(input, session.getId());
        return ResponseEntity.status(result.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(result);
    }

    @PostMapping("/email-verification/start")
    public BillingSignupEmailVerificationResponse startVerification(@RequestBody PublicTrialEntryContracts.VerifyStart input,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        HttpServletRequest request, HttpSession session) {
        requireAllowed(session, token, request);
        return service.startVerification(input == null ? null : input.entryReference(), session.getId());
    }

    private void requireAllowed(HttpSession session, String token, HttpServletRequest request) {
        csrf.requireCsrf(session, token);
        // Ignore caller-controlled forwarded headers; edge must overwrite/protect its real-IP boundary.
        if (!rate.consume(request.getRemoteAddr())) {
            throw new BillingSignupEmailVerificationException(HttpStatus.TOO_MANY_REQUESTS,
                "TRIAL_ENTRY_RATE_LIMITED", "Too many signup attempts. Please try again later.");
        }
    }

    @PostMapping("/email-verification/verify")
    public BillingSignupEmailVerificationResponse verify(@RequestBody PublicTrialEntryContracts.VerifyCode input,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        HttpServletRequest request, HttpSession session) {
        requireAllowed(session, token, request);
        return service.verify(input, session.getId(), false);
    }

    @PostMapping("/email-verification/resend")
    public BillingSignupEmailVerificationResponse resend(@RequestBody PublicTrialEntryContracts.VerifyCode input,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        HttpServletRequest request, HttpSession session) {
        requireAllowed(session, token, request);
        return service.verify(input, session.getId(), true);
    }
}
