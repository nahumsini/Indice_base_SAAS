package com.indice.erp.billing.signup;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.auth.SignupTrialTerms;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.storage.StorageQuotaProperties;
import com.indice.erp.billing.stripe.BillingSignupCheckoutReconciliationService;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.support.SupportedCountryCodes;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
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
    private final BillingSignupEmailVerificationService emailVerificationService;
    private final BillingSignupEmailVerificationProperties emailVerificationProperties;
    private final BillingSignupIntentRepository repository;
    private final BillingSignupCheckoutReconciliationService reconciliation;
    private final StripePhaseTwoProperties properties;
    private final StorageQuotaProperties storageProperties;

    public BillingSignupController(
        SessionCsrfService csrf,
        CommercialOfferSelectionService offers,
        BillingSignupService service,
        BillingSignupEmailVerificationService emailVerificationService,
        BillingSignupEmailVerificationProperties emailVerificationProperties,
        BillingSignupIntentRepository repository,
        BillingSignupCheckoutReconciliationService reconciliation,
        StripePhaseTwoProperties properties,
        StorageQuotaProperties storageProperties
    ) {
        this.csrf = csrf;
        this.offers = offers;
        this.service = service;
        this.emailVerificationService = emailVerificationService;
        this.emailVerificationProperties = emailVerificationProperties;
        this.repository = repository;
        this.reconciliation = reconciliation;
        this.properties = properties;
        this.storageProperties = storageProperties;
    }

    @GetMapping("/config")
    public Map<String, Object> config(HttpSession session) {
        return Map.ofEntries(
            Map.entry("csrfToken", csrf.ensureCsrf(session)),
            Map.entry("checkoutEnabled", properties.isEnabled()),
            Map.entry("courtesyEnabled", service.provisioningEnabled()),
            Map.entry("provisioningEnabled", service.provisioningEnabled()),
            Map.entry("trialDays", SignupTrialTerms.TRIAL_DAYS),
            Map.entry("cardRequired", true),
            Map.entry("automaticCharge", true),
            Map.entry("includedSeats", 5),
            Map.entry("annualDiscountPercent", 20),
            Map.entry("includedConsultationsPerMonth", 1),
            Map.entry("consultationMinutes", 60),
            Map.entry("includedStorageGiB", gibibytes(storageProperties.getIncludedBytes())),
            Map.entry("storageBlockGiB", gibibytes(storageProperties.getBlockBytes())),
            Map.entry("storageBlockMonthlyAmountCents", 1_500),
            Map.entry("paymentGraceDays", 14),
            Map.entry("currency", "USD"),
            Map.entry("emailVerificationRequired", emailVerificationProperties.isEnabled()),
            Map.entry("launchCountries", SupportedCountryCodes.all()),
            Map.entry("products", offers.activeProducts("MONTH")),
            Map.entry("prices", offers.activePrices())
        );
    }

    private BigDecimal gibibytes(long bytes) {
        return BigDecimal.valueOf(bytes).divide(BigDecimal.valueOf(1L << 30));
    }

    @PostMapping("/email-verification/start")
    public ResponseEntity<BillingSignupEmailVerificationResponse> startEmailVerification(
        @RequestBody BillingSignupEmailVerificationStartRequest request,
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        csrf.requireCsrf(session, csrfToken);
        return ResponseEntity.status(HttpStatus.CREATED).body(emailVerificationService.start(request));
    }

    @PostMapping("/email-verification/resend")
    public BillingSignupEmailVerificationResponse resendEmailVerification(
        @RequestBody BillingSignupEmailVerificationResendRequest request,
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        csrf.requireCsrf(session, csrfToken);
        return emailVerificationService.resend(request);
    }

    @PostMapping("/email-verification/verify")
    public BillingSignupEmailVerificationResponse verifyEmail(
        @RequestBody BillingSignupEmailVerificationVerifyRequest request,
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        csrf.requireCsrf(session, csrfToken);
        return emailVerificationService.verify(request);
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
        intent = reconciliation.reconcileIfCompleted(intent);
        var provisioned = intent.provisioned();
        var requiresReview = "REQUIRES_REVIEW".equals(intent.provisioningStatus());
        var message = provisioned
            ? "Tu cuenta está lista. Ya puedes iniciar sesión."
            : requiresReview
                ? "Tu pago fue confirmado, pero necesitamos verificar la vinculación de tu correo antes de crear la cuenta."
                : "Estamos preparando tu cuenta. Esta página se actualizará automáticamente.";
        return ResponseEntity.ok(Map.of(
            "checkoutStatus", intent.status(),
            "provisioningStatus", intent.provisioningStatus(),
            "provisioned", provisioned,
            "loginReady", provisioned,
            "requiresReview", requiresReview,
            "message", message
        ));
    }
}
