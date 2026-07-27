package com.indice.erp.billing.subscription;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class BillingSubscriptionRepository {

    private final JdbcTemplate jdbcTemplate;

    BillingSubscriptionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    Optional<BillingSubscriptionRecord> find(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT
                    subscription.id,
                    subscription.company_id,
                    subscription.stripe_customer_id,
                    subscription.stripe_subscription_id,
                    subscription.status,
                    COALESCE(subscription.offer_code, '') AS plan_id,
                    (
                        SELECT COUNT(DISTINCT product.id)
                        FROM company_billing_subscription_products subscription_product
                        JOIN billing_catalog_products product
                          ON product.id = subscription_product.catalog_product_id
                        WHERE subscription_product.subscription_id = subscription.id
                          AND product.product_type = 'BASIC'
                    ) AS module_count,
                    subscription.included_seats,
                    subscription.extra_seats,
                    COALESCE(subscription.billing_interval, 'MONTH') AS billing_interval,
                    COALESCE((
                        SELECT price.unit_amount_cents
                        FROM billing_catalog_prices price
                        WHERE price.catalog_version_id = subscription.catalog_version_id
                          AND price.billable_code = 'extra_seat'
                          AND price.billing_interval = subscription.billing_interval
                          AND price.currency = subscription.currency
                          AND price.price_type = 'ADDON'
                        ORDER BY price.effective_from DESC, price.id DESC
                        LIMIT 1
                    ), 0) AS extra_seat_unit_amount_cents,
                    (
                        COALESCE((
                            SELECT price.unit_amount_cents
                            FROM billing_catalog_prices price
                            WHERE price.catalog_version_id = subscription.catalog_version_id
                              AND price.billable_code = subscription.offer_code
                              AND price.billing_interval = subscription.billing_interval
                              AND price.currency = subscription.currency
                              AND price.price_type = 'BASE'
                            ORDER BY price.effective_from DESC, price.id DESC
                            LIMIT 1
                        ), 0)
                        + (
                            COALESCE(subscription.extra_seats, 0)
                            * COALESCE((
                                SELECT price.unit_amount_cents
                                FROM billing_catalog_prices price
                                WHERE price.catalog_version_id = subscription.catalog_version_id
                                  AND price.billable_code = 'extra_seat'
                                  AND price.billing_interval = subscription.billing_interval
                                  AND price.currency = subscription.currency
                                  AND price.price_type = 'ADDON'
                                ORDER BY price.effective_from DESC, price.id DESC
                                LIMIT 1
                            ), 0)
                        )
                    ) AS monthly_amount_cents,
                    COALESCE(subscription.currency, 'USD') AS currency,
                    subscription.trial_starts_at,
                    subscription.trial_ends_at,
                    subscription.current_period_starts_at,
                    subscription.current_period_ends_at,
                    subscription.cancel_at_period_end,
                    subscription.canceled_at,
                    CASE
                        WHEN subscription.cancel_at_period_end = 1
                        THEN COALESCE(subscription.current_period_ends_at, subscription.trial_ends_at)
                        ELSE NULL
                    END AS cancellation_effective_at,
                    NULL AS payment_failed_at,
                    commercial.grace_ends_at AS payment_grace_until,
                    COALESCE(commercial.reason_code, '') AS payment_failure_reason,
                    subscription.latest_invoice_id,
                    'stripe' AS source,
                    commercial.suspended_at AS access_locked_at,
                    COALESCE(commercial.reason_code, '') AS lock_reason,
                    1 AS prices_exclude_taxes,
                    subscription.updated_at
                FROM company_billing_subscriptions subscription
                LEFT JOIN company_commercial_states commercial
                  ON commercial.company_id = subscription.company_id
                WHERE subscription.company_id = ?
                ORDER BY subscription.last_event_created_at DESC, subscription.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new BillingSubscriptionRecord(
                rs.getLong("company_id"),
                text(rs.getString("stripe_customer_id")),
                text(rs.getString("stripe_subscription_id")),
                text(rs.getString("status")),
                text(rs.getString("plan_id")),
                rs.getInt("module_count"),
                rs.getInt("included_seats"),
                rs.getInt("extra_seats"),
                rs.getInt("monthly_amount_cents"),
                rs.getInt("extra_seat_unit_amount_cents"),
                text(rs.getString("billing_interval")),
                text(rs.getString("currency")),
                instant(rs.getTimestamp("trial_starts_at")),
                instant(rs.getTimestamp("trial_ends_at")),
                instant(rs.getTimestamp("current_period_starts_at")),
                instant(rs.getTimestamp("current_period_ends_at")),
                rs.getBoolean("cancel_at_period_end"),
                instant(rs.getTimestamp("canceled_at")),
                instant(rs.getTimestamp("cancellation_effective_at")),
                instant(rs.getTimestamp("payment_failed_at")),
                instant(rs.getTimestamp("payment_grace_until")),
                text(rs.getString("payment_failure_reason")),
                text(rs.getString("latest_invoice_id")),
                text(rs.getString("source")),
                instant(rs.getTimestamp("access_locked_at")),
                text(rs.getString("lock_reason")),
                rs.getBoolean("prices_exclude_taxes"),
                instant(rs.getTimestamp("updated_at"))
            ),
            companyId
        ).stream().findFirst();
    }

    List<String> selectedModules(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT DISTINCT
                    CASE capability.capability_code
                        WHEN 'sales' THEN 'crm'
                        ELSE capability.capability_code
                    END AS module_slug
                FROM company_billing_subscriptions subscription
                JOIN company_billing_subscription_products subscription_product
                  ON subscription_product.subscription_id = subscription.id
                JOIN billing_catalog_products product
                  ON product.id = subscription_product.catalog_product_id
                JOIN billing_product_capabilities capability
                  ON capability.product_id = product.id
                WHERE subscription.company_id = ?
                  AND product.product_type = 'BASIC'
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> rs.getString("module_slug"),
            companyId
        );
    }

    void scheduleCancellation(long companyId) {
        jdbcTemplate.update(
            """
                UPDATE company_billing_subscriptions
                SET cancel_at_period_end = 1,
                    canceled_at = COALESCE(canceled_at, CURRENT_TIMESTAMP(6))
                WHERE company_id = ?
                """,
            companyId
        );
    }

    void resume(long companyId) {
        jdbcTemplate.update(
            """
                UPDATE company_billing_subscriptions
                SET cancel_at_period_end = 0,
                    canceled_at = NULL
                WHERE company_id = ?
                """,
            companyId
        );
    }

    private String text(String value) {
        return value == null ? "" : value.trim();
    }

    private Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
