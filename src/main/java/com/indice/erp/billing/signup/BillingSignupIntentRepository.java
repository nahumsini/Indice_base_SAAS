package com.indice.erp.billing.signup;

import com.indice.erp.billing.catalog.CommercialOfferSelection;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class BillingSignupIntentRepository {

    private final JdbcTemplate jdbcTemplate;

    public BillingSignupIntentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public BillingSignupIntent createOrLoad(
        String publicReference,
        String idempotencyHash,
        String fingerprint,
        BillingSignupRequest request,
        String emailNormalized,
        String passwordHash,
        CommercialOfferSelection selection
    ) {
        var existing = findByIdempotencyHash(idempotencyHash);
        if (existing != null) {
            requireSameFingerprint(existing, fingerprint);
            return existing;
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        try {
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO billing_signup_intents (
                            public_token_hash, request_idempotency_hash, request_fingerprint,
                            catalog_version_id, offer_code, billing_interval, currency,
                            included_seats, requested_extra_seats, estimated_amount_cents,
                            full_name, email_normalized, password_hash, company_name,
                            country_code, phone, industry, company_size
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                    new String[] {"id"}
                );
                statement.setString(1, publicReference);
                statement.setString(2, idempotencyHash);
                statement.setString(3, fingerprint);
                statement.setLong(4, selection.catalogVersionId());
                statement.setString(5, selection.offerCode());
                statement.setString(6, selection.billingInterval().name());
                statement.setString(7, selection.currency());
                statement.setInt(8, selection.includedSeats());
                statement.setInt(9, selection.extraSeats());
                if (selection.estimatedAmountCents() == null) {
                    statement.setNull(10, java.sql.Types.BIGINT);
                } else {
                    statement.setLong(10, selection.estimatedAmountCents());
                }
                statement.setString(11, request.fullName().trim());
                statement.setString(12, emailNormalized);
                statement.setString(13, passwordHash);
                statement.setString(14, request.companyName().trim());
                statement.setString(15, request.countryCode().trim().toUpperCase(java.util.Locale.ROOT));
                statement.setString(16, blankToNull(request.phone()));
                statement.setString(17, blankToNull(request.industry()));
                statement.setString(18, blankToNull(request.companySize()));
                return statement;
            }, keyHolder);
        } catch (DuplicateKeyException exception) {
            var concurrent = findByIdempotencyHash(idempotencyHash);
            if (concurrent == null) {
                throw exception;
            }
            requireSameFingerprint(concurrent, fingerprint);
            return concurrent;
        }

        var id = keyHolder.getKey().longValue();
        for (var product : selection.products()) {
            jdbcTemplate.update(
                "INSERT INTO billing_signup_intent_products (signup_intent_id, catalog_product_id) VALUES (?, ?)",
                id,
                product.id()
            );
        }
        return findById(id);
    }

    public BillingSignupIntent findById(long id) {
        var rows = jdbcTemplate.query(
            selectSql("id = ?"),
            (rs, rowNum) -> map(rs),
            id
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public BillingSignupIntent findByPublicReference(String publicReference) {
        var rows = jdbcTemplate.query(
            selectSql("public_token_hash = ?"),
            (rs, rowNum) -> map(rs),
            publicReference
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public BillingSignupIntent findByIdempotencyHash(String hash) {
        var rows = jdbcTemplate.query(selectSql("request_idempotency_hash = ?"), (rs, rowNum) -> map(rs), hash);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public BillingSignupIntent findByCheckoutSessionId(String sessionId) {
        var rows = jdbcTemplate.query(selectSql("stripe_checkout_session_id = ?"), (rs, rowNum) -> map(rs), sessionId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public BillingSignupIntent findBySubscriptionId(String subscriptionId) {
        var rows = jdbcTemplate.query(selectSql("stripe_subscription_id = ?"), (rs, rowNum) -> map(rs), subscriptionId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public BillingSignupIntent findByStripeCustomerId(String customerId) {
        var rows = jdbcTemplate.query(
            selectSql("stripe_customer_id = ? ORDER BY id DESC LIMIT 1"),
            (rs, rowNum) -> map(rs),
            customerId
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public ProvisioningSpec lockProvisioningSpec(long intentId) {
        var rows = jdbcTemplate.query(
            """
                SELECT i.id, i.status, i.provisioning_status, i.catalog_version_id,
                       i.full_name, i.email_normalized, i.password_hash, i.company_name,
                       i.country_code, i.phone, i.stripe_customer_id,
                       i.completed_at, i.company_id, i.owner_user_id, i.owner_user_company_id
                FROM billing_signup_intents i
                WHERE i.id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new ProvisioningSpec(
                rs.getLong("id"),
                rs.getString("status"),
                rs.getString("provisioning_status"),
                rs.getLong("catalog_version_id"),
                rs.getString("full_name"),
                rs.getString("email_normalized"),
                rs.getString("password_hash"),
                rs.getString("company_name"),
                rs.getString("country_code"),
                rs.getString("phone"),
                rs.getString("stripe_customer_id"),
                instant(rs.getTimestamp("completed_at")),
                (Long) rs.getObject("company_id"),
                (Long) rs.getObject("owner_user_id"),
                (Long) rs.getObject("owner_user_company_id")
            ),
            intentId
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public List<Long> findProvisionableIds(int limit) {
        return jdbcTemplate.query(
            """
                SELECT id
                FROM billing_signup_intents
                WHERE status = 'CHECKOUT_COMPLETED'
                  AND provisioning_status IN ('NOT_STARTED', 'IN_PROGRESS')
                ORDER BY completed_at, id
                LIMIT ?
                """,
            (rs, rowNum) -> rs.getLong(1),
            Math.max(1, Math.min(limit, 100))
        );
    }

    public void markProvisioningStarted(long intentId) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET provisioning_status = 'IN_PROGRESS',
                    provisioning_attempt_count = provisioning_attempt_count + 1,
                    provisioning_started_at = CURRENT_TIMESTAMP(6),
                    provisioning_error_code = NULL,
                    provisioning_error_message = NULL,
                    version = version + 1
                WHERE id = ?
                  AND provisioning_status IN ('NOT_STARTED', 'IN_PROGRESS')
                """,
            intentId
        );
    }

    public void markProvisioned(long intentId, long companyId, long ownerUserId, long ownerUserCompanyId) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET company_id = ?, owner_user_id = ?, owner_user_company_id = ?,
                    provisioning_status = 'PROVISIONED', provisioned_at = CURRENT_TIMESTAMP(6),
                    provisioning_error_code = NULL, provisioning_error_message = NULL,
                    version = version + 1
                WHERE id = ?
                """,
            companyId,
            ownerUserId,
            ownerUserCompanyId,
            intentId
        );
    }

    public void markProvisioningReview(long intentId, String code, String message) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET provisioning_status = 'REQUIRES_REVIEW',
                    provisioning_error_code = ?, provisioning_error_message = ?,
                    version = version + 1
                WHERE id = ?
                """,
            code,
            truncate(message, 500),
            intentId
        );
    }

    public List<Long> productIds(long intentId) {
        return jdbcTemplate.query(
            "SELECT catalog_product_id FROM billing_signup_intent_products WHERE signup_intent_id = ? ORDER BY catalog_product_id",
            (rs, rowNum) -> rs.getLong(1),
            intentId
        );
    }

    public CheckoutSpec checkoutSpec(long intentId) {
        var rows = jdbcTemplate.query(
            """
                SELECT i.id, i.public_token_hash, i.offer_code, i.billing_interval, i.currency,
                       requested_extra_seats, full_name, email_normalized, company_name,
                       country_code, phone, cv.version_code AS catalog_version
                FROM billing_signup_intents i
                JOIN billing_catalog_versions cv ON cv.id = i.catalog_version_id
                WHERE i.id = ?
                """,
            (rs, rowNum) -> new CheckoutSpec(
                rs.getLong("id"),
                rs.getString("public_token_hash"),
                rs.getString("offer_code"),
                rs.getString("billing_interval"),
                rs.getString("currency"),
                rs.getInt("requested_extra_seats"),
                rs.getString("full_name"),
                rs.getString("email_normalized"),
                rs.getString("company_name"),
                rs.getString("country_code"),
                rs.getString("phone"),
                rs.getString("catalog_version"),
                List.of()
            ),
            intentId
        );
        if (rows.isEmpty()) {
            throw new IllegalStateException("Signup intent no longer exists.");
        }
        var base = rows.getFirst();
        var productCodes = jdbcTemplate.query(
            """
                SELECT p.product_code
                FROM billing_signup_intent_products ip
                JOIN billing_catalog_products p ON p.id = ip.catalog_product_id
                WHERE ip.signup_intent_id = ?
                ORDER BY p.sort_order, p.id
                """,
            (rs, rowNum) -> rs.getString(1),
            intentId
        );
        return new CheckoutSpec(
            base.id(), base.publicReference(), base.offerCode(), base.billingInterval(), base.currency(),
            base.extraSeats(), base.fullName(), base.email(), base.companyName(), base.countryCode(), base.phone(),
            base.catalogVersion(), productCodes
        );
    }

    public void markCustomerCreated(long id, String customerId) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET stripe_customer_id = ?, status = 'CUSTOMER_CREATED', version = version + 1
                WHERE id = ? AND stripe_customer_id IS NULL
                """,
            customerId,
            id
        );
    }

    public void markCheckoutCreated(long id, String sessionId, String url, Instant expiresAt) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET stripe_checkout_session_id = ?, checkout_url = ?, checkout_expires_at = ?,
                    status = 'CHECKOUT_CREATED', failure_code = NULL, failure_message = NULL,
                    version = version + 1
                WHERE id = ?
                """,
            sessionId,
            url,
            Timestamp.from(expiresAt),
            id
        );
    }

    public void markFailure(long id, String code, String message) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET failure_code = ?, failure_message = ?, version = version + 1
                WHERE id = ?
                """,
            code,
            truncate(message, 500),
            id
        );
    }

    public void markCheckoutCompleted(
        long id,
        String eventId,
        Instant eventCreatedAt,
        String customerId,
        String checkoutSessionId,
        String subscriptionId
    ) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET status = 'CHECKOUT_COMPLETED', stripe_customer_id = COALESCE(stripe_customer_id, ?),
                    stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, ?),
                    stripe_subscription_id = COALESCE(stripe_subscription_id, ?),
                    last_stripe_event_id = ?, last_stripe_event_created_at = ?, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP(6)),
                    version = version + 1
                WHERE id = ?
                  AND (last_stripe_event_created_at IS NULL OR last_stripe_event_created_at <= ?)
                """,
            customerId,
            checkoutSessionId,
            subscriptionId,
            eventId,
            Timestamp.from(eventCreatedAt),
            id,
            Timestamp.from(eventCreatedAt)
        );
    }

    public void markCheckoutExpired(long id, String eventId, Instant eventCreatedAt) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET status = 'CHECKOUT_EXPIRED', last_stripe_event_id = ?, last_stripe_event_created_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND status <> 'CHECKOUT_COMPLETED'
                  AND (last_stripe_event_created_at IS NULL OR last_stripe_event_created_at <= ?)
                """,
            eventId,
            Timestamp.from(eventCreatedAt),
            id,
            Timestamp.from(eventCreatedAt)
        );
    }

    public void attachSubscription(long id, String subscriptionId, String eventId, Instant eventCreatedAt) {
        jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET stripe_subscription_id = COALESCE(stripe_subscription_id, ?),
                    last_stripe_event_id = ?, last_stripe_event_created_at = ?, version = version + 1
                WHERE id = ?
                  AND (last_stripe_event_created_at IS NULL OR last_stripe_event_created_at <= ?)
                """,
            subscriptionId,
            eventId,
            Timestamp.from(eventCreatedAt),
            id,
            Timestamp.from(eventCreatedAt)
        );
    }

    public int expireStaleCheckouts() {
        return jdbcTemplate.update(
            """
                UPDATE billing_signup_intents
                SET status = 'CHECKOUT_EXPIRED', version = version + 1
                WHERE status IN ('PENDING', 'CUSTOMER_CREATED', 'CHECKOUT_CREATED')
                  AND checkout_expires_at IS NOT NULL
                  AND checkout_expires_at < CURRENT_TIMESTAMP(6)
                """
        );
    }

    private void requireSameFingerprint(BillingSignupIntent intent, String fingerprint) {
        if (!intent.requestFingerprint().equals(fingerprint)) {
            throw new BillingSignupConflictException("Idempotency-Key was already used with another signup request.");
        }
    }

    private String selectSql(String where) {
        return """
            SELECT id, public_token_hash, request_idempotency_hash, request_fingerprint, status,
                   stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id,
                   checkout_url, checkout_expires_at, provisioning_status, company_id,
                   owner_user_id, owner_user_company_id
            FROM billing_signup_intents
            WHERE %s
            """.formatted(where);
    }

    private BillingSignupIntent map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new BillingSignupIntent(
            rs.getLong("id"),
            rs.getString("public_token_hash"),
            rs.getString("request_idempotency_hash"),
            rs.getString("request_fingerprint"),
            rs.getString("status"),
            rs.getString("stripe_customer_id"),
            rs.getString("stripe_checkout_session_id"),
            rs.getString("stripe_subscription_id"),
            rs.getString("checkout_url"),
            instant(rs.getTimestamp("checkout_expires_at")),
            rs.getString("provisioning_status"),
            (Long) rs.getObject("company_id"),
            (Long) rs.getObject("owner_user_id"),
            (Long) rs.getObject("owner_user_company_id")
        );
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    public record CheckoutSpec(
        long id,
        String publicReference,
        String offerCode,
        String billingInterval,
        String currency,
        int extraSeats,
        String fullName,
        String email,
        String companyName,
        String countryCode,
        String phone,
        String catalogVersion,
        List<String> productCodes
    ) {
    }

    public record ProvisioningSpec(
        long id,
        String checkoutStatus,
        String provisioningStatus,
        long catalogVersionId,
        String fullName,
        String email,
        String passwordHash,
        String companyName,
        String countryCode,
        String phone,
        String stripeCustomerId,
        Instant completedAt,
        Long companyId,
        Long ownerUserId,
        Long ownerUserCompanyId
    ) {
    }
}
