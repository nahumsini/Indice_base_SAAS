package com.indice.erp.billing.subscription;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.seats.SeatService;
import com.indice.erp.billing.signup.BillingSignupConflictException;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.stripe.StripeCheckoutGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.indice.erp.platformadmin.PlatformAdminService;
import java.sql.Statement;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class BillingActivationService {

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactions;
    private final CommercialOfferSelectionService offers;
    private final BillingSignupIntentRepository signupIntents;
    private final StripeCheckoutGateway stripeGateway;
    private final StripePhaseTwoProperties stripeProperties;
    private final StripeSecretProvider stripeSecrets;
    private final PlatformAdminService platformAdminService;
    private final BillingAuditService audit;
    private final BillingSelectionChangeService selectionChanges;
    private final SeatService seats;
    private final Clock clock;

    public BillingActivationService(
        JdbcTemplate jdbcTemplate,
        TransactionTemplate transactions,
        CommercialOfferSelectionService offers,
        BillingSignupIntentRepository signupIntents,
        StripeCheckoutGateway stripeGateway,
        StripePhaseTwoProperties stripeProperties,
        StripeSecretProvider stripeSecrets,
        PlatformAdminService platformAdminService,
        BillingAuditService audit,
        BillingSelectionChangeService selectionChanges,
        SeatService seats,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactions = transactions;
        this.offers = offers;
        this.signupIntents = signupIntents;
        this.stripeGateway = stripeGateway;
        this.stripeProperties = stripeProperties;
        this.stripeSecrets = stripeSecrets;
        this.platformAdminService = platformAdminService;
        this.audit = audit;
        this.selectionChanges = selectionChanges;
        this.seats = seats;
        this.clock = clock;
    }

    public BillingActivationResponse createCheckout(
        long companyId,
        long actorUserId,
        String idempotencyKey,
        BillingSelectionRequest request
    ) {
        stripeSecrets.requireEnabled();
        var cleanKey = requireIdempotencyKey(idempotencyKey);
        requireNoStripeSubscription(companyId);
        var selection = offers.select(
            request == null ? null : request.product_codes(),
            request == null ? null : request.billing_interval(),
            request == null || request.extra_seats() == null ? 0 : request.extra_seats(),
            request == null ? null : request.promotion_code()
        );
        var owner = owner(companyId, actorUserId);
        requireCapacity(companyId, selection);
        selectionChanges.saveDraft(
            companyId, actorUserId, "activation-draft-" + cleanKey, selection
        );
        var fingerprint = fingerprint(companyId, selection);
        var idempotencyHash = BillingHashing.sha256("billing-activation:" + companyId + ":" + cleanKey);
        var intentId = transactions.execute(status -> createOrLoadIntent(
            companyId,
            owner,
            selection,
            idempotencyHash,
            fingerprint
        ));
        if (intentId == null) throw new IllegalStateException("No se pudo preparar la activación de cobro.");

        var intent = signupIntents.findById(intentId);
        if (intent.checkoutUrl() != null && !intent.checkoutUrl().isBlank()) {
            return new BillingActivationResponse(
                intent.status(), intent.checkoutUrl(), intent.checkoutExpiresAt(), remainingTrialDays(companyId), true
            );
        }

        var spec = signupIntents.checkoutSpec(intentId);
        var customerId = activeCustomer(companyId);
        if (customerId == null || customerId.isBlank()) {
            customerId = stripeGateway.createCustomer(
                new StripeCheckoutGateway.CustomerCommand(
                    owner.email(), owner.fullName(), owner.phone(), owner.countryCode(),
                    Map.of(
                        "indice_signup_ref", spec.publicReference(),
                        "indice_company_id", Long.toString(companyId),
                        "indice_flow", "existing_company_activation"
                    )
                ),
                "indice-activation-customer-" + companyId
            ).id();
            saveCustomer(companyId, intentId, customerId);
        }
        signupIntents.markCustomerCreated(intentId, customerId);

        var metadata = new LinkedHashMap<String, String>();
        metadata.put("indice_signup_ref", spec.publicReference());
        metadata.put("indice_company_id", Long.toString(companyId));
        metadata.put("indice_catalog_version", spec.catalogVersion());
        metadata.put("indice_offer_code", spec.offerCode());
        metadata.put("indice_product_codes", String.join(",", spec.productCodes()));
        metadata.put("indice_extra_seats", Integer.toString(spec.extraSeats()));
        metadata.put("indice_flow", "existing_company_activation");

        var lineItems = new ArrayList<StripeCheckoutGateway.LineItem>();
        selection.lineItems().forEach(line -> lineItems.add(new StripeCheckoutGateway.LineItem(
            requirePriceId(line.externalPriceId(), line.billableCode(), spec.billingInterval()),
            line.quantity()
        )));
        var returnUrl = billingReturnUrl();
        var checkout = stripeGateway.createCheckout(
            new StripeCheckoutGateway.CheckoutCommand(
                customerId,
                appendQuery(returnUrl, "checkout", "success"),
                appendQuery(returnUrl, "checkout", "cancelled"),
                stripeProperties.isAutomaticTaxEnabled(),
                stripeProperties.isTaxIdCollectionEnabled(),
                remainingTrialDays(companyId),
                clock.instant().plus(Duration.ofMinutes(31)),
                List.copyOf(lineItems),
                Map.copyOf(metadata),
                selection.externalPromotionCodeId()
            ),
            "indice-activation-checkout-" + intentId
        );
        signupIntents.markCheckoutCreated(intentId, checkout.id(), checkout.url(), checkout.expiresAt());
        audit.record(
            "BILLING", "EXISTING_COMPANY_CHECKOUT_CREATED", "SUCCESS", idempotencyHash,
            null, checkout.id(), companyId, intentId,
            Map.of(
                "offerCode", selection.offerCode(),
                "productCodes", selection.products().stream().map(CommercialOfferSelection.Product::code).toList(),
                "extraSeats", selection.extraSeats(),
                "remainingTrialDays", remainingTrialDays(companyId)
            )
        );
        return new BillingActivationResponse(
            "CHECKOUT_CREATED", checkout.url(), checkout.expiresAt(), remainingTrialDays(companyId), false
        );
    }

    public boolean isActivationIntent(long intentId) {
        return jdbcTemplate.query(
            "SELECT intent_kind FROM billing_signup_intents WHERE id = ?",
            (rs, rowNum) -> "EXISTING_COMPANY_ACTIVATION".equals(rs.getString(1)),
            intentId
        ).stream().findFirst().orElse(false);
    }

    public void complete(long intentId, String customerId) {
        var detail = activationDetail(intentId);
        if (detail == null) return;
        var subscriptionCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM company_billing_subscriptions WHERE signup_intent_id = ?",
            Long.class,
            intentId
        );
        if (subscriptionCount == null || subscriptionCount == 0) return;
        var affected = new LinkedHashSet<Long>(effectiveBenefitProductIds(detail.companyId()));
        affected.addAll(effectiveTrialProductIds(detail.companyId()));
        affected.addAll(detail.productIds());
        transactions.executeWithoutResult(status -> {
            if (customerId != null && !customerId.isBlank()) saveCustomer(detail.companyId(), intentId, customerId);
            jdbcTemplate.update(
                "UPDATE company_seat_states SET included_seats = ?, purchased_extra_seats = ?, version = version + 1 WHERE company_id = ?",
                detail.includedSeats(), detail.extraSeats(), detail.companyId()
            );
            jdbcTemplate.update(
                "UPDATE company_benefit_grants SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP(6) WHERE company_id = ? AND benefit_type = 'PRODUCT' AND status = 'ACTIVE'",
                detail.companyId()
            );
            jdbcTemplate.update(
                "UPDATE company_trial_product_grants SET status = 'REVOKED' WHERE company_id = ? AND status = 'ACTIVE'",
                detail.companyId()
            );
        });
        affected.forEach(productId -> platformAdminService.synchronizeProductModuleAccess(detail.companyId(), productId));
        selectionChanges.completeCheckoutDraft(detail.companyId());
    }

    private long createOrLoadIntent(
        long companyId,
        Owner owner,
        CommercialOfferSelection selection,
        String idempotencyHash,
        String fingerprint
    ) {
        var existing = signupIntents.findByIdempotencyHash(idempotencyHash);
        if (existing != null) {
            if (!fingerprint.equals(existing.requestFingerprint())) {
                throw new BillingSignupConflictException("La llave de idempotencia ya se usó con otra configuración.");
            }
            return existing.id();
        }

        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO billing_signup_intents (
                        public_token_hash, request_idempotency_hash, request_fingerprint, status, intent_kind,
                        catalog_version_id, offer_code, billing_interval, currency,
                        included_seats, requested_extra_seats, estimated_amount_cents,
                        subtotal_amount_cents, discount_amount_cents, promotion_code,
                        full_name, email_normalized, password_hash, company_name,
                        country_code, phone, company_id, provisioning_status,
                        owner_user_id, owner_user_company_id, provisioned_at
                    ) VALUES (?, ?, ?, 'PENDING', 'EXISTING_COMPANY_ACTIVATION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PROVISIONED', ?, ?, CURRENT_TIMESTAMP(6))
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setString(1, BillingHashing.randomReference());
            statement.setString(2, idempotencyHash);
            statement.setString(3, fingerprint);
            statement.setLong(4, selection.catalogVersionId());
            statement.setString(5, selection.offerCode());
            statement.setString(6, selection.billingInterval().name());
            statement.setString(7, selection.currency());
            statement.setInt(8, selection.includedSeats());
            statement.setInt(9, selection.extraSeats());
            if (selection.estimatedAmountCents() == null) statement.setNull(10, java.sql.Types.BIGINT);
            else statement.setLong(10, selection.estimatedAmountCents());
            if (selection.subtotalAmountCents() == null) statement.setNull(11, java.sql.Types.BIGINT);
            else statement.setLong(11, selection.subtotalAmountCents());
            statement.setLong(12, selection.discountAmountCents());
            statement.setString(13, selection.promotionCode());
            statement.setString(14, owner.fullName());
            statement.setString(15, owner.email());
            statement.setString(16, owner.passwordHash());
            statement.setString(17, owner.companyName());
            statement.setString(18, owner.countryCode());
            statement.setString(19, owner.phone());
            statement.setLong(20, companyId);
            statement.setLong(21, owner.userId());
            statement.setLong(22, owner.membershipId());
            return statement;
        }, keys);
        var key = keys.getKey();
        if (key == null) throw new IllegalStateException("No se pudo crear la intención de activación.");
        var intentId = key.longValue();
        for (var product : selection.products()) {
            jdbcTemplate.update(
                "INSERT INTO billing_signup_intent_products (signup_intent_id, catalog_product_id) VALUES (?, ?)",
                intentId, product.id()
            );
        }
        return intentId;
    }

    private Owner owner(long companyId, long actorUserId) {
        var rows = jdbcTemplate.query(
            """
                SELECT company.name AS company_name, user.id AS user_id, ownership.owner_user_company_id,
                       COALESCE(NULLIF(user.full_name, ''), user.email) AS full_name,
                       LOWER(user.email) AS email, user.password_hash,
                       COALESCE(profile.phone, '') AS phone,
                       UPPER(COALESCE(NULLIF(profile.country, ''), 'MX')) AS country_code
                FROM companies company
                JOIN company_ownerships ownership ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
                JOIN users user ON user.id = ownership.owner_user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                WHERE company.id = ? AND ownership.owner_user_id = ?
                """,
            (rs, rowNum) -> new Owner(
                rs.getLong("user_id"),
                rs.getLong("owner_user_company_id"),
                rs.getString("company_name"),
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("password_hash"),
                rs.getString("phone"),
                normalizeCountry(rs.getString("country_code"))
            ),
            companyId, actorUserId
        );
        if (rows.isEmpty()) throw new IllegalArgumentException("Sólo el propietario puede activar el cobro de esta cuenta.");
        return rows.getFirst();
    }

    private void requireCapacity(long companyId, CommercialOfferSelection selection) {
        var snapshot = seats.snapshot(companyId);
        var selectedLimit = selection.includedSeats() + selection.extraSeats() + snapshot.benefitExtra();
        if (snapshot.usedAndReserved() > selectedLimit) {
            throw new IllegalArgumentException(
                "La capacidad seleccionada es menor que los usuarios activos e invitaciones pendientes."
            );
        }
    }

    private void requireNoStripeSubscription(long companyId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM company_billing_subscriptions WHERE company_id = ? AND stripe_subscription_id NOT LIKE 'internal\\_%' AND stripe_subscription_id NOT LIKE 'legacy\\_%' AND LOWER(status) NOT IN ('canceled', 'incomplete_expired')",
            Long.class,
            companyId
        );
        if (count != null && count > 0) throw new IllegalStateException("La cuenta ya tiene una suscripción Stripe administrable.");
    }

    private String activeCustomer(long companyId) {
        return jdbcTemplate.query(
            "SELECT stripe_customer_id FROM company_billing_customers WHERE company_id = ? AND status = 'ACTIVE' LIMIT 1",
            (rs, rowNum) -> rs.getString(1), companyId
        ).stream().findFirst().orElse(null);
    }

    private void saveCustomer(long companyId, long intentId, String customerId) {
        jdbcTemplate.update(
            """
                INSERT INTO company_billing_customers (company_id, stripe_customer_id, source_signup_intent_id, status)
                VALUES (?, ?, ?, 'ACTIVE')
                ON DUPLICATE KEY UPDATE stripe_customer_id = VALUES(stripe_customer_id), status = 'ACTIVE'
                """,
            companyId, customerId, intentId
        );
    }

    private int remainingTrialDays(long companyId) {
        var benefitEnd = maximumEnd(
            "SELECT MAX(ends_at) FROM company_benefit_grants WHERE company_id = ? AND status = 'ACTIVE'",
            companyId
        );
        var signupTrialEnd = maximumEnd(
            "SELECT MAX(ends_at) FROM company_trial_product_grants WHERE company_id = ? AND status = 'ACTIVE'",
            companyId
        );
        var end = benefitEnd == null
            ? signupTrialEnd
            : signupTrialEnd == null || benefitEnd.isAfter(signupTrialEnd) ? benefitEnd : signupTrialEnd;
        if (end == null || !end.isAfter(clock.instant())) return 0;
        var seconds = Duration.between(clock.instant(), end).getSeconds();
        return (int) Math.min(30, Math.max(1, (seconds + 86_399) / 86_400));
    }

    private Instant maximumEnd(String query, long companyId) {
        return jdbcTemplate.query(
            query,
            (rs, rowNum) -> {
                var timestamp = rs.getTimestamp(1);
                return timestamp == null ? null : timestamp.toInstant();
            }, companyId
        ).stream().findFirst().orElse(null);
    }

    private ActivationDetail activationDetail(long intentId) {
        var rows = jdbcTemplate.query(
            "SELECT company_id, included_seats, requested_extra_seats FROM billing_signup_intents WHERE id = ? AND intent_kind = 'EXISTING_COMPANY_ACTIVATION'",
            (rs, rowNum) -> new ActivationDetail(
                rs.getLong(1), rs.getInt(2), rs.getInt(3), List.<Long>of()
            ), intentId
        );
        if (rows.isEmpty()) return null;
        var base = rows.getFirst();
        var products = jdbcTemplate.query(
            "SELECT catalog_product_id FROM billing_signup_intent_products WHERE signup_intent_id = ?",
            (rs, rowNum) -> rs.getLong(1), intentId
        );
        return new ActivationDetail(base.companyId(), base.includedSeats(), base.extraSeats(), products);
    }

    private List<Long> effectiveBenefitProductIds(long companyId) {
        return jdbcTemplate.query(
            "SELECT DISTINCT catalog_product_id FROM company_benefit_grants WHERE company_id = ? AND benefit_type = 'PRODUCT' AND status = 'ACTIVE'",
            (rs, rowNum) -> rs.getLong(1), companyId
        );
    }

    private List<Long> effectiveTrialProductIds(long companyId) {
        return jdbcTemplate.query(
            "SELECT DISTINCT catalog_product_id FROM company_trial_product_grants WHERE company_id = ? AND status = 'ACTIVE'",
            (rs, rowNum) -> rs.getLong(1), companyId
        );
    }

    private String fingerprint(long companyId, CommercialOfferSelection selection) {
        return BillingHashing.sha256(String.join("|",
            Long.toString(companyId), selection.catalogVersion(), selection.offerCode(),
            selection.billingInterval().name(), Integer.toString(selection.extraSeats()),
            String.join(",", selection.products().stream().map(CommercialOfferSelection.Product::code).toList())
        ));
    }

    private String requirePriceId(String offerCode, String interval) {
        return requirePriceId(null, offerCode, interval);
    }

    private String requirePriceId(String catalogPriceId, String offerCode, String interval) {
        var priceId = catalogPriceId != null && catalogPriceId.startsWith("price_")
            ? catalogPriceId
            : stripeProperties.priceId(offerCode, interval);
        if (priceId == null || !priceId.startsWith("price_")) {
            throw new IllegalStateException("El precio Stripe para " + offerCode + " / " + interval + " no está configurado.");
        }
        return priceId;
    }

    private String requireIdempotencyKey(String value) {
        var clean = value == null ? "" : value.trim();
        if (clean.length() < 8 || clean.length() > 120) throw new IllegalArgumentException("Se requiere una llave de idempotencia válida.");
        return clean.replaceAll("[^a-zA-Z0-9._-]", "-");
    }

    private String billingReturnUrl() {
        var value = stripeProperties.getPortalReturnUrl();
        if (value == null || value.isBlank()) throw new IllegalStateException("La URL de regreso de facturación no está configurada.");
        return value;
    }

    private String appendQuery(String url, String key, String value) {
        return url + (url.contains("?") ? "&" : "?") + key + "=" + value;
    }

    private String normalizeCountry(String value) {
        var country = value == null ? "MX" : value.trim().toUpperCase(Locale.ROOT);
        return country.matches("[A-Z]{2}") ? country : "MX";
    }

    private record Owner(
        long userId,
        long membershipId,
        String companyName,
        String fullName,
        String email,
        String passwordHash,
        String phone,
        String countryCode
    ) {
    }

    private record ActivationDetail(long companyId, int includedSeats, int extraSeats, List<Long> productIds) {
    }
}
