package com.indice.erp.platformadmin;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import com.indice.erp.billing.storage.StorageQuotaService;
import com.indice.erp.configcenter.users.ConfigCenterTabPermissionCatalog;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformAdminService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlatformAdminService.class);
    private static final Set<String> BENEFIT_TYPES = Set.of("PRODUCT", "SEAT", "STORAGE");
    private static final Set<String> SOURCE_TYPES = Set.of("COURTESY", "PROMOTION", "SUPPORT", "TEST");
    private static final Set<String> COMMERCIAL_ACCOUNT_TYPES = Set.of("SUPER_ADMIN", "DISTRIBUTOR");

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService accessService;
    private final PlatformAuditService audit;
    private final CompanyEntitlementProjectionService entitlementProjection;
    private final StorageQuotaService storageQuota;
    private final CommercialOfferSelectionService commercialOffers;
    private final Clock clock;

    public PlatformAdminService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit,
        CompanyEntitlementProjectionService entitlementProjection,
        StorageQuotaService storageQuota,
        CommercialOfferSelectionService commercialOffers,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessService = accessService;
        this.audit = audit;
        this.entitlementProjection = entitlementProjection;
        this.storageQuota = storageQuota;
        this.commercialOffers = commercialOffers;
        this.clock = clock;
    }

    public Map<String, Object> context(long actorUserId) {
        var access = accessService.require(actorUserId, "PLATFORM_VIEW");
        var body = new LinkedHashMap<String, Object>();
        body.put("role", access.role());
        body.put("permissions", access.permissions());
        body.put("can_manage_benefits", access.allows("PLATFORM_BENEFITS_WRITE"));
        body.put("can_manage_ownership", access.allows("PLATFORM_OWNERSHIP_WRITE"));
        body.put("can_manage_modules", access.allows("PLATFORM_MODULES_WRITE"));
        body.put("can_manage_consulting", access.allows("PLATFORM_CONSULTING_WRITE"));
        body.put("can_manage_accounts", access.allows("PLATFORM_ACCOUNTS_WRITE") && access.allows("PLATFORM_BENEFITS_WRITE"));
        body.put("can_manage_system_tickets", access.allows("SYSTEM_TICKETS_MANAGE"));
        return body;
    }

    public Map<String, Object> overview(long actorUserId, String rawQuery, int requestedLimit) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        var limit = Math.max(1, Math.min(requestedLimit, 500));
        var pattern = "%" + query + "%";
        var companies = jdbcTemplate.query(
            """
                SELECT company.id, company.name, company.public_demo_enabled, company.platform_status,
                       CASE
                           WHEN EXISTS (
                               SELECT 1
                               FROM user_companies platform_membership
                               JOIN platform_administrators platform_administrator
                                 ON platform_administrator.user_id = platform_membership.user_id
                                AND platform_administrator.status = 'ACTIVE'
                                AND platform_administrator.platform_role = 'PLATFORM_ROOT'
                               WHERE platform_membership.company_id = company.id
                                 AND LOWER(COALESCE(platform_membership.status, 'active')) = 'active'
                           ) THEN 'ROOT'
                           ELSE company.commercial_account_type
                       END AS user_type,
                       distributor.id AS distributor_company_id,
                       distributor.name AS distributor_company_name,
                       company.creation_origin,
                       creator_user.id AS created_by_user_id,
                       creator_user.email AS created_by_user_email,
                       creator_user.full_name AS created_by_user_name,
                       creator_distributor.id AS created_by_distributor_company_id,
                       COALESCE(creator_distributor.name, company.created_by_distributor_name)
                           AS created_by_distributor_company_name,
                       COALESCE(owner.email, (
                           SELECT member_user.email
                           FROM user_companies member
                           JOIN users member_user ON member_user.id = member.user_id
                           WHERE member.company_id = company.id
                             AND LOWER(COALESCE(member.status, 'active')) = 'active'
                           ORDER BY FIELD(LOWER(COALESCE(member.role, 'user')),
                               'root', 'superadmin', 'owner', 'admin', 'manager', 'user'), member.id
                           LIMIT 1
                       )) AS owner_email,
                       signup.country_code,
                       policy.mode AS entitlement_mode,
                       subscription.status AS billing_status,
                       subscription.stripe_subscription_id,
                       lifecycle.state AS lifecycle_state,
                       lifecycle.access_mode AS access_mode,
                       subscription.offer_code,
                       subscription.billing_interval,
                       subscription.currency,
                       subscription.cancel_at_period_end,
                       subscription.trial_ends_at,
                       (
                           SELECT MAX(trial.ends_at)
                           FROM company_trial_product_grants trial
                           WHERE trial.company_id = company.id
                             AND trial.status = 'ACTIVE'
                       ) AS granted_trial_ends_at,
                       (
                           SELECT MAX(benefit.ends_at)
                           FROM company_benefit_grants benefit
                           WHERE benefit.company_id = company.id
                             AND benefit.benefit_type = 'PRODUCT'
                             AND benefit.source_type IN ('COURTESY', 'PROMOTION', 'SUPPORT', 'TEST')
                             AND benefit.status = 'ACTIVE'
                             AND benefit.ends_at IS NOT NULL
                       ) AS local_demo_ends_at,
                       EXISTS (
                           SELECT 1
                           FROM company_benefit_grants benefit
                           WHERE benefit.company_id = company.id
                             AND benefit.benefit_type = 'PRODUCT'
                             AND benefit.status = 'ACTIVE'
                             AND benefit.ends_at IS NULL
                       ) AS permanent_demo,
                       subscription.current_period_ends_at,
                       subscription.last_payment_status,
                       COALESCE(seats.included_seats, 0) AS included_seats,
                       COALESCE(seats.purchased_extra_seats, 0) AS purchased_extra_seats,
                       COALESCE((
                           SELECT SUM(seat_benefit.quantity)
                           FROM company_benefit_grants seat_benefit
                           WHERE seat_benefit.company_id = company.id
                             AND seat_benefit.benefit_type = 'SEAT'
                             AND seat_benefit.status = 'ACTIVE'
                             AND seat_benefit.starts_at <= CURRENT_TIMESTAMP(6)
                             AND (seat_benefit.ends_at IS NULL OR seat_benefit.ends_at > CURRENT_TIMESTAMP(6))
                       ), 0) AS courtesy_extra_seats,
                       COALESCE(storage.purchased_blocks, 0) AS purchased_storage_blocks,
                       COALESCE((
                           SELECT base_price.unit_amount_cents
                           FROM billing_catalog_prices base_price
                           WHERE base_price.catalog_version_id = subscription.catalog_version_id
                             AND base_price.billable_code = subscription.offer_code
                             AND base_price.billing_interval = subscription.billing_interval
                             AND base_price.currency = subscription.currency
                             AND base_price.price_type = 'BASE'
                           ORDER BY base_price.effective_from DESC, base_price.id DESC
                           LIMIT 1
                       ), 0)
                       + COALESCE(subscription.extra_seats, 0) * COALESCE((
                           SELECT seat_price.unit_amount_cents
                           FROM billing_catalog_prices seat_price
                           WHERE seat_price.catalog_version_id = subscription.catalog_version_id
                             AND seat_price.billable_code = 'extra_seat'
                             AND seat_price.billing_interval = subscription.billing_interval
                             AND seat_price.currency = subscription.currency
                             AND seat_price.price_type = 'ADDON'
                           ORDER BY seat_price.effective_from DESC, seat_price.id DESC
                           LIMIT 1
                       ), 0)
                       + COALESCE((
                           SELECT SUM(addon_price.unit_amount_cents)
                           FROM company_billing_subscription_products selected_addon
                           JOIN billing_catalog_products addon_product
                             ON addon_product.id = selected_addon.catalog_product_id
                            AND addon_product.product_type = 'ADDON'
                           JOIN billing_catalog_prices addon_price
                             ON addon_price.catalog_product_id = addon_product.id
                            AND addon_price.catalog_version_id = subscription.catalog_version_id
                            AND addon_price.billing_interval = subscription.billing_interval
                            AND addon_price.currency = subscription.currency
                            AND addon_price.price_type = 'ADDON'
                            AND addon_price.status IN ('READY', 'ACTIVE')
                           WHERE selected_addon.subscription_id = subscription.id
                       ), 0)
                       + COALESCE(storage.purchased_blocks, 0) * COALESCE((
                           SELECT storage_price.unit_amount_cents
                           FROM billing_catalog_prices storage_price
                           WHERE storage_price.catalog_version_id = subscription.catalog_version_id
                             AND storage_price.billable_code = 'storage_block'
                             AND storage_price.billing_interval = subscription.billing_interval
                             AND storage_price.currency = subscription.currency
                             AND storage_price.price_type = 'ADDON'
                           ORDER BY storage_price.effective_from DESC, storage_price.id DESC
                           LIMIT 1
                       ), 0) AS recurring_amount_cents,
                       CONCAT_WS(',',
                           (
                               SELECT GROUP_CONCAT(product.product_code ORDER BY product.sort_order SEPARATOR ',')
                               FROM company_billing_subscription_products selected_product
                               JOIN billing_catalog_products product ON product.id = selected_product.catalog_product_id
                               WHERE selected_product.subscription_id = subscription.id
                                 AND LOWER(subscription.status) IN ('trialing', 'active', 'past_due')
                                 AND (subscription.current_period_ends_at IS NULL OR subscription.current_period_ends_at > CURRENT_TIMESTAMP(6))
                           ),
                           (
                               SELECT GROUP_CONCAT(DISTINCT product.product_code ORDER BY product.sort_order SEPARATOR ',')
                               FROM company_trial_product_grants trial
                               JOIN billing_catalog_products product ON product.id = trial.catalog_product_id
                               WHERE trial.company_id = company.id
                                 AND trial.status = 'ACTIVE'
                                 AND trial.starts_at <= CURRENT_TIMESTAMP(6)
                                 AND trial.ends_at > CURRENT_TIMESTAMP(6)
                           ),
                           (
                               SELECT GROUP_CONCAT(DISTINCT product.product_code ORDER BY product.sort_order SEPARATOR ',')
                               FROM company_benefit_grants benefit
                               JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                               WHERE benefit.company_id = company.id
                                 AND benefit.benefit_type = 'PRODUCT'
                                 AND benefit.status = 'ACTIVE'
                                 AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                                 AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
                           )
                       ) AS product_codes,
                       CONCAT_WS('|',
                           (
                               SELECT GROUP_CONCAT(product.display_name ORDER BY product.sort_order SEPARATOR '|')
                               FROM company_billing_subscription_products selected_product
                               JOIN billing_catalog_products product ON product.id = selected_product.catalog_product_id
                               WHERE selected_product.subscription_id = subscription.id
                                 AND LOWER(subscription.status) IN ('trialing', 'active', 'past_due')
                                 AND (subscription.current_period_ends_at IS NULL OR subscription.current_period_ends_at > CURRENT_TIMESTAMP(6))
                           ),
                           (
                               SELECT GROUP_CONCAT(DISTINCT product.display_name ORDER BY product.sort_order SEPARATOR '|')
                               FROM company_trial_product_grants trial
                               JOIN billing_catalog_products product ON product.id = trial.catalog_product_id
                               WHERE trial.company_id = company.id
                                 AND trial.status = 'ACTIVE'
                                 AND trial.starts_at <= CURRENT_TIMESTAMP(6)
                                 AND trial.ends_at > CURRENT_TIMESTAMP(6)
                           ),
                           (
                               SELECT GROUP_CONCAT(DISTINCT product.display_name ORDER BY product.sort_order SEPARATOR '|')
                               FROM company_benefit_grants benefit
                               JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                               WHERE benefit.company_id = company.id
                                 AND benefit.benefit_type = 'PRODUCT'
                                 AND benefit.status = 'ACTIVE'
                                 AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                                 AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
                           )
                       ) AS product_names,
                       invoice.status AS last_invoice_status,
                       invoice.amount_due_cents AS last_invoice_due_cents,
                       invoice.amount_paid_cents AS last_invoice_paid_cents,
                       invoice.period_ends_at AS last_invoice_period_ends_at,
                       (SELECT COUNT(*) FROM user_companies membership
                         WHERE membership.company_id = company.id
                           AND LOWER(COALESCE(membership.status, 'active')) = 'active') AS active_members,
                       (SELECT COUNT(*) FROM company_benefit_grants benefit
                         WHERE benefit.company_id = company.id
                           AND benefit.status = 'ACTIVE'
                           AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                           AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))) AS active_benefits,
                       (SELECT COUNT(*) FROM company_benefit_grants benefit
                         WHERE benefit.company_id = company.id
                           AND benefit.status = 'ACTIVE'
                           AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                           AND benefit.ends_at > CURRENT_TIMESTAMP(6)) AS temporary_benefits
                FROM companies company
                LEFT JOIN companies distributor
                  ON distributor.id = company.distributor_company_id
                 AND distributor.commercial_account_type = 'DISTRIBUTOR'
                LEFT JOIN users creator_user
                  ON creator_user.id = company.created_by_user_id
                LEFT JOIN companies creator_distributor
                  ON creator_distributor.id = company.created_by_distributor_company_id
                LEFT JOIN company_entitlement_policies policy ON policy.company_id = company.id
                LEFT JOIN company_seat_states seats ON seats.company_id = company.id
                LEFT JOIN company_storage_states storage ON storage.company_id = company.id
                LEFT JOIN company_commercial_states lifecycle ON lifecycle.company_id = company.id
                LEFT JOIN company_ownerships ownership
                  ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
                LEFT JOIN users owner ON owner.id = ownership.owner_user_id
                LEFT JOIN company_billing_subscriptions subscription
                  ON subscription.id = (
                      SELECT MAX(candidate.id)
                      FROM company_billing_subscriptions candidate
                      WHERE candidate.company_id = company.id
                  )
                LEFT JOIN billing_signup_intents signup ON signup.id = subscription.signup_intent_id
                LEFT JOIN billing_invoice_snapshots invoice
                  ON invoice.id = (
                      SELECT MAX(candidate_invoice.id)
                      FROM billing_invoice_snapshots candidate_invoice
                      WHERE candidate_invoice.company_id = company.id
                  )
                WHERE (? = ''
                    OR LOWER(company.name) LIKE ?
                    OR LOWER(COALESCE(owner.email, '')) LIKE ?
                    OR LOWER(COALESCE(distributor.name, '')) LIKE ?
                    OR LOWER(COALESCE(creator_distributor.name, company.created_by_distributor_name, '')) LIKE ?
                    OR CAST(company.id AS CHAR) = ?)
                ORDER BY company.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("public_demo_enabled", rs.getBoolean("public_demo_enabled"));
                row.put("platform_status", rs.getString("platform_status"));
                row.put("user_type", rs.getString("user_type"));
                row.put("distributor_company_id", rs.getObject("distributor_company_id"));
                row.put("distributor_company_name", nullable(rs.getString("distributor_company_name")));
                row.put("creation_origin", rs.getString("creation_origin"));
                row.put("created_by_user_id", rs.getObject("created_by_user_id"));
                row.put("created_by_user_email", nullable(rs.getString("created_by_user_email")));
                row.put("created_by_user_name", nullable(rs.getString("created_by_user_name")));
                row.put("created_by_distributor_company_id", rs.getObject("created_by_distributor_company_id"));
                row.put("created_by_distributor_company_name", nullable(rs.getString("created_by_distributor_company_name")));
                row.put("owner_email", nullable(rs.getString("owner_email")));
                row.put("country_code", nullable(rs.getString("country_code")));
                row.put("entitlement_mode", nullable(rs.getString("entitlement_mode")));
                row.put("billing_status", nullable(rs.getString("billing_status")));
                var stripeSubscriptionId = nullable(rs.getString("stripe_subscription_id"));
                row.put("billing_managed_by_stripe", isStripeManaged(stripeSubscriptionId));
                row.put("lifecycle_state", nullable(rs.getString("lifecycle_state")));
                row.put("access_mode", nullable(rs.getString("access_mode")));
                row.put("offer_code", nullable(rs.getString("offer_code")));
                row.put("billing_interval", nullable(rs.getString("billing_interval")));
                row.put("currency", nullable(rs.getString("currency")));
                row.put("cancel_at_period_end", rs.getBoolean("cancel_at_period_end"));
                var billingStatus = nullable(rs.getString("billing_status"));
                var stripeTrialEndsAt = instant(rs.getTimestamp("trial_ends_at"));
                var grantedTrialEndsAt = instant(rs.getTimestamp("granted_trial_ends_at"));
                var localDemoEndsAt = instant(rs.getTimestamp("local_demo_ends_at"));
                var stripeTrial = "trialing".equalsIgnoreCase(billingStatus) && stripeTrialEndsAt != null;
                var localDemo = billingStatus == null && localDemoEndsAt != null && !rs.getBoolean("permanent_demo");
                var effectiveTrialEndsAt = stripeTrial
                    ? stripeTrialEndsAt
                    : localDemo
                        ? localDemoEndsAt
                        : grantedTrialEndsAt;
                var trialSource = stripeTrial ? "STRIPE" : localDemo ? "LOCAL_DEMO" : null;
                row.put("trial_ends_at", effectiveTrialEndsAt);
                row.put("trial_source", trialSource);
                row.put("trial_days_remaining", remainingDays(effectiveTrialEndsAt));
                row.put("trial_extendable", trialSource != null);
                row.put("trial_permanent", rs.getBoolean("permanent_demo"));
                row.put("current_period_ends_at", instant(rs.getTimestamp("current_period_ends_at")));
                row.put("last_payment_status", nullable(rs.getString("last_payment_status")));
                row.put("included_seats", rs.getInt("included_seats"));
                row.put("purchased_extra_seats", rs.getInt("purchased_extra_seats"));
                row.put("courtesy_extra_seats", rs.getInt("courtesy_extra_seats"));
                row.put("purchased_storage_blocks", rs.getInt("purchased_storage_blocks"));
                row.put("recurring_amount_cents", rs.getLong("recurring_amount_cents"));
                row.put("product_codes", csv(rs.getString("product_codes"), ","));
                row.put("product_names", csv(rs.getString("product_names"), "\\|"));
                row.put("last_invoice_status", nullable(rs.getString("last_invoice_status")));
                row.put("last_invoice_due_cents", rs.getObject("last_invoice_due_cents"));
                row.put("last_invoice_paid_cents", rs.getObject("last_invoice_paid_cents"));
                row.put("last_invoice_period_ends_at", instant(rs.getTimestamp("last_invoice_period_ends_at")));
                row.put("active_members", rs.getInt("active_members"));
                row.put("active_benefits", rs.getInt("active_benefits"));
                row.put("temporary_benefits", rs.getInt("temporary_benefits"));
                return row;
            },
            query,
            pattern,
            pattern,
            pattern,
            pattern,
            query,
            limit
        );
        addBillingProjection(companies);
        var activeCustomerAccounts = companies.stream()
            .filter(PlatformAdminService::isOperationalCustomerAccount)
            .toList();
        var totals = new LinkedHashMap<String, Object>();
        totals.put("companies", scalar("SELECT COUNT(*) FROM companies"));
        totals.put("premium_companies", scalar("SELECT COUNT(*) FROM company_entitlement_policies"));
        totals.put("active_subscriptions", scalar("SELECT COUNT(*) FROM company_billing_subscriptions WHERE LOWER(status) IN ('trialing', 'active')"));
        totals.put("active_benefits", scalar("SELECT COUNT(*) FROM company_benefit_grants WHERE status = 'ACTIVE' AND starts_at <= CURRENT_TIMESTAMP(6) AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP(6))"));
        totals.put("trialing_subscriptions", scalar("SELECT COUNT(*) FROM company_billing_subscriptions WHERE LOWER(status) = 'trialing'"));
        totals.put("trials_ending_soon", scalar("SELECT COUNT(*) FROM company_billing_subscriptions WHERE LOWER(status) = 'trialing' AND trial_ends_at BETWEEN CURRENT_TIMESTAMP(6) AND DATE_ADD(CURRENT_TIMESTAMP(6), INTERVAL 7 DAY)"));
        totals.put("attention_required", scalar("SELECT COUNT(DISTINCT company_id) FROM company_billing_subscriptions WHERE LOWER(status) IN ('past_due', 'unpaid', 'incomplete')"));
        long mrrCents = companies.stream()
            .filter(company -> "USD".equals(company.get("currency")))
            .filter(company -> Set.of("active", "trialing").contains(lower(company.get("billing_status"))))
            .mapToLong(company -> {
                var amount = ((Number) company.getOrDefault("recurring_amount_cents", 0L)).longValue();
                return "YEAR".equals(company.get("billing_interval")) ? Math.round(amount / 12.0) : amount;
            })
            .sum();
        totals.put("monthly_recurring_cents", mrrCents);
        totals.put("active_customer_companies", activeCustomerAccounts.size());
        totals.put(
            "customer_active_users",
            activeCustomerAccounts.stream()
                .mapToLong(company -> ((Number) company.getOrDefault("active_members", 0)).longValue())
                .sum()
        );
        totals.put(
            "projected_monthly_billing_cents",
            activeCustomerAccounts.stream()
                .filter(company -> "USD".equalsIgnoreCase(String.valueOf(company.getOrDefault("billing_currency", "USD"))))
                .mapToLong(PlatformAdminService::monthlyBillingAmount)
                .sum()
        );
        totals.put("paid_last_30_days_cents", scalarLong("SELECT COALESCE(SUM(amount_paid_cents), 0) FROM billing_invoice_snapshots WHERE currency = 'USD' AND LOWER(COALESCE(status, '')) = 'paid' AND updated_at >= DATE_SUB(CURRENT_TIMESTAMP(6), INTERVAL 30 DAY)"));
        totals.put("currency", "USD");
        return Map.of("totals", totals, "companies", companies);
    }

    private void addBillingProjection(List<? extends Map<String, Object>> companies) {
        var quoteCache = new LinkedHashMap<String, CommercialOfferSelection>();
        for (var company : companies) {
            if ("deleted".equals(lower(company.get("platform_status")))) {
                unavailableBillingProjection(company);
                continue;
            }
            var billingStatus = lower(company.get("billing_status"));
            var stripeManaged = Boolean.TRUE.equals(company.get("billing_managed_by_stripe"));
            var activeStripeContract = stripeManaged
                && Set.of("trialing", "active", "past_due", "unpaid").contains(billingStatus);
            var interval = "YEAR".equals(company.get("billing_interval")) ? "YEAR" : "MONTH";

            if (activeStripeContract) {
                company.put("billing_amount_cents", company.get("recurring_amount_cents"));
                company.put(
                    "billing_amount_kind",
                    "trialing".equals(billingStatus)
                        ? "TRIAL_END"
                        : "active".equals(billingStatus) ? "NEXT_INVOICE" : "CURRENT"
                );
                company.put("billing_amount_interval", interval);
                company.put("billing_currency", company.get("currency") == null ? "USD" : company.get("currency"));
                company.put("projected_offer_code", null);
                continue;
            }

            var productCodes = new LinkedHashSet<String>();
            var rawCodes = company.get("product_codes");
            if (rawCodes instanceof List<?> codes) {
                codes.stream()
                    .filter(java.util.Objects::nonNull)
                    .map(Object::toString)
                    .map(String::trim)
                    .filter(code -> !code.isBlank())
                    .map(code -> code.toLowerCase(Locale.ROOT))
                    .forEach(productCodes::add);
            }
            if (productCodes.isEmpty()) {
                unavailableBillingProjection(company);
                continue;
            }

            var purchasedExtraSeats = ((Number) company.getOrDefault("purchased_extra_seats", 0)).intValue();
            var courtesyExtraSeats = ((Number) company.getOrDefault("courtesy_extra_seats", 0)).intValue();
            var extraSeats = Math.max(0, purchasedExtraSeats) + Math.max(0, courtesyExtraSeats);
            var cacheKey = interval + ":" + extraSeats + ":" + String.join(",", productCodes.stream().sorted().toList());
            try {
                var quote = quoteCache.computeIfAbsent(
                    cacheKey,
                    ignored -> commercialOffers.select(List.copyOf(productCodes), interval, extraSeats)
                );
                if (quote.estimatedAmountCents() == null) {
                    unavailableBillingProjection(company);
                    continue;
                }
                company.put("billing_amount_cents", quote.estimatedAmountCents());
                company.put("billing_amount_kind", "ESTIMATE");
                company.put("billing_amount_interval", quote.billingInterval().name());
                company.put("billing_currency", quote.currency());
                company.put("projected_offer_code", quote.offerCode());
            } catch (IllegalArgumentException | IllegalStateException exception) {
                LOGGER.warn(
                    "platform_billing_projection_unavailable companyId={} productCodes={} interval={} extraSeats={} reason={}",
                    company.get("id"),
                    productCodes,
                    interval,
                    extraSeats,
                    exception.getMessage()
                );
                unavailableBillingProjection(company);
            }
        }
    }

    private static void unavailableBillingProjection(Map<String, Object> company) {
        company.put("billing_amount_cents", null);
        company.put("billing_amount_kind", "UNAVAILABLE");
        company.put("billing_amount_interval", null);
        company.put("billing_currency", company.get("currency") == null ? "USD" : company.get("currency"));
        company.put("projected_offer_code", null);
    }

    private static boolean isOperationalCustomerAccount(Map<String, Object> company) {
        if ("deleted".equals(lower(company.get("platform_status")))) {
            return false;
        }
        if (!"SUPER_ADMIN".equalsIgnoreCase(String.valueOf(company.get("user_type")))) {
            return false;
        }
        var billingStatus = lower(company.get("billing_status"));
        var lifecycleState = lower(company.get("lifecycle_state"));
        var accessMode = lower(company.get("access_mode"));
        var activeBenefits = ((Number) company.getOrDefault("active_benefits", 0)).longValue();
        var temporaryBenefits = ((Number) company.getOrDefault("temporary_benefits", 0)).longValue();
        return Set.of("active", "trialing", "paid", "past_due").contains(billingStatus)
            || Set.of("active", "trial", "grace").contains(lifecycleState)
            || "full".equals(accessMode)
            || activeBenefits > 0
            || temporaryBenefits > 0;
    }

    private static long monthlyBillingAmount(Map<String, Object> company) {
        var rawAmount = company.get("billing_amount_cents");
        if (!(rawAmount instanceof Number amount)) {
            return 0L;
        }
        var cents = Math.max(0L, amount.longValue());
        return "YEAR".equalsIgnoreCase(String.valueOf(company.get("billing_amount_interval")))
            ? Math.round(cents / 12.0)
            : cents;
    }

    private static boolean isStripeManaged(String stripeSubscriptionId) {
        return stripeSubscriptionId != null
            && !stripeSubscriptionId.startsWith("internal_")
            && !stripeSubscriptionId.startsWith("legacy_");
    }

    public Map<String, Object> company(long actorUserId, long companyId) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        return companyAfterAuthorization(companyId);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    public Map<String, Object> companyAfterAuthorization(long companyId) {
        var companies = jdbcTemplate.query(
            """
                SELECT company.id, company.name, company.public_demo_enabled, policy.mode,
                       CASE
                           WHEN EXISTS (
                               SELECT 1
                               FROM user_companies platform_membership
                               JOIN platform_administrators platform_administrator
                                 ON platform_administrator.user_id = platform_membership.user_id
                                AND platform_administrator.status = 'ACTIVE'
                                AND platform_administrator.platform_role = 'PLATFORM_ROOT'
                               WHERE platform_membership.company_id = company.id
                                 AND LOWER(COALESCE(platform_membership.status, 'active')) = 'active'
                           ) THEN 'ROOT'
                           ELSE company.commercial_account_type
                       END AS user_type,
                       distributor.id AS distributor_company_id,
                       distributor.name AS distributor_company_name,
                       company.creation_origin,
                       creator_user.id AS created_by_user_id,
                       creator_user.email AS created_by_user_email,
                       creator_user.full_name AS created_by_user_name,
                       creator_distributor.id AS created_by_distributor_company_id,
                       COALESCE(creator_distributor.name, company.created_by_distributor_name)
                           AS created_by_distributor_company_name,
                       COALESCE(ownership.owner_user_id, (
                           SELECT member.user_id
                           FROM user_companies member
                           WHERE member.company_id = company.id
                             AND LOWER(COALESCE(member.status, 'active')) = 'active'
                           ORDER BY FIELD(LOWER(COALESCE(member.role, 'user')),
                               'root', 'superadmin', 'owner', 'admin', 'manager', 'user'), member.id
                           LIMIT 1
                       )) AS owner_user_id,
                       COALESCE(owner.email, (
                           SELECT member_user.email
                           FROM user_companies member
                           JOIN users member_user ON member_user.id = member.user_id
                           WHERE member.company_id = company.id
                             AND LOWER(COALESCE(member.status, 'active')) = 'active'
                           ORDER BY FIELD(LOWER(COALESCE(member.role, 'user')),
                               'root', 'superadmin', 'owner', 'admin', 'manager', 'user'), member.id
                           LIMIT 1
                       )) AS owner_email,
                       subscription.status AS billing_status,
                       subscription.stripe_customer_id,
                       subscription.stripe_subscription_id,
                       subscription.offer_code, subscription.billing_interval,
                       subscription.currency,
                       subscription.included_seats, subscription.extra_seats,
                       subscription.cancel_at_period_end,
                       subscription.trial_starts_at,
                       subscription.trial_ends_at,
                       subscription.current_period_starts_at,
                       subscription.current_period_ends_at,
                       subscription.last_payment_status,
                       seats.reserved_seats,
                       lifecycle.state AS lifecycle_state,
                       lifecycle.access_mode,
                       lifecycle.grace_ends_at,
                       lifecycle.read_only_ends_at,
                       lifecycle.retention_until
                FROM companies company
                LEFT JOIN companies distributor
                  ON distributor.id = company.distributor_company_id
                 AND distributor.commercial_account_type = 'DISTRIBUTOR'
                LEFT JOIN users creator_user
                  ON creator_user.id = company.created_by_user_id
                LEFT JOIN companies creator_distributor
                  ON creator_distributor.id = company.created_by_distributor_company_id
                LEFT JOIN company_entitlement_policies policy ON policy.company_id = company.id
                LEFT JOIN company_ownerships ownership
                  ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
                LEFT JOIN users owner ON owner.id = ownership.owner_user_id
                LEFT JOIN company_billing_subscriptions subscription
                  ON subscription.id = (SELECT MAX(candidate.id) FROM company_billing_subscriptions candidate WHERE candidate.company_id = company.id)
                LEFT JOIN company_seat_states seats ON seats.company_id = company.id
                LEFT JOIN company_commercial_states lifecycle ON lifecycle.company_id = company.id
                WHERE company.id = ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("public_demo_enabled", rs.getBoolean("public_demo_enabled"));
                row.put("user_type", rs.getString("user_type"));
                row.put("distributor_company_id", rs.getObject("distributor_company_id"));
                row.put("distributor_company_name", nullable(rs.getString("distributor_company_name")));
                row.put("creation_origin", rs.getString("creation_origin"));
                row.put("created_by_user_id", rs.getObject("created_by_user_id"));
                row.put("created_by_user_email", nullable(rs.getString("created_by_user_email")));
                row.put("created_by_user_name", nullable(rs.getString("created_by_user_name")));
                row.put("created_by_distributor_company_id", rs.getObject("created_by_distributor_company_id"));
                row.put("created_by_distributor_company_name", nullable(rs.getString("created_by_distributor_company_name")));
                row.put("entitlement_mode", nullable(rs.getString("mode")));
                row.put("owner_user_id", rs.getObject("owner_user_id"));
                row.put("owner_email", nullable(rs.getString("owner_email")));
                row.put("billing_status", nullable(rs.getString("billing_status")));
                row.put("stripe_customer_id", nullable(rs.getString("stripe_customer_id")));
                row.put("stripe_subscription_id", nullable(rs.getString("stripe_subscription_id")));
                row.put("offer_code", nullable(rs.getString("offer_code")));
                row.put("billing_interval", nullable(rs.getString("billing_interval")));
                row.put("currency", nullable(rs.getString("currency")));
                row.put("included_seats", rs.getObject("included_seats"));
                row.put("extra_seats", rs.getObject("extra_seats"));
                row.put("cancel_at_period_end", rs.getBoolean("cancel_at_period_end"));
                row.put("trial_starts_at", instant(rs.getTimestamp("trial_starts_at")));
                row.put("trial_ends_at", instant(rs.getTimestamp("trial_ends_at")));
                row.put("current_period_starts_at", instant(rs.getTimestamp("current_period_starts_at")));
                row.put("current_period_ends_at", instant(rs.getTimestamp("current_period_ends_at")));
                row.put("last_payment_status", nullable(rs.getString("last_payment_status")));
                row.put("reserved_seats", rs.getObject("reserved_seats"));
                row.put("lifecycle_state", nullable(rs.getString("lifecycle_state")));
                row.put("access_mode", nullable(rs.getString("access_mode")));
                row.put("grace_ends_at", rs.getTimestamp("grace_ends_at"));
                row.put("read_only_ends_at", rs.getTimestamp("read_only_ends_at"));
                row.put("retention_until", rs.getTimestamp("retention_until"));
                return row;
            },
            companyId
        );
        if (companies.isEmpty()) {
            throw new NoSuchElementException("Company not found.");
        }
        var body = new LinkedHashMap<>(companies.getFirst());
        body.put("products", companyProducts(companyId));
        body.put("members", companyMembers(companyId));
        body.put("invitations", companyInvitations(companyId));
        body.put("invoices", companyInvoices(companyId));
        body.put("benefits", listBenefits(companyId));
        body.put("seat_usage", seatUsage(companyId));
        body.put("storage_usage", storageSnapshot(companyId));
        return body;
    }

    @Transactional
    public Map<String, Object> updateCompanyAccountType(
        long actorUserId,
        long companyId,
        AccountTypeUpdateRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        if (request == null) {
            throw new IllegalArgumentException("Account type details are required.");
        }
        var accountType = upper(request.account_type());
        if (!COMMERCIAL_ACCOUNT_TYPES.contains(accountType)) {
            throw new IllegalArgumentException("Account type must be SUPER_ADMIN or DISTRIBUTOR.");
        }
        var rows = jdbcTemplate.query(
            """
                SELECT company.commercial_account_type,
                       EXISTS (
                           SELECT 1
                           FROM user_companies platform_membership
                           JOIN platform_administrators platform_administrator
                             ON platform_administrator.user_id = platform_membership.user_id
                            AND platform_administrator.status = 'ACTIVE'
                            AND platform_administrator.platform_role = 'PLATFORM_ROOT'
                           WHERE platform_membership.company_id = company.id
                             AND LOWER(COALESCE(platform_membership.status, 'active')) = 'active'
                       ) AS platform_root
                FROM companies company
                WHERE company.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "account_type", rs.getString("commercial_account_type"),
                "platform_root", rs.getBoolean("platform_root")
            ),
            companyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Company not found.");
        }
        var current = rows.getFirst();
        if (Boolean.TRUE.equals(current.get("platform_root"))) {
            throw new IllegalStateException("Root authority must be managed from platform administrator security.");
        }
        var previousType = String.valueOf(current.get("account_type"));
        var changed = !accountType.equals(previousType);
        if (changed) {
            jdbcTemplate.update(
                "UPDATE companies SET commercial_account_type = ? WHERE id = ?",
                accountType,
                companyId
            );
            audit.record(
                actorUserId,
                "COMPANY_ACCOUNT_TYPE_UPDATED",
                "COMPANY",
                String.valueOf(companyId),
                companyId,
                "SUCCESS",
                Map.of("previous_type", previousType, "user_type", accountType)
            );
        }
        return Map.of(
            "company_id", companyId,
            "user_type", accountType,
            "changed", changed
        );
    }

    @Transactional
    public Map<String, Object> deleteCompanyAccount(
        long actorUserId,
        long companyId,
        CompanyDeletionRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        var confirmation = request == null || request.confirmation_name() == null
            ? "" : request.confirmation_name().trim();
        var reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 5) {
            throw new IllegalArgumentException("A deletion reason of at least 5 characters is required.");
        }

        var rows = jdbcTemplate.query(
            """
                SELECT company.name, company.platform_status,
                       EXISTS (
                           SELECT 1
                           FROM user_companies membership
                           JOIN platform_administrators administrator
                             ON administrator.user_id = membership.user_id
                            AND administrator.status = 'ACTIVE'
                            AND administrator.platform_role = 'PLATFORM_ROOT'
                           WHERE membership.company_id = company.id
                             AND LOWER(COALESCE(membership.status, 'active')) = 'active'
                       ) AS platform_root,
                       EXISTS (
                           SELECT 1 FROM company_billing_subscriptions subscription
                           WHERE subscription.company_id = company.id
                             AND subscription.stripe_subscription_id IS NOT NULL
                             AND LOWER(subscription.status) IN ('trialing', 'active', 'past_due', 'unpaid')
                       ) AS active_stripe_subscription,
                       EXISTS (
                           SELECT 1 FROM companies customer
                           WHERE customer.distributor_company_id = company.id
                             AND customer.platform_status = 'ACTIVE'
                       ) AS active_distributor_customers
                FROM companies company
                WHERE company.id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "name", rs.getString("name"),
                "status", rs.getString("platform_status"),
                "platform_root", rs.getBoolean("platform_root"),
                "active_stripe_subscription", rs.getBoolean("active_stripe_subscription"),
                "active_distributor_customers", rs.getBoolean("active_distributor_customers")
            ),
            companyId
        );
        if (rows.isEmpty()) throw new NoSuchElementException("Company not found.");
        var company = rows.getFirst();
        var companyName = String.valueOf(company.get("name"));
        if (!companyName.equals(confirmation)) {
            throw new IllegalArgumentException("The confirmation name must exactly match the company name.");
        }
        if (Boolean.TRUE.equals(company.get("platform_root"))) {
            throw new IllegalStateException("The platform Root company cannot be deleted.");
        }
        if (Boolean.TRUE.equals(company.get("active_stripe_subscription"))) {
            throw new IllegalStateException("Cancel the active Stripe subscription before deleting this account.");
        }
        if (Boolean.TRUE.equals(company.get("active_distributor_customers"))) {
            throw new IllegalStateException("Reassign the distributor's active customer accounts before deleting it.");
        }
        if ("DELETED".equals(company.get("status"))) {
            return Map.of("company_id", companyId, "platform_status", "DELETED", "changed", false);
        }

        jdbcTemplate.update(
            """
                UPDATE companies
                SET platform_status = 'DELETED', deleted_at = CURRENT_TIMESTAMP(6),
                    deleted_by_user_id = ?, deletion_reason = ?, public_demo_enabled = FALSE
                WHERE id = ? AND platform_status = 'ACTIVE'
                """,
            actorUserId, reason, companyId
        );
        jdbcTemplate.update(
            "UPDATE user_invitations SET status = 'cancelled' WHERE company_id = ? AND LOWER(COALESCE(status, 'pending')) = 'pending'",
            companyId
        );
        jdbcTemplate.update(
            """
                INSERT INTO company_commercial_states (company_id, state, access_mode, reason_code, suspended_at)
                VALUES (?, 'SUSPENDED', 'NONE', 'PLATFORM_ACCOUNT_DELETED', CURRENT_TIMESTAMP(6))
                ON DUPLICATE KEY UPDATE state = 'SUSPENDED', access_mode = 'NONE',
                    reason_code = 'PLATFORM_ACCOUNT_DELETED', suspended_at = CURRENT_TIMESTAMP(6), version = version + 1
                """,
            companyId
        );
        audit.record(actorUserId, "COMPANY_ACCOUNT_DELETED", "COMPANY", String.valueOf(companyId), companyId,
            "SUCCESS", Map.of("company_name", companyName, "reason", reason, "deletion_mode", "SOFT_DELETE"));
        return Map.of("company_id", companyId, "platform_status", "DELETED", "changed", true);
    }

    @Transactional
    public Map<String, Object> updatePublicDemoAccess(
        long actorUserId,
        long companyId,
        PublicDemoUpdateRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        if (request == null || request.enabled() == null) {
            throw new IllegalArgumentException("The public demo setting is required.");
        }
        var rows = jdbcTemplate.query(
            """
                SELECT commercial_account_type, public_demo_enabled
                FROM companies
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "account_type", rs.getString("commercial_account_type"),
                "enabled", rs.getBoolean("public_demo_enabled")
            ),
            companyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Company not found.");
        }
        var current = rows.getFirst();
        if (!"SUPER_ADMIN".equals(current.get("account_type"))) {
            throw new IllegalStateException("Only customer accounts can be enabled as public demos.");
        }
        var previous = Boolean.TRUE.equals(current.get("enabled"));
        var enabled = request.enabled();
        var changed = previous != enabled;
        if (changed) {
            jdbcTemplate.update(
                "UPDATE companies SET public_demo_enabled = ? WHERE id = ?",
                enabled,
                companyId
            );
            audit.record(
                actorUserId,
                enabled ? "PUBLIC_DEMO_ENABLED" : "PUBLIC_DEMO_DISABLED",
                "COMPANY",
                String.valueOf(companyId),
                companyId,
                "SUCCESS",
                Map.of("previous_enabled", previous, "public_demo_enabled", enabled)
            );
        }
        return Map.of(
            "company_id", companyId,
            "public_demo_enabled", enabled,
            "changed", changed
        );
    }

    @Transactional
    public Map<String, Object> updateCompanyDistributor(
        long actorUserId,
        long companyId,
        DistributorAssignmentRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        if (request == null) {
            throw new IllegalArgumentException("Distributor assignment details are required.");
        }
        var companies = jdbcTemplate.query(
            """
                SELECT company.name,
                       company.commercial_account_type,
                       company.distributor_company_id,
                       current_distributor.name AS distributor_company_name,
                       EXISTS (
                           SELECT 1
                           FROM user_companies platform_membership
                           JOIN platform_administrators platform_administrator
                             ON platform_administrator.user_id = platform_membership.user_id
                            AND platform_administrator.status = 'ACTIVE'
                            AND platform_administrator.platform_role = 'PLATFORM_ROOT'
                           WHERE platform_membership.company_id = company.id
                             AND LOWER(COALESCE(platform_membership.status, 'active')) = 'active'
                       ) AS platform_root
                FROM companies company
                LEFT JOIN companies current_distributor
                  ON current_distributor.id = company.distributor_company_id
                WHERE company.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("company_name", rs.getString("name"));
                row.put("account_type", rs.getString("commercial_account_type"));
                row.put("distributor_company_id", rs.getObject("distributor_company_id"));
                row.put("distributor_company_name", nullable(rs.getString("distributor_company_name")));
                row.put("platform_root", rs.getBoolean("platform_root"));
                return row;
            },
            companyId
        );
        if (companies.isEmpty()) {
            throw new NoSuchElementException("Company not found.");
        }
        var company = companies.getFirst();
        if (Boolean.TRUE.equals(company.get("platform_root"))) {
            throw new IllegalStateException("Root accounts cannot be assigned to a distributor.");
        }
        if (!"SUPER_ADMIN".equals(company.get("account_type"))) {
            throw new IllegalStateException("Only customer accounts can be assigned to a distributor.");
        }

        var requestedDistributorId = request.distributor_company_id();
        String requestedDistributorName = null;
        if (requestedDistributorId != null) {
            if (requestedDistributorId <= 0 || requestedDistributorId == companyId) {
                throw new IllegalArgumentException("A valid distributor must be selected.");
            }
            requestedDistributorName = jdbcTemplate.query(
                """
                    SELECT name
                    FROM companies
                    WHERE id = ? AND commercial_account_type = 'DISTRIBUTOR'
                    LIMIT 1
                    """,
                (rs, rowNum) -> rs.getString("name"),
                requestedDistributorId
            ).stream().findFirst().orElseThrow(
                () -> new IllegalArgumentException("The selected company is not a distributor.")
            );
        }

        var previousDistributorId = company.get("distributor_company_id") == null
            ? null
            : ((Number) company.get("distributor_company_id")).longValue();
        var changed = !java.util.Objects.equals(previousDistributorId, requestedDistributorId);
        if (changed) {
            jdbcTemplate.update(
                "UPDATE companies SET distributor_company_id = ? WHERE id = ?",
                requestedDistributorId,
                companyId
            );
            var detail = new LinkedHashMap<String, Object>();
            detail.put("company_name", company.get("company_name"));
            detail.put("previous_distributor_company_id", previousDistributorId);
            detail.put("previous_distributor_company_name", company.get("distributor_company_name"));
            detail.put("distributor_company_id", requestedDistributorId);
            detail.put("distributor_company_name", requestedDistributorName);
            detail.put("commercial_origin", requestedDistributorId == null ? "INDICE_DIRECT" : "DISTRIBUTOR");
            audit.record(
                actorUserId,
                requestedDistributorId == null ? "COMPANY_DISTRIBUTOR_UNASSIGNED" : "COMPANY_DISTRIBUTOR_ASSIGNED",
                "COMPANY",
                String.valueOf(companyId),
                companyId,
                "SUCCESS",
                detail
            );
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("company_id", companyId);
        result.put("distributor_company_id", requestedDistributorId);
        result.put("distributor_company_name", requestedDistributorName);
        result.put("commercial_origin", requestedDistributorId == null ? "INDICE_DIRECT" : "DISTRIBUTOR");
        result.put("changed", changed);
        return result;
    }

    public Map<String, Object> billing(long actorUserId, int requestedLimit) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var limit = Math.max(1, Math.min(requestedLimit, 200));
        var invoices = jdbcTemplate.query(
            """
                SELECT invoice.stripe_invoice_id, invoice.company_id, company.name AS company_name,
                       COALESCE(owner.email, (
                           SELECT member_user.email
                           FROM user_companies member
                           JOIN users member_user ON member_user.id = member.user_id
                           WHERE member.company_id = company.id
                             AND LOWER(COALESCE(member.status, 'active')) = 'active'
                           ORDER BY FIELD(LOWER(COALESCE(member.role, 'user')),
                               'root', 'superadmin', 'owner', 'admin', 'manager', 'user'), member.id
                           LIMIT 1
                       )) AS owner_email,
                       invoice.status, invoice.currency,
                       invoice.amount_due_cents, invoice.amount_paid_cents,
                       invoice.hosted_invoice_url, invoice.invoice_pdf_url,
                       invoice.period_starts_at, invoice.period_ends_at, invoice.updated_at
                FROM billing_invoice_snapshots invoice
                LEFT JOIN companies company ON company.id = invoice.company_id
                LEFT JOIN company_ownerships ownership
                  ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
                LEFT JOIN users owner ON owner.id = ownership.owner_user_id
                ORDER BY invoice.updated_at DESC, invoice.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("invoice_id", rs.getString("stripe_invoice_id"));
                row.put("company_id", rs.getObject("company_id"));
                row.put("company_name", nullable(rs.getString("company_name")));
                row.put("owner_email", nullable(rs.getString("owner_email")));
                row.put("status", nullable(rs.getString("status")));
                row.put("currency", nullable(rs.getString("currency")));
                row.put("amount_due_cents", rs.getObject("amount_due_cents"));
                row.put("amount_paid_cents", rs.getObject("amount_paid_cents"));
                row.put("hosted_invoice_url", nullable(rs.getString("hosted_invoice_url")));
                row.put("invoice_pdf_url", nullable(rs.getString("invoice_pdf_url")));
                row.put("period_starts_at", instant(rs.getTimestamp("period_starts_at")));
                row.put("period_ends_at", instant(rs.getTimestamp("period_ends_at")));
                row.put("updated_at", instant(rs.getTimestamp("updated_at")));
                return row;
            },
            limit
        );
        var totals = new LinkedHashMap<String, Object>();
        totals.put("invoices", invoices.size());
        totals.put("paid_cents", scalarLong("SELECT COALESCE(SUM(amount_paid_cents), 0) FROM billing_invoice_snapshots WHERE currency = 'USD' AND LOWER(COALESCE(status, '')) = 'paid'"));
        totals.put("open_cents", scalarLong("SELECT COALESCE(SUM(COALESCE(amount_due_cents, 0) - COALESCE(amount_paid_cents, 0)), 0) FROM billing_invoice_snapshots WHERE currency = 'USD' AND LOWER(COALESCE(status, '')) IN ('open', 'past_due', 'uncollectible')"));
        totals.put("failed", scalar("SELECT COUNT(*) FROM billing_invoice_snapshots WHERE LOWER(COALESCE(status, '')) IN ('past_due', 'uncollectible', 'void')"));
        totals.put("currency", "USD");
        return Map.of("totals", totals, "invoices", invoices);
    }

    public Map<String, Object> catalog(long actorUserId) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        return catalogAfterAuthorization();
    }

    /** Caller must authorize the active portfolio before invoking this shared operation. */
    public Map<String, Object> catalogAfterAuthorization() {
        var versions = jdbcTemplate.query(
            """
                SELECT id, version_code, status, effective_from, effective_to, created_at
                FROM billing_catalog_versions
                ORDER BY effective_from DESC, id DESC
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("version_code", rs.getString("version_code"));
                row.put("status", rs.getString("status"));
                row.put("effective_from", instant(rs.getTimestamp("effective_from")));
                row.put("effective_to", instant(rs.getTimestamp("effective_to")));
                row.put("created_at", instant(rs.getTimestamp("created_at")));
                return row;
            }
        );
        var products = jdbcTemplate.query(
            """
                SELECT product.id, product.catalog_version_id, version.version_code,
                       product.product_code, product.display_name, product.product_type,
                       product.sort_order, product.active,
                       CASE WHEN product.product_type = 'CORE' OR availability.id IS NOT NULL THEN 1 ELSE 0 END AS commercially_available,
                       GROUP_CONCAT(capability.capability_code ORDER BY capability.capability_code SEPARATOR ',') AS capabilities
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                LEFT JOIN billing_product_capabilities capability ON capability.product_id = product.id
                LEFT JOIN billing_available_commercial_products availability ON availability.id = product.id
                GROUP BY product.id, product.catalog_version_id, version.version_code,
                         product.product_code, product.display_name, product.product_type,
                         product.sort_order, product.active, availability.id
                ORDER BY version.effective_from DESC, product.sort_order, product.id
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("catalog_version_id", rs.getLong("catalog_version_id"));
                row.put("version_code", rs.getString("version_code"));
                row.put("product_code", rs.getString("product_code"));
                row.put("display_name", rs.getString("display_name"));
                row.put("product_type", rs.getString("product_type"));
                row.put("sort_order", rs.getInt("sort_order"));
                row.put("active", rs.getBoolean("active"));
                row.put("commercially_available", rs.getBoolean("commercially_available"));
                row.put("capabilities", csv(rs.getString("capabilities"), ","));
                return row;
            }
        );
        var prices = jdbcTemplate.query(
            """
                SELECT price.id, price.catalog_version_id, price.catalog_product_id, version.version_code,
                       price.billable_code, price.price_type, price.billing_interval,
                       price.currency, price.unit_amount_cents, price.included_quantity,
                       price.external_price_id, price.status, price.effective_from, price.effective_to
                FROM billing_catalog_prices price
                JOIN billing_catalog_versions version ON version.id = price.catalog_version_id
                ORDER BY version.effective_from DESC, price.price_type, price.billable_code, price.billing_interval
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("catalog_version_id", rs.getLong("catalog_version_id"));
                row.put("catalog_product_id", rs.getObject("catalog_product_id"));
                row.put("version_code", rs.getString("version_code"));
                row.put("billable_code", rs.getString("billable_code"));
                row.put("price_type", rs.getString("price_type"));
                row.put("billing_interval", rs.getString("billing_interval"));
                row.put("currency", rs.getString("currency"));
                row.put("unit_amount_cents", rs.getObject("unit_amount_cents"));
                row.put("included_quantity", rs.getInt("included_quantity"));
                row.put("external_price_id", nullable(rs.getString("external_price_id")));
                row.put("status", rs.getString("status"));
                row.put("effective_from", instant(rs.getTimestamp("effective_from")));
                row.put("effective_to", instant(rs.getTimestamp("effective_to")));
                return row;
            }
        );
        return Map.of("versions", versions, "products", products, "prices", prices);
    }

    public Map<String, Object> modules(long actorUserId) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var modules = jdbcTemplate.query(
            """
                SELECT id, slug, name, description, module_category, lifecycle_status,
                       access_model, assignment_enabled, route_key, icon, badge_text,
                       tier, sort_order, is_core, is_active
                FROM modules
                ORDER BY FIELD(module_category, 'basic', 'complementary', 'ai'), sort_order, name
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("slug", rs.getString("slug"));
                row.put("name", rs.getString("name"));
                row.put("description", nullable(rs.getString("description")));
                row.put("category", rs.getString("module_category"));
                row.put("lifecycle_status", rs.getString("lifecycle_status"));
                row.put("access_model", rs.getString("access_model"));
                row.put("assignment_enabled", rs.getBoolean("assignment_enabled"));
                row.put("route_key", nullable(rs.getString("route_key")));
                row.put("icon", nullable(rs.getString("icon")));
                row.put("badge_text", nullable(rs.getString("badge_text")));
                row.put("tier", nullable(rs.getString("tier")));
                row.put("sort_order", rs.getInt("sort_order"));
                row.put("is_core", rs.getBoolean("is_core"));
                row.put("is_active", rs.getBoolean("is_active"));
                return row;
            }
        );
        return Map.of("modules", modules);
    }

    @Transactional
    public Map<String, Object> updateModuleAvailability(
        long actorUserId,
        long moduleId,
        ModuleAvailabilityRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_MODULES_WRITE");
        if (request == null || request.active() == null) {
            throw new IllegalArgumentException("The target module status is required.");
        }
        var rows = jdbcTemplate.query(
            "SELECT id, slug, name, is_core, is_active FROM modules WHERE id = ? LIMIT 1",
            (rs, rowNum) -> new ModuleAvailabilityRow(
                rs.getLong("id"),
                rs.getString("slug"),
                rs.getString("name"),
                rs.getBoolean("is_core"),
                rs.getBoolean("is_active")
            ),
            moduleId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Module not found.");
        }
        var module = rows.getFirst();
        var active = request.active();
        if (module.core() && !active) {
            throw new IllegalStateException("Panel Inicial is structural and cannot be disabled globally.");
        }
        var reason = request.reason() == null ? "Global module availability changed" : request.reason().trim();
        if (reason.length() < 3) {
            throw new IllegalArgumentException("A reason of at least 3 characters is required.");
        }
        if (module.active() != active) {
            jdbcTemplate.update("UPDATE modules SET is_active = ? WHERE id = ?", active, moduleId);
            audit.record(
                actorUserId,
                active ? "MODULE_GLOBALLY_ACTIVATED" : "MODULE_GLOBALLY_DEACTIVATED",
                "MODULE",
                module.slug(),
                null,
                "SUCCESS",
                Map.of(
                    "module_id", module.id(),
                    "module_name", module.name(),
                    "previous_active", module.active(),
                    "active", active,
                    "reason", reason
                )
            );
        }
        var result = new LinkedHashMap<String, Object>();
        result.put("id", module.id());
        result.put("slug", module.slug());
        result.put("name", module.name());
        result.put("is_active", active);
        result.put("changed", module.active() != active);
        result.put("global_effect", true);
        result.put("assignments_preserved", true);
        return result;
    }

    public Map<String, Object> audit(long actorUserId, int requestedLimit) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var limit = Math.max(1, Math.min(requestedLimit, 200));
        var events = jdbcTemplate.query(
            """
                SELECT event.id, event.event_category, event.action_code, event.outcome,
                       event.request_id, event.stripe_event_id, event.stripe_object_id,
                       event.company_id, company.name AS company_name,
                       event.actor_user_id, actor.email AS actor_email,
                       event.detail_json, event.occurred_at
                FROM (
                    SELECT billing_event.id,
                           CAST(billing_event.event_category AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS event_category,
                           CAST(billing_event.action_code AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS action_code,
                           CAST(billing_event.outcome AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS outcome,
                           CAST(billing_event.request_id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS request_id,
                           CAST(billing_event.stripe_event_id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS stripe_event_id,
                           CAST(billing_event.stripe_object_id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS stripe_object_id,
                           billing_event.company_id,
                           billing_event.actor_user_id,
                           CAST(billing_event.detail_json AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS detail_json,
                           billing_event.occurred_at
                    FROM billing_audit_events billing_event
                    UNION ALL
                    SELECT -platform_event.id AS id,
                           CAST('PLATFORM_ADMIN' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS event_category,
                           CAST(platform_event.action_code AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS action_code,
                           CAST(platform_event.outcome AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS outcome,
                           CAST(platform_event.request_id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS request_id,
                           CAST(NULL AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS stripe_event_id,
                           CAST(NULL AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS stripe_object_id,
                           platform_event.company_id,
                           platform_event.actor_user_id,
                           CAST(platform_event.detail_json AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS detail_json,
                           platform_event.occurred_at
                    FROM platform_audit_events platform_event
                    UNION ALL
                    SELECT (auth_event.id * -1) - 1000000000 AS id,
                           CAST('AUTH_LOGIN' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS event_category,
                           CAST(CONCAT(auth_event.event_type, ':', auth_event.stage) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS action_code,
                           CAST(auth_event.outcome AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS outcome,
                           CAST(auth_event.request_id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS request_id,
                           CAST(NULL AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS stripe_event_id,
                           CAST(NULL AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS stripe_object_id,
                           auth_event.company_id,
                           auth_event.user_id AS actor_user_id,
                           CAST(JSON_OBJECT(
                               'email', auth_event.email_normalized,
                               'company_name', auth_event.company_name_normalized,
                               'user_company_id', auth_event.user_company_id,
                               'role', auth_event.role,
                               'failure_reason_code', auth_event.failure_reason_code,
                               'failure_message', auth_event.failure_message_safe,
                               'ip_address', auth_event.ip_address,
                               'user_agent', auth_event.user_agent,
                               'lockout_until', auth_event.lockout_until,
                               'attempts_used', auth_event.attempts_used
                           ) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS detail_json,
                           auth_event.created_at AS occurred_at
                    FROM user_login_audit auth_event
                ) event
                LEFT JOIN companies company ON company.id = event.company_id
                LEFT JOIN users actor ON actor.id = event.actor_user_id
                ORDER BY event.occurred_at DESC, event.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("category", rs.getString("event_category"));
                row.put("action", rs.getString("action_code"));
                row.put("outcome", rs.getString("outcome"));
                row.put("request_id", nullable(rs.getString("request_id")));
                row.put("stripe_event_id", nullable(rs.getString("stripe_event_id")));
                row.put("stripe_object_id", nullable(rs.getString("stripe_object_id")));
                row.put("company_id", rs.getObject("company_id"));
                row.put("company_name", nullable(rs.getString("company_name")));
                row.put("actor_user_id", rs.getObject("actor_user_id"));
                row.put("actor_email", nullable(rs.getString("actor_email")));
                row.put("detail_json", nullable(rs.getString("detail_json")));
                row.put("occurred_at", instant(rs.getTimestamp("occurred_at")));
                return row;
            },
            limit
        );
        return Map.of("events", events);
    }

    private List<Map<String, Object>> companyProducts(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT product_code, display_name, product_type, sort_order,
                       GROUP_CONCAT(DISTINCT source ORDER BY source SEPARATOR ', ') AS source
                FROM (
                    SELECT product.product_code, product.display_name, product.product_type,
                           product.sort_order, CONCAT('SUBSCRIPTION_', selected_product.source) AS source
                    FROM company_billing_subscription_products selected_product
                    JOIN company_billing_subscriptions subscription ON subscription.id = selected_product.subscription_id
                    JOIN billing_catalog_products product ON product.id = selected_product.catalog_product_id
                    WHERE subscription.id = (
                        SELECT MAX(candidate.id)
                        FROM company_billing_subscriptions candidate
                        WHERE candidate.company_id = ?
                    )
                      AND LOWER(subscription.status) IN ('trialing', 'active', 'past_due')
                      AND (subscription.current_period_ends_at IS NULL OR subscription.current_period_ends_at > CURRENT_TIMESTAMP(6))
                    UNION ALL
                    SELECT product.product_code, product.display_name, product.product_type,
                           product.sort_order, 'TRIAL'
                    FROM company_trial_product_grants trial
                    JOIN billing_catalog_products product ON product.id = trial.catalog_product_id
                    WHERE trial.company_id = ?
                      AND trial.status = 'ACTIVE'
                      AND trial.starts_at <= CURRENT_TIMESTAMP(6)
                      AND trial.ends_at > CURRENT_TIMESTAMP(6)
                    UNION ALL
                    SELECT product.product_code, product.display_name, product.product_type,
                           product.sort_order, CONCAT('BENEFIT_', benefit.source_type)
                    FROM company_benefit_grants benefit
                    JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                    WHERE benefit.company_id = ?
                      AND benefit.benefit_type = 'PRODUCT'
                      AND benefit.status = 'ACTIVE'
                      AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                      AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
                ) active_products
                GROUP BY product_code, display_name, product_type, sort_order
                ORDER BY sort_order, display_name
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("code", rs.getString("product_code"));
                row.put("name", rs.getString("display_name"));
                row.put("type", rs.getString("product_type"));
                row.put("source", rs.getString("source"));
                row.put("sort_order", rs.getInt("sort_order"));
                return row;
            },
            companyId,
            companyId,
            companyId
        );
    }

    private Map<String, Object> storageSnapshot(long companyId) {
        var snapshot = storageQuota.snapshot(companyId);
        var body = new LinkedHashMap<String, Object>();
        body.put("enforced", snapshot.enforced());
        body.put("metered", snapshot.metered());
        body.put("limit_bytes", snapshot.limitBytes());
        body.put("used_bytes", snapshot.usedBytes());
        body.put("reserved_bytes", snapshot.reservedBytes());
        body.put("purchased_blocks", snapshot.purchasedBlocks());
        body.put("benefit_blocks", snapshot.benefitBlocks());
        return body;
    }

    private List<Map<String, Object>> companyMembers(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT membership.id, user.id AS user_id, user.full_name, user.email,
                       membership.role, membership.status, membership.created_at,
                       administrator.platform_role, administrator.status AS platform_status,
                       EXISTS (
                           SELECT 1
                           FROM company_ownerships ownership
                           WHERE ownership.company_id = membership.company_id
                             AND ownership.owner_user_id = membership.user_id
                             AND ownership.status = 'ACTIVE'
                       ) AS is_owner
                FROM user_companies membership
                JOIN users user ON user.id = membership.user_id
                LEFT JOIN platform_administrators administrator
                  ON administrator.user_id = user.id
                WHERE membership.company_id = ?
                ORDER BY CASE WHEN LOWER(COALESCE(membership.role, '')) IN ('owner', 'super_admin') THEN 0 ELSE 1 END,
                         user.full_name, user.email
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("membership_id", rs.getLong("id"));
                row.put("user_id", rs.getLong("user_id"));
                row.put("name", nullable(rs.getString("full_name")));
                row.put("email", rs.getString("email"));
                row.put("role", nullable(rs.getString("role")));
                row.put("status", nullable(rs.getString("status")));
                row.put("is_owner", rs.getBoolean("is_owner"));
                row.put("platform_role", nullable(rs.getString("platform_role")));
                row.put("platform_status", nullable(rs.getString("platform_status")));
                row.put("created_at", instant(rs.getTimestamp("created_at")));
                return row;
            },
            companyId
        );
    }

    private List<Map<String, Object>> companyInvitations(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT invitation.id, invitation.full_name, invitation.email,
                       invitation.role, invitation.status, invitation.expires_at,
                       invitation.created_at
                FROM user_invitations invitation
                WHERE invitation.company_id = ?
                  AND LOWER(COALESCE(invitation.status, 'pending')) = 'pending'
                  AND (invitation.expires_at IS NULL OR invitation.expires_at > CURRENT_TIMESTAMP)
                ORDER BY invitation.created_at DESC, invitation.id DESC
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("invitation_id", rs.getLong("id"));
                row.put("name", nullable(rs.getString("full_name")));
                row.put("email", rs.getString("email"));
                row.put("role", nullable(rs.getString("role")));
                row.put("status", nullable(rs.getString("status")));
                row.put("expires_at", instant(rs.getTimestamp("expires_at")));
                row.put("created_at", instant(rs.getTimestamp("created_at")));
                return row;
            },
            companyId
        );
    }

    private List<Map<String, Object>> companyInvoices(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT stripe_invoice_id, status, currency, amount_due_cents, amount_paid_cents,
                       hosted_invoice_url, invoice_pdf_url, period_starts_at, period_ends_at, updated_at
                FROM billing_invoice_snapshots
                WHERE company_id = ?
                ORDER BY updated_at DESC, id DESC
                LIMIT 50
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("invoice_id", rs.getString("stripe_invoice_id"));
                row.put("status", nullable(rs.getString("status")));
                row.put("currency", nullable(rs.getString("currency")));
                row.put("amount_due_cents", rs.getObject("amount_due_cents"));
                row.put("amount_paid_cents", rs.getObject("amount_paid_cents"));
                row.put("hosted_invoice_url", nullable(rs.getString("hosted_invoice_url")));
                row.put("invoice_pdf_url", nullable(rs.getString("invoice_pdf_url")));
                row.put("period_starts_at", instant(rs.getTimestamp("period_starts_at")));
                row.put("period_ends_at", instant(rs.getTimestamp("period_ends_at")));
                row.put("updated_at", instant(rs.getTimestamp("updated_at")));
                return row;
            },
            companyId
        );
    }

    @Transactional
    public Map<String, Object> grantBenefit(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        BenefitRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        return grantBenefitAfterAuthorization(actorUserId, companyId, idempotencyKey, request);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    @Transactional
    public Map<String, Object> grantBenefitAfterAuthorization(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        BenefitRequest request
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key is required.");
        }
        requireCompany(companyId);
        var type = upper(request == null ? null : request.benefit_type());
        var source = upper(request == null ? null : request.source_type());
        var reason = request == null || request.reason() == null ? "" : request.reason().trim();
        var quantity = request == null || request.quantity() == null ? 1 : request.quantity();
        if (!BENEFIT_TYPES.contains(type)) {
            throw new IllegalArgumentException("benefit_type must be PRODUCT, SEAT or STORAGE.");
        }
        if (!SOURCE_TYPES.contains(source)) {
            throw new IllegalArgumentException("source_type must be COURTESY, PROMOTION, SUPPORT or TEST.");
        }
        if (reason.length() < 5 || quantity < 1) {
            throw new IllegalArgumentException("A reason and a positive quantity are required.");
        }
        var startsAt = request == null || request.starts_at() == null ? clock.instant() : request.starts_at();
        var endsAt = request == null ? null : request.ends_at();
        if (endsAt != null && !endsAt.isAfter(startsAt)) {
            throw new IllegalArgumentException("ends_at must be after starts_at.");
        }
        Long productId = null;
        if ("PRODUCT".equals(type)) {
            productId = productId(request.product_code());
            quantity = 1;
        } else if (request.product_code() != null && !request.product_code().isBlank()) {
            throw new IllegalArgumentException("product_code is only valid for PRODUCT benefits.");
        }
        var hash = BillingHashing.sha256(idempotencyKey.trim());
        var existing = benefitByIdempotency(hash);
        if (existing != null) {
            return existing;
        }
        if ("PRODUCT".equals(type)) {
            var activeProductBenefit = activeProductBenefit(companyId, productId);
            if (activeProductBenefit != null) {
                synchronizeProductModuleAccess(companyId, productId);
                activeProductBenefit.put("replayed", true);
                return activeProductBenefit;
            }
        }
        var reference = BillingHashing.randomReference().substring(0, 32);
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO company_benefit_grants (
                        public_reference, company_id, benefit_type, catalog_product_id,
                        quantity, source_type, status, starts_at, ends_at, reason,
                        campaign_code, stripe_coupon_id, stripe_promotion_code_id,
                        idempotency_key_hash, created_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                reference,
                companyId,
                type,
                productId,
                quantity,
                source,
                Timestamp.from(startsAt),
                endsAt == null ? null : Timestamp.from(endsAt),
                reason,
                nullable(request.campaign_code()),
                nullable(request.stripe_coupon_id()),
                nullable(request.stripe_promotion_code_id()),
                hash,
                actorUserId
            );
        } catch (DuplicateKeyException exception) {
            var replay = benefitByIdempotency(hash);
            if (replay != null) {
                return replay;
            }
            throw exception;
        }
        if ("PRODUCT".equals(type)) {
            synchronizeProductModuleAccess(companyId, productId);
        }
        audit.record(actorUserId, "BENEFIT_GRANTED", "COMPANY_BENEFIT", reference, companyId, "SUCCESS", Map.of(
            "benefit_type", type,
            "source_type", source,
            "quantity", quantity,
            "reason", reason
        ));
        return benefitByReference(reference);
    }

    @Transactional
    public Map<String, Object> revokeBenefit(long actorUserId, long companyId, String reference, String reason) {
        accessService.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        return revokeBenefitAfterAuthorization(actorUserId, companyId, reference, reason);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    @Transactional
    public Map<String, Object> revokeBenefitAfterAuthorization(
        long actorUserId,
        long companyId,
        String reference,
        String reason
    ) {
        var before = benefitByReference(reference);
        if (before == null || ((Number) before.get("company_id")).longValue() != companyId) {
            throw new NoSuchElementException("Benefit not found.");
        }
        var productBenefit = "PRODUCT".equals(before.get("benefit_type"));
        var productId = productBenefit ? productIdForBenefit(reference) : null;
        var revocationReason = reason == null || reason.isBlank() ? "Administrative decision" : reason.trim();
        var updated = productBenefit
            ? jdbcTemplate.update(
                """
                    UPDATE company_benefit_grants
                    SET status = 'REVOKED', revoked_by_user_id = ?, revoked_at = CURRENT_TIMESTAMP(6),
                        reason = CONCAT(reason, '\nRevoked: ', ?)
                    WHERE company_id = ? AND catalog_product_id = ?
                      AND benefit_type = 'PRODUCT' AND status = 'ACTIVE'
                    """,
                actorUserId, revocationReason, companyId, productId
            )
            : jdbcTemplate.update(
                """
                    UPDATE company_benefit_grants
                    SET status = 'REVOKED', revoked_by_user_id = ?, revoked_at = CURRENT_TIMESTAMP(6),
                        reason = CONCAT(reason, '\nRevoked: ', ?)
                    WHERE company_id = ? AND public_reference = ? AND status = 'ACTIVE'
                    """,
                actorUserId, revocationReason, companyId, reference
            );
        if (updated == 0) {
            throw new IllegalStateException("Benefit is not active.");
        }
        if (productBenefit) {
            synchronizeProductModuleAccess(companyId, productId);
        }
        audit.record(actorUserId, "BENEFIT_REVOKED", "COMPANY_BENEFIT", reference, companyId, "SUCCESS", Map.of(
            "reason", reason == null ? "" : reason,
            "revoked_grants", updated,
            "product_code", before.get("product_code") == null ? "" : before.get("product_code")
        ));
        var revoked = benefitByReference(reference);
        revoked.put("revoked_grants", updated);
        return revoked;
    }

    private Map<String, Object> activeProductBenefit(long companyId, long productId) {
        return jdbcTemplate.query(
            """
                SELECT benefit.public_reference, benefit.company_id, benefit.benefit_type,
                       product.product_code, benefit.quantity, benefit.source_type, benefit.status,
                       benefit.starts_at, benefit.ends_at, benefit.reason, benefit.campaign_code,
                       benefit.stripe_coupon_id, benefit.stripe_promotion_code_id,
                       benefit.created_by_user_id, benefit.created_at, benefit.revoked_at
                FROM company_benefit_grants benefit
                JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.company_id = ?
                  AND benefit.catalog_product_id = ?
                  AND benefit.benefit_type = 'PRODUCT'
                  AND benefit.status = 'ACTIVE'
                  AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                  AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
                ORDER BY benefit.created_at DESC, benefit.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> benefitRow(rs),
            companyId,
            productId
        ).stream().findFirst().orElse(null);
    }

    private Long productIdForBenefit(String reference) {
        return jdbcTemplate.query(
            """
                SELECT catalog_product_id
                FROM company_benefit_grants
                WHERE public_reference = ? AND benefit_type = 'PRODUCT'
                """,
            (rs, rowNum) -> (Long) rs.getObject(1),
            reference
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Product benefit not found."));
    }

    public void synchronizeProductModuleAccess(long companyId, long productId) {
        var moduleSlugs = jdbcTemplate.query(
            """
                SELECT DISTINCT module_row.slug
                FROM billing_product_capabilities capability
                JOIN modules module_row
                  ON module_row.slug COLLATE utf8mb4_unicode_ci =
                     (CASE capability.capability_code
                         WHEN 'sales' THEN 'crm'
                         ELSE capability.capability_code
                      END) COLLATE utf8mb4_unicode_ci
                WHERE capability.product_id = ?
                  AND COALESCE(module_row.is_active, 1) = 1
                ORDER BY module_row.slug
                """,
            (rs, rowNum) -> rs.getString(1),
            productId
        );
        for (var moduleSlug : moduleSlugs) {
            var effectiveSource = effectiveModuleSource(companyId, moduleSlug);
            if (effectiveSource == null) {
                jdbcTemplate.update(
                    """
                        UPDATE company_module_entitlements
                        SET status = 'inactive'
                        WHERE company_id = ? AND module_slug = ?
                        """,
                    companyId,
                    moduleSlug
                );
                jdbcTemplate.update(
                    """
                        DELETE permission
                        FROM user_company_tab_permissions permission
                        JOIN user_companies membership ON membership.id = permission.user_company_id
                        WHERE membership.company_id = ? AND permission.module_slug = ?
                        """,
                    companyId,
                    moduleSlug
                );
                jdbcTemplate.update(
                    """
                        DELETE role_row
                        FROM user_company_module_roles role_row
                        JOIN user_companies membership ON membership.id = role_row.user_company_id
                        WHERE membership.company_id = ? AND role_row.module_slug = ?
                        """,
                    companyId,
                    moduleSlug
                );
                continue;
            }
            jdbcTemplate.update(
                """
                    INSERT INTO company_module_entitlements (company_id, module_slug, status, source)
                    SELECT ?, module_row.slug, 'active', ?
                    FROM modules module_row
                    WHERE module_row.slug = ? AND COALESCE(module_row.is_active, 1) = 1
                    ON DUPLICATE KEY UPDATE status = VALUES(status), source = VALUES(source)
                    """,
                companyId,
                effectiveSource,
                moduleSlug
            );
            grantCompanyAdministratorsModule(companyId, moduleSlug);
        }
        entitlementProjection.refreshIfEnrolled(companyId);
    }

    private String effectiveModuleSource(long companyId, String moduleSlug) {
        return jdbcTemplate.query(
            """
                SELECT effective.source_label
                FROM (
                    SELECT 'paid_subscription' AS source_label, 1 AS priority
                    FROM company_billing_subscriptions subscription
                    JOIN company_billing_subscription_products selected_product
                      ON selected_product.subscription_id = subscription.id
                    JOIN billing_product_capabilities capability
                      ON capability.product_id = selected_product.catalog_product_id
                    WHERE subscription.company_id = ?
                      AND LOWER(subscription.status) IN ('trialing', 'active', 'past_due')
                      AND (subscription.current_period_ends_at IS NULL OR subscription.current_period_ends_at > CURRENT_TIMESTAMP(6))
                      AND CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END = ?
                    UNION ALL
                    SELECT 'launch_basic_trial', 2
                    FROM company_trial_product_grants trial
                    JOIN billing_product_capabilities capability ON capability.product_id = trial.catalog_product_id
                    WHERE trial.company_id = ? AND trial.status = 'ACTIVE'
                      AND trial.starts_at <= CURRENT_TIMESTAMP(6) AND trial.ends_at > CURRENT_TIMESTAMP(6)
                      AND CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END = ?
                    UNION ALL
                    SELECT 'platform_benefit', 3
                    FROM company_benefit_grants benefit
                    JOIN billing_product_capabilities capability ON capability.product_id = benefit.catalog_product_id
                    WHERE benefit.company_id = ? AND benefit.benefit_type = 'PRODUCT' AND benefit.status = 'ACTIVE'
                      AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                      AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
                      AND CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END = ?
                ) effective
                ORDER BY effective.priority
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString(1),
            companyId, moduleSlug,
            companyId, moduleSlug,
            companyId, moduleSlug
        ).stream().findFirst().orElse(null);
    }

    private void grantCompanyAdministratorsModule(long companyId, String moduleSlug) {
        jdbcTemplate.update(
            """
                INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
                SELECT membership.id, ?, 'admin', 100
                FROM user_companies membership
                WHERE membership.company_id = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND LOWER(REPLACE(COALESCE(membership.role, ''), ' ', '')) IN ('root', 'superadmin', 'owner')
                ON DUPLICATE KEY UPDATE role = VALUES(role), skill_level = VALUES(skill_level)
                """,
            moduleSlug,
            companyId
        );
        for (var permissionKey : ConfigCenterTabPermissionCatalog.permissionKeysForModuleSlugs(Set.of(moduleSlug))) {
            var separator = permissionKey.indexOf('.');
            jdbcTemplate.update(
                """
                    INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
                    SELECT membership.id, ?, ?, 1
                    FROM user_companies membership
                    WHERE membership.company_id = ?
                      AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                      AND LOWER(REPLACE(COALESCE(membership.role, ''), ' ', '')) IN ('root', 'superadmin', 'owner')
                    ON DUPLICATE KEY UPDATE can_view = VALUES(can_view)
                    """,
                moduleSlug,
                permissionKey.substring(separator + 1),
                companyId
            );
        }
    }

    private List<Map<String, Object>> listBenefits(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT benefit.public_reference, benefit.company_id, benefit.benefit_type,
                       product.product_code, benefit.quantity, benefit.source_type, benefit.status,
                       benefit.starts_at, benefit.ends_at, benefit.reason, benefit.campaign_code,
                       benefit.stripe_coupon_id, benefit.stripe_promotion_code_id,
                       benefit.created_by_user_id, benefit.created_at, benefit.revoked_at
                FROM company_benefit_grants benefit
                LEFT JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.company_id = ?
                ORDER BY benefit.created_at DESC, benefit.id DESC
                """,
            (rs, rowNum) -> benefitRow(rs),
            companyId
        );
    }

    private Map<String, Object> benefitByIdempotency(String hash) {
        return jdbcTemplate.query(
            """
                SELECT benefit.public_reference, benefit.company_id, benefit.benefit_type,
                       product.product_code, benefit.quantity, benefit.source_type, benefit.status,
                       benefit.starts_at, benefit.ends_at, benefit.reason, benefit.campaign_code,
                       benefit.stripe_coupon_id, benefit.stripe_promotion_code_id,
                       benefit.created_by_user_id, benefit.created_at, benefit.revoked_at
                FROM company_benefit_grants benefit
                LEFT JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.idempotency_key_hash = ?
                """,
            (rs, rowNum) -> benefitRow(rs),
            hash
        ).stream().findFirst().orElse(null);
    }

    private Map<String, Object> benefitByReference(String reference) {
        return jdbcTemplate.query(
            """
                SELECT benefit.public_reference, benefit.company_id, benefit.benefit_type,
                       product.product_code, benefit.quantity, benefit.source_type, benefit.status,
                       benefit.starts_at, benefit.ends_at, benefit.reason, benefit.campaign_code,
                       benefit.stripe_coupon_id, benefit.stripe_promotion_code_id,
                       benefit.created_by_user_id, benefit.created_at, benefit.revoked_at
                FROM company_benefit_grants benefit
                LEFT JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.public_reference = ?
                """,
            (rs, rowNum) -> benefitRow(rs),
            reference
        ).stream().findFirst().orElse(null);
    }

    private Map<String, Object> benefitRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("reference", rs.getString("public_reference"));
        row.put("company_id", rs.getLong("company_id"));
        row.put("benefit_type", rs.getString("benefit_type"));
        row.put("product_code", nullable(rs.getString("product_code")));
        row.put("quantity", rs.getInt("quantity"));
        row.put("source_type", rs.getString("source_type"));
        row.put("status", rs.getString("status"));
        row.put("starts_at", instant(rs.getTimestamp("starts_at")));
        row.put("ends_at", instant(rs.getTimestamp("ends_at")));
        row.put("reason", rs.getString("reason"));
        row.put("campaign_code", nullable(rs.getString("campaign_code")));
        row.put("stripe_coupon_id", nullable(rs.getString("stripe_coupon_id")));
        row.put("stripe_promotion_code_id", nullable(rs.getString("stripe_promotion_code_id")));
        row.put("created_by_user_id", rs.getLong("created_by_user_id"));
        row.put("created_at", instant(rs.getTimestamp("created_at")));
        row.put("revoked_at", instant(rs.getTimestamp("revoked_at")));
        return row;
    }

    private Map<String, Object> seatUsage(long companyId) {
        var state = jdbcTemplate.query(
            """
                SELECT included_seats, purchased_extra_seats, reserved_seats
                FROM company_seat_states WHERE company_id = ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("included", rs.getInt("included_seats"));
                row.put("purchased_extra", rs.getInt("purchased_extra_seats"));
                row.put("reserved", rs.getInt("reserved_seats"));
                return row;
            },
            companyId
        ).stream().findFirst().orElseGet(LinkedHashMap::new);
        var enforced = !state.isEmpty();
        state.put("active", jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_companies WHERE company_id = ? AND LOWER(COALESCE(status, 'active')) = 'active'",
            Integer.class,
            companyId
        ));
        state.put("courtesy_extra", jdbcTemplate.queryForObject(
            """
                SELECT COALESCE(SUM(quantity), 0) FROM company_benefit_grants
                WHERE company_id = ? AND benefit_type = 'SEAT' AND status = 'ACTIVE'
                  AND starts_at <= CURRENT_TIMESTAMP(6)
                  AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP(6))
                """,
            Integer.class,
            companyId
        ));
        state.put("enforced", enforced);
        return state;
    }

    private Long productId(String productCode) {
        var code = productCode == null ? "" : productCode.trim().toLowerCase(Locale.ROOT);
        if (code.isBlank()) {
            throw new IllegalArgumentException("product_code is required for PRODUCT benefits.");
        }
        return jdbcTemplate.query(
            """
                SELECT product.id
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.product_code = ? AND product.active = 1 AND version.status = 'ACTIVE'
                  AND (
                      product.product_type = 'CORE'
                      OR EXISTS (SELECT 1 FROM billing_available_commercial_products availability WHERE availability.id = product.id)
                  )
                ORDER BY version.effective_from DESC, version.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong(1),
            code
        ).stream().findFirst().orElseThrow(() -> new IllegalArgumentException("Unknown active product_code."));
    }

    private void requireCompany(long companyId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM companies WHERE id = ?",
            Integer.class,
            companyId
        );
        if (count == null || count == 0) {
            throw new NoSuchElementException("Company not found.");
        }
    }

    private int scalar(String sql) {
        var result = jdbcTemplate.queryForObject(sql, Integer.class);
        return result == null ? 0 : result;
    }

    private long scalarLong(String sql) {
        var result = jdbcTemplate.queryForObject(sql, Long.class);
        return result == null ? 0L : result;
    }

    private static List<String> csv(String value, String separatorRegex) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(value.split(separatorRegex))
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .toList();
    }

    private static String lower(Object value) {
        return value == null ? "" : value.toString().trim().toLowerCase(Locale.ROOT);
    }

    private static String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String nullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private Integer remainingDays(Instant endsAt) {
        if (endsAt == null) return null;
        var seconds = endsAt.getEpochSecond() - clock.instant().getEpochSecond();
        if (seconds <= 0) return 0;
        return (int) Math.ceil(seconds / 86_400.0);
    }

    public record BenefitRequest(
        String benefit_type,
        String product_code,
        Integer quantity,
        String source_type,
        String reason,
        String campaign_code,
        String stripe_coupon_id,
        String stripe_promotion_code_id,
        Instant starts_at,
        Instant ends_at
    ) {
    }

    public record RevokeRequest(String reason) {
    }

    public record ModuleAvailabilityRequest(Boolean active, String reason) {
    }

    public record AccountTypeUpdateRequest(String account_type) {
    }

    public record CompanyDeletionRequest(String confirmation_name, String reason) {
    }

    public record PublicDemoUpdateRequest(Boolean enabled) {
    }

    public record DistributorAssignmentRequest(Long distributor_company_id) {
    }

    private record ModuleAvailabilityRow(long id, String slug, String name, boolean core, boolean active) {
    }
}
