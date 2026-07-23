package com.indice.erp.billing.stripe;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.auth.SignupCheckoutRequest;
import com.indice.erp.auth.SignupCheckoutResponse;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.signup.BillingSignupConflictException;
import com.indice.erp.billing.signup.BillingSignupIntent;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingSignupRequest;
import com.indice.erp.billing.signup.BillingSignupService;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/signup")
public class SignupCheckoutApiController {

    private static final List<String> ALL_BASIC_PRODUCT_CODES = List.of(
        "basic_hr",
        "basic_process_tasks",
        "basic_expenses",
        "basic_pos_inventory",
        "basic_sales_inventory",
        "basic_receivables"
    );

    private final SessionCsrfService sessionCsrfService;
    private final BillingSignupService signupService;
    private final BillingSignupIntentRepository signupIntents;
    private final BillingSignupCheckoutReconciliationService reconciliationService;

    public SignupCheckoutApiController(
        SessionCsrfService sessionCsrfService,
        BillingSignupService signupService,
        BillingSignupIntentRepository signupIntents,
        BillingSignupCheckoutReconciliationService reconciliationService
    ) {
        this.sessionCsrfService = sessionCsrfService;
        this.signupService = signupService;
        this.signupIntents = signupIntents;
        this.reconciliationService = reconciliationService;
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> createCheckout(
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
            var response = signupService.createCheckout(toBillingRequest(request), idempotencyKey(session, request));
            return ResponseEntity.status(response.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(
                new SignupCheckoutResponse(
                    response.checkoutUrl(),
                    response.checkoutSessionId(),
                    sessionCsrfService.ensureCsrf(session)
                )
            );
        } catch (BillingSignupConflictException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (StripeGatewayException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "message", "The billing provider could not complete the request."
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/checkout-status")
    public ResponseEntity<?> checkoutStatus(
        @RequestParam(name = "session_id", required = false) String sessionId
    ) {
        var normalizedSessionId = sessionId == null ? "" : sessionId.trim();
        if (normalizedSessionId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Checkout session id is required."));
        }
        var intent = signupIntents.findByCheckoutSessionId(normalizedSessionId);
        if (intent == null) {
            return ResponseEntity.ok(response("not_found", "Checkout session was not found.", null, true, false));
        }
        return ResponseEntity.ok(statusResponse(reconciliationService.reconcileIfCompleted(intent)));
    }

    private BillingSignupRequest toBillingRequest(SignupCheckoutRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Signup request is required.");
        }
        return new BillingSignupRequest(
            request.fullName(),
            request.email(),
            request.password(),
            request.companyName(),
            request.country(),
            request.phone(),
            request.industry(),
            request.companySize(),
            "MONTH",
            request.extraCollaborators(),
            selectedProductCodes(request)
        );
    }

    private List<String> selectedProductCodes(SignupCheckoutRequest request) {
        var planId = request.planId() == null ? "" : request.planId().trim().toLowerCase(Locale.ROOT);
        var codes = new LinkedHashSet<String>();
        for (var slug : request.selectedModuleSlugs() == null ? List.<String>of() : request.selectedModuleSlugs()) {
            switch (normalize(slug)) {
                case "human_resources" -> codes.add("basic_hr");
                case "processes" -> codes.add("basic_process_tasks");
                case "expenses", "petty_cash" -> codes.add("basic_expenses");
                case "pos", "inventory" -> codes.add("basic_pos_inventory");
                case "crm", "sales" -> codes.add("basic_sales_inventory");
                case "receivables" -> codes.add("basic_receivables");
                default -> {
                }
            }
        }
        if ("all-modules".equals(planId) || codes.size() > 3) {
            return ALL_BASIC_PRODUCT_CODES;
        }
        if (codes.isEmpty()) {
            return List.of("basic_hr");
        }
        return List.copyOf(codes);
    }

    private String idempotencyKey(HttpSession session, SignupCheckoutRequest request) {
        var sessionId = session == null ? "" : session.getId();
        return BillingHashing.sha256("auth-signup:" + sessionId + ":" + requestFingerprint(request));
    }

    private String requestFingerprint(SignupCheckoutRequest request) {
        if (request == null) {
            return "";
        }
        return String.join("|",
            clean(request.fullName()),
            clean(request.email()).toLowerCase(Locale.ROOT),
            clean(request.companyName()),
            clean(request.country()).toUpperCase(Locale.ROOT),
            clean(request.planId()),
            String.valueOf(request.extraCollaborators()),
            String.join(",", selectedProductCodes(request))
        );
    }

    private SignupCheckoutStatusResponse statusResponse(BillingSignupIntent intent) {
        var status = intent.status() == null ? "" : intent.status().trim().toUpperCase(Locale.ROOT);
        if (intent.provisioned()) {
            return response("completed", "Account setup is complete. You can sign in.", intent.companyId(), false, true);
        }
        return switch (status) {
            case "CHECKOUT_COMPLETED" -> response("pending", "Payment setup received. We are creating your account.", intent.companyId(), false, false);
            case "CHECKOUT_EXPIRED" -> response("expired", "Checkout expired after 30 minutes. Start account setup again.", null, true, false);
            case "CHECKOUT_FAILED" -> response("failed", "Checkout could not be completed.", null, true, false);
            case "PENDING", "CUSTOMER_CREATED", "CHECKOUT_CREATED" -> response("pending", "Payment setup received. We are creating your account.", null, false, false);
            default -> response("failed", "Checkout status could not be completed.", null, true, false);
        };
    }

    private SignupCheckoutStatusResponse response(
        String status,
        String message,
        Long companyId,
        boolean canRestart,
        boolean canLogin
    ) {
        return new SignupCheckoutStatusResponse(status, message, companyId, canRestart, canLogin);
    }

    private String normalize(String value) {
        return clean(value).toLowerCase(Locale.ROOT).replace("-", "_").replace(" ", "_");
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
