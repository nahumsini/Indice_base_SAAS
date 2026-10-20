package com.indice.erp.billing.signup;

import com.indice.erp.auth.*;
import com.indice.erp.billing.subscription.BillingAccountAuthorityService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/billing/subscription/trial-payment")
public class PublicTrialPaymentController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final ManagedCompanyContextService contexts;
    private final PublicTrialPaymentService payments;

    public PublicTrialPaymentController(SessionAuthService auth, SessionCsrfService csrf,
        ManagedCompanyContextService contexts, PublicTrialPaymentService payments) {
        this.auth = auth; this.csrf = csrf; this.contexts = contexts; this.payments = payments;
    }

    @GetMapping public ResponseEntity<?> current(HttpSession session, @RequestParam(defaultValue = "MONTH") String interval) {
        return authorized(session, null, false, (company, actor) -> payments.workspace(company, actor, interval));
    }

    @PostMapping public ResponseEntity<?> activate(HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        @RequestHeader(name = "Idempotency-Key", required = false) String key,
        @RequestBody PublicTrialPaymentContracts.Activation request) {
        return authorized(session, token, true, (company, actor) -> payments.activate(company, actor, key, request));
    }

    private ResponseEntity<?> authorized(HttpSession session, String token, boolean mutation, Action action) {
        var actor = auth.currentActor(session).orElse(null);
        if (actor == null) return error(401, "AUTHENTICATION_REQUIRED");
        if (mutation) {
            try { csrf.requireCsrf(session, token); }
            catch (IllegalArgumentException ex) { return error(403, "CSRF_REQUIRED"); }
        }
        try {
            var context = contexts.resolveBillingContext(actor, session);
            // A distributor or platform review context cannot accept a customer's financial mandate.
            if (context.delegated() || context.readOnly()) return error(403, "OWNER_PAYMENT_CONTEXT_REQUIRED");
            return ResponseEntity.ok(action.run(context.companyId(), actor.userId()));
        } catch (ManagedCompanyContextForbiddenException | BillingAccountAuthorityService.BillingOwnerRequiredException ex) {
            return error(403, "OWNER_PAYMENT_CONTEXT_REQUIRED");
        } catch (BillingSignupConflictException ex) { return error(409, "PAYMENT_QUOTE_CHANGED"); }
        catch (IllegalArgumentException ex) { return error(400, "INVALID_PAYMENT_CONSENT"); }
        catch (IllegalStateException ex) { return error(503, "REGIONAL_PAYMENT_UNAVAILABLE"); }
        catch (com.indice.erp.billing.stripe.StripeGatewayException ex) { return error(503, "REGIONAL_PAYMENT_UNAVAILABLE"); }
    }
    private static ResponseEntity<?> error(int status, String code) { return ResponseEntity.status(status).body(Map.of("code", code)); }
    private interface Action { Object run(long companyId, long actorUserId); }
}
