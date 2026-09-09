package com.indice.erp.billing.catalog;

import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Resolves new add-on lines from the subscription's agreed catalog, including superseded versions. */
@Service
public class SubscriptionCatalogPriceResolver {

    private static final long MAX_AMOUNT_CENTS = 100_000_000L;
    private final JdbcTemplate jdbc;
    private final StripePhaseTwoProperties stripe;

    public SubscriptionCatalogPriceResolver(JdbcTemplate jdbc, StripePhaseTwoProperties stripe) {
        this.jdbc = jdbc;
        this.stripe = stripe;
    }

    @Transactional
    public String resolve(long companyId, String stripeSubscriptionId, String billableCode, String billingInterval) {
        var kind = switch (normalized(billableCode)) {
            case "EXTRA_SEAT" -> "SEAT";
            case "STORAGE_BLOCK" -> "STORAGE";
            default -> throw new IllegalArgumentException("Unsupported subscription add-on.");
        };
        var interval = normalized(billingInterval);
        if (companyId <= 0 || stripeSubscriptionId == null || stripeSubscriptionId.isBlank()
            || !List.of("MONTH", "YEAR").contains(interval)) {
            throw new IllegalArgumentException("A company, subscription and valid billing interval are required.");
        }
        var mode = normalized(stripe.getMode());
        if (!List.of("TEST", "LIVE").contains(mode)) {
            throw new IllegalStateException("Stripe mode must be TEST or LIVE.");
        }
        var subscriptions = jdbc.query("""
            SELECT subscription.catalog_version_id, subscription.currency, subscription.billing_interval,
                   subscription.status, version.status AS version_status
            FROM company_billing_subscriptions subscription
            LEFT JOIN billing_catalog_versions version ON version.id = subscription.catalog_version_id
            WHERE subscription.company_id = ? AND subscription.stripe_subscription_id = ?
            FOR UPDATE
            """, (rs, row) -> new Subscription(
                (Long) rs.getObject("catalog_version_id"), rs.getString("currency"),
                rs.getString("billing_interval"), rs.getString("status"), rs.getString("version_status")
            ), companyId, stripeSubscriptionId);
        if (subscriptions.size() != 1) {
            throw new IllegalStateException("The subscription is not available for this company.");
        }
        var subscription = subscriptions.getFirst();
        if (subscription.versionId() == null
            || !List.of("ACTIVE", "SUPERSEDED").contains(normalized(subscription.versionStatus()))
            || !List.of("TRIALING", "ACTIVE", "PAST_DUE").contains(normalized(subscription.status()))
            || !interval.equals(normalized(subscription.interval()))
            || !"USD".equals(normalized(subscription.currency()))) {
            throw new IllegalStateException("The subscription's published catalog, currency or interval is unavailable.");
        }

        // Retained legacy rows can coexist with modern products after V225. A modern product
        // must be valid in its own right; an incomplete one must never fall back to a legacy price.
        var products = jdbc.query("""
            SELECT id, active, external_product_id, stripe_mode, stripe_account_id,
                   stripe_verified_at, stripe_sync_status
            FROM billing_catalog_products
            WHERE catalog_version_id = ? AND commercial_kind = ?
            FOR UPDATE
            """, (rs, row) -> new Product(rs.getLong("id"), rs.getBoolean("active"),
                rs.getString("external_product_id"), rs.getString("stripe_mode"),
                rs.getString("stripe_account_id"), rs.getTimestamp("stripe_verified_at"),
                rs.getString("stripe_sync_status")), subscription.versionId(), kind);
        Product product = null;
        if (!products.isEmpty()) {
            var active = products.stream().filter(Product::active).toList();
            if (active.size() != 1) throw unavailablePrice();
            product = active.getFirst();
            if (!validId(product.externalId(), "prod_") || !mode.equals(normalized(product.mode()))
                || !validId(product.accountId(), "acct_") || product.verifiedAt() == null
                || !"READY".equals(normalized(product.syncStatus()))) {
                throw unavailablePrice();
            }
        }
        var pricePredicate = product == null
            ? "catalog_product_id IS NULL AND BINARY billable_code = BINARY ?"
            : "catalog_product_id = ?";
        Object productReference = product == null ? normalized(billableCode).toLowerCase(Locale.ROOT) : product.id();
        var prices = jdbc.query("""
            SELECT unit_amount_cents, external_price_id, status, stripe_mode, stripe_account_id,
                   stripe_verified_at, stripe_sync_status, stripe_tax_behavior
            FROM billing_catalog_prices
            WHERE catalog_version_id = ? AND billing_interval = ? AND currency = ? AND
            """ + pricePredicate + " FOR UPDATE", this::price,
            subscription.versionId(), interval, normalized(subscription.currency()), productReference);
        if (prices.size() != 1) throw unavailablePrice();
        var price = prices.getFirst();
        if (price.amountCents() == null || price.amountCents() <= 0 || price.amountCents() > MAX_AMOUNT_CENTS
            || !validId(price.externalId(), "price_")
            || !List.of("READY", "ACTIVE").contains(normalized(price.status()))
            || !mode.equals(normalized(price.mode())) || !validId(price.accountId(), "acct_")
            || price.verifiedAt() == null || !"READY".equals(normalized(price.syncStatus()))
            || !"EXCLUSIVE".equals(normalized(price.taxBehavior()))
            || (product != null && !product.accountId().equals(price.accountId()))) {
            throw unavailablePrice();
        }
        return price.externalId();
    }

    private Price price(ResultSet rs, int row) throws SQLException {
        return new Price((Long) rs.getObject("unit_amount_cents"), rs.getString("external_price_id"),
            rs.getString("status"), rs.getString("stripe_mode"), rs.getString("stripe_account_id"),
            rs.getTimestamp("stripe_verified_at"), rs.getString("stripe_sync_status"),
            rs.getString("stripe_tax_behavior"));
    }

    private boolean validId(String value, String prefix) {
        return value != null && value.startsWith(prefix) && value.length() > prefix.length()
            && value.length() <= 255 && value.chars().noneMatch(Character::isWhitespace);
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private IllegalStateException unavailablePrice() {
        return new IllegalStateException("The subscription's catalog does not have one verified price for this add-on and billing interval.");
    }

    private record Subscription(Long versionId, String currency, String interval, String status, String versionStatus) { }
    private record Product(long id, boolean active, String externalId, String mode, String accountId,
                           Timestamp verifiedAt, String syncStatus) { }
    private record Price(Long amountCents, String externalId, String status, String mode, String accountId,
                         Timestamp verifiedAt, String syncStatus, String taxBehavior) { }
}
