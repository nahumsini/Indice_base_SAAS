package com.indice.erp.billing.signup;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import jakarta.servlet.http.HttpSession;
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
@RequestMapping("/api/v1/billing/signup")
public class BillingSignupController {

    private final SessionCsrfService csrf;
    private final CommercialOfferSelectionService offers;
    private final BillingSignupService service;
    private final BillingSignupIntentRepository repository;
    private final StripePhaseTwoProperties properties;

    public BillingSignupController(
        SessionCsrfService csrf,
        CommercialOfferSelectionService offers,
        BillingSignupService service,
        BillingSignupIntentRepository repository,
        StripePhaseTwoProperties properties
    ) {
        this.csrf = csrf;
        this.offers = offers;
        this.service = service;
        this.repository = repository;
        this.properties = properties;
    }

    @GetMapping("/config")
    public Map<String, Object> config(HttpSession session) {
        return Map.of(
            "csrfToken", csrf.ensureCsrf(session),
            "checkoutEnabled", properties.isEnabled(),
            "trialDays", 30,
            "cardRequired", true,
            "automaticCharge", true,
            "includedSeats", 5,
            "currency", "USD",
            "launchCountries", java.util.List.of("MX", "CA"),
            "products", offers.activeBasicProducts(),
            "prices", offers.activePrices()
        );
    }

    @PostMapping("/checkout")
    public ResponseEntity<BillingSignupService.SignupCheckoutResponse> checkout(
        @RequestBody BillingSignupRequest request,
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        csrf.requireCsrf(session, csrfToken);
        var response = service.createCheckout(request, idempotencyKey);
        return ResponseEntity.status(response.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(response);
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(@RequestParam("reference") String reference) {
        if (reference == null || !reference.matches("[a-f0-9]{64}")) {
            throw new IllegalArgumentException("A valid signup reference is required.");
        }
        var intent = repository.findByPublicReference(reference);
        if (intent == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
            "status", intent.status(),
            "provisioned", false
        ));
    }
}
