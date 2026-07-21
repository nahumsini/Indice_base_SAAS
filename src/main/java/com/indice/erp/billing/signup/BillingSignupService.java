package com.indice.erp.billing.signup;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.stripe.StripeCheckoutGateway;
import com.indice.erp.billing.stripe.StripeGatewayException;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class BillingSignupService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Set<String> LAUNCH_COUNTRIES = Set.of("MX", "CA");

    private final CommercialOfferSelectionService offerSelectionService;
    private final BillingSignupIntentRepository repository;
    private final StripeCheckoutGateway stripeGateway;
    private final StripePhaseTwoProperties properties;
    private final StripeSecretProvider secrets;
    private final BillingAuditService audit;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public BillingSignupService(
        CommercialOfferSelectionService offerSelectionService,
        BillingSignupIntentRepository repository,
        StripeCheckoutGateway stripeGateway,
        StripePhaseTwoProperties properties,
        StripeSecretProvider secrets,
        BillingAuditService audit,
        BCryptPasswordEncoder passwordEncoder,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.offerSelectionService = offerSelectionService;
        this.repository = repository;
        this.stripeGateway = stripeGateway;
        this.properties = properties;
        this.secrets = secrets;
        this.audit = audit;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public SignupCheckoutResponse createCheckout(BillingSignupRequest request, String idempotencyKey) {
        validate(request, idempotencyKey);
        secrets.requireEnabled();

        var extraSeats = request.extraSeats() == null ? 0 : request.extraSeats();
        var selection = offerSelectionService.select(request.selectedProductCodes(), request.billingInterval(), extraSeats);
        var normalizedRequest = normalizedRequest(
            request,
            selection.billingInterval().name(),
            selection.products().stream().map(product -> product.code()).toList()
        );
        var fingerprint = BillingHashing.sha256(json(normalizedRequest));
        var idempotencyHash = BillingHashing.sha256(idempotencyKey.trim());
        var intent = repository.createOrLoad(
            BillingHashing.randomReference(),
            idempotencyHash,
            fingerprint,
            request,
            normalizedRequest.email(),
            passwordEncoder.encode(request.password()),
            selection
        );

        if (intent.stripeCheckoutSessionId() != null && intent.checkoutUrl() != null) {
            audit.record("SIGNUP", "CHECKOUT_REPLAYED", "SUCCESS", idempotencyHash, null,
                intent.stripeCheckoutSessionId(), null, intent.id(), Map.of("status", intent.status()));
            return response(intent, true);
        }

        try {
            var spec = repository.checkoutSpec(intent.id());
            if (properties.getSuccessUrl().isBlank() || properties.getCancelUrl().isBlank()) {
                throw new IllegalStateException("Stripe checkout success and cancel URLs are required.");
            }
            var basePriceId = requirePriceId(spec.offerCode(), spec.billingInterval());
            var lineItems = new ArrayList<StripeCheckoutGateway.LineItem>();
            lineItems.add(new StripeCheckoutGateway.LineItem(basePriceId, 1));
            if (spec.extraSeats() > 0) {
                lineItems.add(new StripeCheckoutGateway.LineItem(
                    requirePriceId("extra_seat", spec.billingInterval()),
                    spec.extraSeats()
                ));
            }

            var customerId = intent.stripeCustomerId();
            if (customerId == null || customerId.isBlank()) {
                customerId = stripeGateway.createCustomer(
                    new StripeCheckoutGateway.CustomerCommand(
                        spec.email(),
                        spec.fullName(),
                        spec.phone(),
                        spec.countryCode(),
                        Map.of(
                            "indice_signup_ref", spec.publicReference(),
                            "indice_phase", "2"
                        )
                    ),
                    "indice-signup-customer-" + intent.id()
                ).id();
                repository.markCustomerCreated(intent.id(), customerId);
            }

            var metadata = new LinkedHashMap<String, String>();
            metadata.put("indice_signup_ref", spec.publicReference());
            metadata.put("indice_catalog_version", spec.catalogVersion());
            metadata.put("indice_offer_code", spec.offerCode());
            metadata.put("indice_product_codes", String.join(",", spec.productCodes()));
            metadata.put("indice_extra_seats", Integer.toString(spec.extraSeats()));
            metadata.put("indice_phase", "2");
            // Stripe requires expires_at to be at least 30 minutes in the future.
            // One extra minute prevents network/clock drift from crossing that boundary.
            var requestedExpiry = clock.instant().plus(Duration.ofMinutes(31));
            var checkout = stripeGateway.createCheckout(
                new StripeCheckoutGateway.CheckoutCommand(
                    customerId,
                    properties.getSuccessUrl(),
                    properties.getCancelUrl(),
                    properties.isAutomaticTaxEnabled(),
                    properties.isTaxIdCollectionEnabled(),
                    30,
                    requestedExpiry,
                    List.copyOf(lineItems),
                    Map.copyOf(metadata)
                ),
                "indice-signup-checkout-" + intent.id()
            );
            repository.markCheckoutCreated(intent.id(), checkout.id(), checkout.url(), checkout.expiresAt());
            var completed = repository.findById(intent.id());
            audit.record("SIGNUP", "CHECKOUT_CREATED", "SUCCESS", idempotencyHash, null,
                checkout.id(), null, intent.id(), Map.of("offerCode", spec.offerCode(), "extraSeats", spec.extraSeats()));
            return response(completed, false);
        } catch (StripeGatewayException | IllegalStateException exception) {
            repository.markFailure(intent.id(), "CHECKOUT_FAILED", exception.getMessage());
            audit.record("SIGNUP", "CHECKOUT_CREATED", "FAILED", idempotencyHash, null,
                null, null, intent.id(), Map.of("reason", exception.getClass().getSimpleName()));
            throw exception;
        }
    }

    private SignupCheckoutResponse response(BillingSignupIntent intent, boolean replayed) {
        return new SignupCheckoutResponse(
            intent.publicReference(),
            intent.status(),
            intent.stripeCheckoutSessionId(),
            intent.checkoutUrl(),
            intent.checkoutExpiresAt(),
            replayed,
            false
        );
    }

    private String requirePriceId(String offerCode, String interval) {
        var priceId = properties.priceId(offerCode, interval);
        if (priceId == null || priceId.isBlank() || !priceId.startsWith("price_")) {
            throw new IllegalStateException("The Stripe Price ID for " + offerCode + " / " + interval + " is not configured.");
        }
        return priceId;
    }

    private void validate(BillingSignupRequest request, String idempotencyKey) {
        if (request == null) {
            throw new IllegalArgumentException("Signup request is required.");
        }
        requireLength(request.fullName(), "Full name", 2, 160);
        requireLength(request.companyName(), "Company name", 2, 160);
        var email = request.email() == null ? "" : request.email().trim().toLowerCase(Locale.ROOT);
        if (email.length() > 190 || !EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("A valid email is required.");
        }
        if (request.password() == null || request.password().length() < 10 || request.password().length() > 200) {
            throw new IllegalArgumentException("Password must contain between 10 and 200 characters.");
        }
        var country = request.countryCode() == null ? "" : request.countryCode().trim().toUpperCase(Locale.ROOT);
        if (!LAUNCH_COUNTRIES.contains(country)) {
            throw new IllegalArgumentException("Country must be MX or CA during launch.");
        }
        if (idempotencyKey == null || idempotencyKey.trim().length() < 8 || idempotencyKey.trim().length() > 200) {
            throw new IllegalArgumentException("A valid Idempotency-Key header is required.");
        }
    }

    private void requireLength(String value, String field, int minimum, int maximum) {
        var length = value == null ? 0 : value.trim().length();
        if (length < minimum || length > maximum) {
            throw new IllegalArgumentException(field + " must contain between " + minimum + " and " + maximum + " characters.");
        }
    }

    private NormalizedSignupRequest normalizedRequest(
        BillingSignupRequest request,
        String normalizedBillingInterval,
        List<String> sortedProducts
    ) {
        return new NormalizedSignupRequest(
            request.fullName().trim(),
            request.email().trim().toLowerCase(Locale.ROOT),
            request.password(),
            request.companyName().trim(),
            request.countryCode().trim().toUpperCase(Locale.ROOT),
            blank(request.phone()),
            blank(request.industry()),
            blank(request.companySize()),
            normalizedBillingInterval,
            request.extraSeats() == null ? 0 : request.extraSeats(),
            sortedProducts
        );
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Signup request could not be fingerprinted.", exception);
        }
    }

    private String blank(String value) {
        return value == null ? "" : value.trim();
    }

    private record NormalizedSignupRequest(
        String fullName,
        String email,
        String password,
        String companyName,
        String countryCode,
        String phone,
        String industry,
        String companySize,
        String billingInterval,
        int extraSeats,
        List<String> selectedProductCodes
    ) {
    }

    public record SignupCheckoutResponse(
        String signupReference,
        String status,
        String checkoutSessionId,
        String checkoutUrl,
        java.time.Instant expiresAt,
        boolean replayed,
        boolean provisioned
    ) {
    }
}
