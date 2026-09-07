package com.indice.erp.platformadmin;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import com.indice.erp.billing.storage.StorageQuotaService;
import com.indice.erp.configcenter.users.ConfigCenterTabPermissionCatalog;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
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
import org.springframework.beans.factory.annotation.Autowired;
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
    private final StripePhaseTwoProperties stripeProperties;

    @Autowired
    public PlatformAdminService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit,
        CompanyEntitlementProjectionService entitlementProjection,
        StorageQuotaService storageQuota,
        CommercialOfferSelectionService commercialOffers,
        Clock clock,
        StripePhaseTwoProperties stripeProperties
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessService = accessService;
        this.audit = audit;
        this.entitlementProjection = entitlementProjection;
        this.storageQuota = storageQuota;
        this.commercialOffers = commercialOffers;
        this.clock = clock;
        this.stripeProperties = stripeProperties;
    }

    public PlatformAdminService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit,
        CompanyEntitlementProjectionService entitlementProjection,
        StorageQuotaService storageQuota,
        CommercialOfferSelectionService commercialOffers,
        Clock clock
    ) {
        this(jdbcTemplate, accessService, audit, entitlementProjection, storageQuota, commercialOffers, clock, null);
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
        body.put("can_manage_accounts", access.allows("PLATFORM_ACCOUNTS_WRITE"));
        body.put("can_create_accounts", access.allows("PLATFORM_ACCOUNTS_WRITE") && access.allows("PLATFORM_BENEFITS_WRITE"));
        body.put("can_manage_system_tickets", access.allows("SYSTEM_TICKETS_MANAGE"));
        return body;
    }

    public Map<String, Object> overview(long actorUserId, String rawQuery, int requestedLimit) {
        return overview(actorUserId, rawQuery, "all", "all", "id", "desc", 1, requestedLimit);
    }

    public Map<String, Object> overview(
        long actorUserId,
        String rawQuery,
        String rawUserType,
        String rawStatus,
        String rawSort,
        String rawDirection,
        int requestedPage,
        int requestedPageSize
    ) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        if (query.length() > 120) {
            throw new IllegalArgumentException("Company search must contain at most 120 characters.");
        }
        var userType = upper(rawUserType);
        var status = lower(rawStatus);
        var sort = lower(rawSort);
        var direction = "asc".equals(lower(rawDirection)) ? 1 : -1;
        var requestedSafePage = Math.max(1, requestedPage);
        var pageSize = Math.max(1, Math.min(requestedPageSize, 500));
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
                       subscription.catalog_version_id,
                       subscription_catalog.version_code AS catalog_version,
                       active_catalog.id AS active_catalog_version_id,
                       active_catalog.version_code AS active_catalog_version,
                       lifecycle.state AS lifecycle_state,
                       lifecycle.access_mode AS access_mode,
                       subscription.offer_code,
                       subscription.billing_interval,
                       subscription.currency,
                       subscription.subtotal_amount_cents,
                       COALESCE(subscription.discount_amount_cents, 0) AS discount_amount_cents,
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
                       EXISTS (
                           SELECT 1
                           FROM platform_trial_extensions extension
                           WHERE extension.company_id = company.id
                             AND extension.status = 'COMPLETED'
                       ) AS trial_extension_used,
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
                       COALESCE(
                           GREATEST(
                               subscription.subtotal_amount_cents
                                   - COALESCE(subscription.discount_amount_cents, 0),
                               0
                           ),
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
                       )
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
                LEFT JOIN billing_catalog_versions subscription_catalog
                  ON subscription_catalog.id = subscription.catalog_version_id
                LEFT JOIN billing_catalog_versions active_catalog
                  ON active_catalog.id = (
                      SELECT active_version.id
                      FROM billing_catalog_versions active_version
                      WHERE active_version.status = 'ACTIVE'
                        AND (active_version.effective_from IS NULL OR active_version.effective_from <= CURRENT_TIMESTAMP(6))
                        AND (active_version.effective_to IS NULL OR active_version.effective_to > CURRENT_TIMESTAMP(6))
                      ORDER BY active_version.effective_from DESC, active_version.id DESC
                      LIMIT 1
                  )
                LEFT JOIN billing_signup_intents signup ON signup.id = subscription.signup_intent_id
                LEFT JOIN billing_invoice_snapshots invoice
                  ON invoice.id = (
                      SELECT MAX(candidate_invoice.id)
                      FROM billing_invoice_snapshots candidate_invoice
                      WHERE candidate_invoice.company_id = company.id
                  )
                ORDER BY company.id DESC
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
                var catalogVersionId = (Long) rs.getObject("catalog_version_id");
                var activeCatalogVersionId = (Long) rs.getObject("active_catalog_version_id");
                row.put("catalog_version_id", catalogVersionId);
                row.put("catalog_version", nullable(rs.getString("catalog_version")));
                row.put("active_catalog_version_id", activeCatalogVersionId);
                row.put("active_catalog_version", nullable(rs.getString("active_catalog_version")));
                row.put(
                    "catalog_version_historical",
                    catalogVersionId != null && activeCatalogVersionId != null
                        && !catalogVersionId.equals(activeCatalogVersionId)
                );
                row.put("lifecycle_state", nullable(rs.getString("lifecycle_state")));
                row.put("access_mode", nullable(rs.getString("access_mode")));
                row.put("offer_code", nullable(rs.getString("offer_code")));
                row.put("billing_interval", nullable(rs.getString("billing_interval")));
                row.put("currency", nullable(rs.getString("currency")));
                row.put("subtotal_amount_cents", rs.getObject("subtotal_amount_cents"));
                row.put("discount_amount_cents", rs.getLong("discount_amount_cents"));
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
                row.put("trial_extendable", trialSource != null && !rs.getBoolean("trial_extension_used"));
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
            }
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
        totals.put("demo_and_trial_accounts", companies.stream()
            .filter(company -> Set.of("demo", "trial").contains(commercialStatus(company)))
            .count());
        totals.put("currency", "USD");

        var filteredCompanies = companies.stream()
            .filter(company -> matchesCompanySearch(company, query))
            .filter(company -> "ALL".equals(userType) || userType.isBlank()
                || userType.equalsIgnoreCase(String.valueOf(company.get("user_type"))))
            .filter(company -> matchesCompanyStatus(company, status))
            .sorted(companyComparator(sort, direction))
            .toList();
        var totalItems = filteredCompanies.size();
        var totalPages = Math.max(1, (int) Math.ceil(totalItems / (double) pageSize));
        var page = Math.min(requestedSafePage, totalPages);
        var fromIndex = Math.min((page - 1) * pageSize, totalItems);
        var toIndex = Math.min(fromIndex + pageSize, totalItems);
        var pageCompanies = new ArrayList<>(filteredCompanies.subList(fromIndex, toIndex));

        var managedCustomers = companies.stream()
            .filter(PlatformAdminService::isManagedCustomer)
            .toList();
        var priorities = managedCustomers.stream()
            .filter(company -> customerPriorityScore(company) > 0)
            .sorted(Comparator
                .comparingInt(PlatformAdminService::customerPriorityScore)
                .reversed()
                .thenComparing(company -> lower(company.get("name"))))
            .limit(5)
            .toList();
        var control = new LinkedHashMap<String, Object>();
        control.put("attention", managedCustomers.stream().filter(PlatformAdminService::isCustomerAttentionAccount).count());
        control.put("expiring", managedCustomers.stream().filter(PlatformAdminService::isCustomerTrialEndingSoon).count());
        control.put("no_offer", managedCustomers.stream().filter(PlatformAdminService::isCustomerWithoutOffer).count());
        control.put("no_adoption", managedCustomers.stream().filter(PlatformAdminService::isCustomerWithoutAdoption).count());
        control.put("priorities", priorities);

        var pagination = new LinkedHashMap<String, Object>();
        pagination.put("page", page);
        pagination.put("page_size", pageSize);
        pagination.put("total_items", totalItems);
        pagination.put("total_pages", totalPages);

        var result = new LinkedHashMap<String, Object>();
        result.put("totals", totals);
        result.put("companies", pageCompanies);
        result.put("pagination", pagination);
        result.put("control", control);
        result.put("distributors", companies.stream()
            .filter(company -> "DISTRIBUTOR".equalsIgnoreCase(String.valueOf(company.get("user_type"))))
            .filter(company -> !"deleted".equals(lower(company.get("platform_status"))))
            .sorted(Comparator.comparing(company -> lower(company.get("name"))))
            .toList());
        return result;
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

    public Map<String, Object> companyOptions(
        long actorUserId,
        String rawQuery,
        int requestedPage,
        int requestedPageSize
    ) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        if (query.length() > 120) {
            throw new IllegalArgumentException("Company search must contain at most 120 characters.");
        }
        var pageSize = Math.max(10, Math.min(requestedPageSize, 100));
        var pattern = "%" + query + "%";
        var joins = """
             FROM companies company
             LEFT JOIN company_ownerships ownership
               ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
             LEFT JOIN users owner ON owner.id = ownership.owner_user_id
            """;
        var where = """
             WHERE (? = ''
                OR LOWER(company.name) LIKE ?
                OR LOWER(COALESCE(owner.email, '')) LIKE ?
                OR CAST(company.id AS CHAR) = ?)
            """;
        var totalResult = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) " + joins + where,
            Integer.class,
            query,
            pattern,
            pattern,
            query
        );
        var totalItems = totalResult == null ? 0 : totalResult;
        var totalPages = Math.max(1, (int) Math.ceil(totalItems / (double) pageSize));
        var page = Math.min(Math.max(1, requestedPage), totalPages);
        var offset = (page - 1) * pageSize;
        var companies = jdbcTemplate.query(
            """
                SELECT company.id, company.name, company.platform_status,
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
                       owner.email AS owner_email,
                       (SELECT COUNT(*)
                          FROM user_companies membership
                         WHERE membership.company_id = company.id
                           AND LOWER(COALESCE(membership.status, 'active')) = 'active') AS active_members
                """ + joins + where + """
                 ORDER BY company.name, company.id
                 LIMIT ? OFFSET ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("platform_status", rs.getString("platform_status"));
                row.put("user_type", rs.getString("user_type"));
                row.put("owner_email", nullable(rs.getString("owner_email")));
                row.put("active_members", rs.getInt("active_members"));
                return row;
            },
            query,
            pattern,
            pattern,
            query,
            pageSize,
            offset
        );
        return Map.of(
            "companies", companies,
            "pagination", Map.of(
                "page", page,
                "page_size", pageSize,
                "total_items", totalItems,
                "total_pages", totalPages
            )
        );
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

    private static boolean matchesCompanySearch(Map<String, Object> company, String query) {
        if (query == null || query.isBlank()) {
            return true;
        }
        return java.util.stream.Stream.of(
            company.get("name"),
            company.get("owner_email"),
            company.get("distributor_company_name"),
            company.get("created_by_distributor_company_name"),
            company.get("id")
        )
            .filter(java.util.Objects::nonNull)
            .map(PlatformAdminService::lower)
            .anyMatch(value -> value.contains(query));
    }

    private static boolean matchesCompanyStatus(Map<String, Object> company, String status) {
        if (status == null || status.isBlank() || "all".equals(status)) {
            return true;
        }
        return switch (status) {
            case "temporary" -> Set.of("demo", "trial").contains(commercialStatus(company));
            case "attention" -> isCustomerAttentionAccount(company);
            case "expiring" -> isCustomerTrialEndingSoon(company);
            case "no_offer" -> isCustomerWithoutOffer(company);
            case "no_adoption" -> isCustomerWithoutAdoption(company);
            case "active", "trial", "demo", "inactive", "deleted" -> status.equals(commercialStatus(company));
            default -> true;
        };
    }

    private static String commercialStatus(Map<String, Object> company) {
        if ("deleted".equals(lower(company.get("platform_status")))) {
            return "deleted";
        }
        var billingStatus = lower(company.get("billing_status"));
        var lifecycleState = lower(company.get("lifecycle_state"));
        var accessMode = lower(company.get("access_mode"));
        if ("trialing".equals(billingStatus) || "trial".equals(lifecycleState)) {
            return "trial";
        }
        if (billingStatus.isBlank() && number(company.get("temporary_benefits")) > 0) {
            return "demo";
        }
        if (Set.of("active", "paid").contains(billingStatus)
            || Set.of("active", "grace").contains(lifecycleState)
            || "full".equals(accessMode)
            || number(company.get("active_benefits")) > 0) {
            return "active";
        }
        return "inactive";
    }

    private static boolean isManagedCustomer(Map<String, Object> company) {
        return "SUPER_ADMIN".equalsIgnoreCase(String.valueOf(company.get("user_type")))
            && !"deleted".equals(commercialStatus(company));
    }

    private static boolean isCustomerAttentionAccount(Map<String, Object> company) {
        if (!isManagedCustomer(company)) {
            return false;
        }
        var paymentStatus = lower(company.get("last_invoice_status"));
        if (paymentStatus.isBlank()) {
            paymentStatus = lower(company.get("last_payment_status"));
        }
        return Set.of("past_due", "unpaid", "failed").contains(paymentStatus)
            || "inactive".equals(commercialStatus(company))
            || "UNAVAILABLE".equalsIgnoreCase(String.valueOf(company.get("billing_amount_kind")))
            || isCustomerTrialExpired(company);
    }

    private static boolean isCustomerTrialExpired(Map<String, Object> company) {
        return company.get("trial_source") != null
            && number(company.get("trial_days_remaining")) <= 0;
    }

    private static boolean isCustomerTrialEndingSoon(Map<String, Object> company) {
        var remaining = number(company.get("trial_days_remaining"));
        return isManagedCustomer(company)
            && company.get("trial_source") != null
            && remaining > 0
            && remaining <= 7;
    }

    private static boolean isCustomerWithoutOffer(Map<String, Object> company) {
        return isManagedCustomer(company)
            && lower(company.get("offer_code")).isBlank()
            && lower(company.get("projected_offer_code")).isBlank()
            && listSize(company.get("product_names")) == 0
            && listSize(company.get("product_codes")) == 0;
    }

    private static boolean isCustomerWithoutAdoption(Map<String, Object> company) {
        return isManagedCustomer(company)
            && Set.of("active", "trial", "demo").contains(commercialStatus(company))
            && number(company.get("active_members")) == 0;
    }

    private static int customerPriorityScore(Map<String, Object> company) {
        if (!isManagedCustomer(company)) {
            return 0;
        }
        var score = 0;
        var paymentStatus = lower(company.get("last_invoice_status"));
        if (paymentStatus.isBlank()) {
            paymentStatus = lower(company.get("last_payment_status"));
        }
        if (Set.of("past_due", "unpaid", "failed").contains(paymentStatus)) score += 100;
        if (isCustomerTrialExpired(company)) score += 90;
        if ("inactive".equals(commercialStatus(company))) score += 80;
        if ("UNAVAILABLE".equalsIgnoreCase(String.valueOf(company.get("billing_amount_kind")))) score += 70;
        if (isCustomerTrialEndingSoon(company)) score += 60;
        if (lower(company.get("owner_email")).isBlank()) score += 50;
        if (isCustomerWithoutOffer(company)) score += 40;
        if (isCustomerWithoutAdoption(company)) score += 30;
        return score;
    }

    private static Comparator<Map<String, Object>> companyComparator(String sort, int direction) {
        Comparator<Map<String, Object>> comparator = switch (sort) {
            case "customer" -> Comparator.comparing(company -> lower(company.get("name")));
            case "usertype" -> Comparator.comparing(company -> lower(company.get("user_type")));
            case "distributor" -> Comparator.comparing(company -> lower(firstPresent(
                company.get("created_by_distributor_company_name"),
                company.get("distributor_company_name"),
                company.get("creation_origin"),
                company.get("name")
            )));
            case "status" -> Comparator.comparing(PlatformAdminService::commercialStatus);
            case "plan" -> Comparator.comparing(company -> lower(firstPresent(
                company.get("offer_code"), company.get("projected_offer_code")
            )));
            case "rate" -> Comparator.comparingLong(company -> number(company.get("billing_amount_cents")));
            case "users" -> Comparator.comparingLong(company -> number(company.get("active_members")));
            case "nextevent" -> Comparator.comparing(company -> instantValue(firstPresent(
                company.get("trial_source") == null ? null : company.get("trial_ends_at"),
                company.get("current_period_ends_at")
            )));
            case "payment" -> Comparator.comparing(company -> lower(firstPresent(
                company.get("last_invoice_status"), company.get("last_payment_status")
            )));
            default -> Comparator.comparingLong(company -> number(company.get("id")));
        };
        comparator = comparator.thenComparingLong(company -> number(company.get("id")));
        return direction < 0 ? comparator.reversed() : comparator;
    }

    private static long number(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private static int listSize(Object value) {
        return value instanceof List<?> list ? list.size() : 0;
    }

    private static Object firstPresent(Object... values) {
        for (var value : values) {
            if (value != null && !String.valueOf(value).isBlank()) {
                return value;
            }
        }
        return "";
    }

    private static Instant instantValue(Object value) {
        if (value instanceof Instant instant) {
            return instant;
        }
        try {
            return value == null ? Instant.EPOCH : Instant.parse(String.valueOf(value));
        } catch (RuntimeException ignored) {
            return Instant.EPOCH;
        }
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
                       subscription.catalog_version_id,
                       subscription_catalog.version_code AS catalog_version,
                       active_catalog.id AS active_catalog_version_id,
                       active_catalog.version_code AS active_catalog_version,
                       subscription.offer_code, subscription.billing_interval,
                       subscription.currency,
                       subscription.included_seats, subscription.extra_seats,
                       subscription.subtotal_amount_cents,
                       COALESCE(subscription.discount_amount_cents, 0) AS discount_amount_cents,
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
                LEFT JOIN billing_catalog_versions subscription_catalog
                  ON subscription_catalog.id = subscription.catalog_version_id
                LEFT JOIN billing_catalog_versions active_catalog
                  ON active_catalog.id = (
                      SELECT active_version.id
                      FROM billing_catalog_versions active_version
                      WHERE active_version.status = 'ACTIVE'
                        AND (active_version.effective_from IS NULL OR active_version.effective_from <= CURRENT_TIMESTAMP(6))
                        AND (active_version.effective_to IS NULL OR active_version.effective_to > CURRENT_TIMESTAMP(6))
                      ORDER BY active_version.effective_from DESC, active_version.id DESC
                      LIMIT 1
                  )
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
                var catalogVersionId = (Long) rs.getObject("catalog_version_id");
                var activeCatalogVersionId = (Long) rs.getObject("active_catalog_version_id");
                row.put("catalog_version_id", catalogVersionId);
                row.put("catalog_version", nullable(rs.getString("catalog_version")));
                row.put("active_catalog_version_id", activeCatalogVersionId);
                row.put("active_catalog_version", nullable(rs.getString("active_catalog_version")));
                row.put(
                    "catalog_version_historical",
                    catalogVersionId != null && activeCatalogVersionId != null
                        && !catalogVersionId.equals(activeCatalogVersionId)
                );
                row.put("offer_code", nullable(rs.getString("offer_code")));
                row.put("billing_interval", nullable(rs.getString("billing_interval")));
                row.put("currency", nullable(rs.getString("currency")));
                row.put("included_seats", rs.getObject("included_seats"));
                row.put("extra_seats", rs.getObject("extra_seats"));
                var subtotalAmountCents = (Long) rs.getObject("subtotal_amount_cents");
                var discountAmountCents = rs.getLong("discount_amount_cents");
                row.put("subtotal_amount_cents", subtotalAmountCents);
                row.put("discount_amount_cents", discountAmountCents);
                row.put(
                    "recurring_amount_cents",
                    subtotalAmountCents == null ? null : Math.max(0L, subtotalAmountCents - discountAmountCents)
                );
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
        body.put("commercial_change", companyCommercialChange(companyId));
        return body;
    }

    private Map<String, Object> companyCommercialChange(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT change_row.public_reference, change_row.change_kind, change_row.status,
                       change_row.effective_at, version_row.version_code, change_row.offer_code,
                       change_row.billing_interval, change_row.currency,
                       change_row.included_seats, change_row.extra_seats,
                       change_row.estimated_amount_cents, change_row.requested_by_authority,
                       (SELECT GROUP_CONCAT(product.product_code ORDER BY selected.sort_order, product.id SEPARATOR ',')
                          FROM company_billing_selection_change_products selected
                          JOIN billing_catalog_products product ON product.id = selected.catalog_product_id
                         WHERE selected.change_id = change_row.id) AS product_codes,
                       (SELECT GROUP_CONCAT(product.display_name ORDER BY selected.sort_order, product.id SEPARATOR '|')
                          FROM company_billing_selection_change_products selected
                          JOIN billing_catalog_products product ON product.id = selected.catalog_product_id
                         WHERE selected.change_id = change_row.id) AS product_names
                FROM company_billing_selection_changes change_row
                JOIN billing_catalog_versions version_row ON version_row.id = change_row.catalog_version_id
                WHERE change_row.company_id = ? AND change_row.status IN ('DRAFT', 'PENDING_STRIPE', 'SCHEDULED')
                ORDER BY FIELD(change_row.status, 'PENDING_STRIPE', 'SCHEDULED', 'DRAFT'), change_row.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("reference", rs.getString("public_reference"));
                row.put("kind", rs.getString("change_kind"));
                row.put("status", rs.getString("status"));
                row.put("effective_at", instant(rs.getTimestamp("effective_at")));
                row.put("catalog_version", rs.getString("version_code"));
                row.put("offer_code", rs.getString("offer_code"));
                row.put("billing_interval", rs.getString("billing_interval"));
                row.put("currency", rs.getString("currency"));
                row.put("included_seats", rs.getInt("included_seats"));
                row.put("extra_seats", rs.getInt("extra_seats"));
                row.put("estimated_amount_cents", rs.getObject("estimated_amount_cents"));
                row.put("requested_by_authority", rs.getString("requested_by_authority"));
                row.put("product_codes", csv(rs.getString("product_codes"), ","));
                row.put("product_names", csv(rs.getString("product_names"), "\\|"));
                return row;
            },
            companyId
        ).stream().findFirst().orElse(null);
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
        var reason = requireOperationalReason(request.reason());
        var accountType = upper(request.account_type());
        if (!COMMERCIAL_ACCOUNT_TYPES.contains(accountType)) {
            throw new IllegalArgumentException("Account type must be SUPER_ADMIN or DISTRIBUTOR.");
        }
        var rows = jdbcTemplate.query(
            """
                SELECT company.commercial_account_type, company.platform_status,
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
                FOR UPDATE
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "account_type", rs.getString("commercial_account_type"),
                "platform_status", rs.getString("platform_status"),
                "platform_root", rs.getBoolean("platform_root")
            ),
            companyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Company not found.");
        }
        var current = rows.getFirst();
        requireActiveCompanyStatus(current.get("platform_status"));
        if (Boolean.TRUE.equals(current.get("platform_root"))) {
            throw new IllegalStateException("Root authority must be managed from platform administrator security.");
        }
        var previousType = String.valueOf(current.get("account_type"));
        var changed = !accountType.equals(previousType);
        if (changed) {
            jdbcTemplate.update(
                "UPDATE companies SET commercial_account_type = ? WHERE id = ? AND platform_status = 'ACTIVE'",
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
                Map.of("previous_type", previousType, "user_type", accountType, "reason", reason)
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
        var reason = requireOperationalReason(request.reason());
        var rows = jdbcTemplate.query(
            """
                SELECT commercial_account_type, public_demo_enabled, platform_status
                FROM companies
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "account_type", rs.getString("commercial_account_type"),
                "enabled", rs.getBoolean("public_demo_enabled"),
                "platform_status", rs.getString("platform_status")
            ),
            companyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Company not found.");
        }
        var current = rows.getFirst();
        requireActiveCompanyStatus(current.get("platform_status"));
        if (!"SUPER_ADMIN".equals(current.get("account_type"))) {
            throw new IllegalStateException("Only customer accounts can be enabled as public demos.");
        }
        var previous = Boolean.TRUE.equals(current.get("enabled"));
        var enabled = request.enabled();
        var changed = previous != enabled;
        if (changed) {
            jdbcTemplate.update(
                "UPDATE companies SET public_demo_enabled = ? WHERE id = ? AND platform_status = 'ACTIVE'",
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
                Map.of("previous_enabled", previous, "public_demo_enabled", enabled, "reason", reason)
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
        var reason = requireOperationalReason(request.reason());
        var companies = jdbcTemplate.query(
            """
                SELECT company.name,
                       company.commercial_account_type,
                       company.platform_status,
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
                FOR UPDATE
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("company_name", rs.getString("name"));
                row.put("account_type", rs.getString("commercial_account_type"));
                row.put("platform_status", rs.getString("platform_status"));
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
        requireActiveCompanyStatus(company.get("platform_status"));
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
                    WHERE id = ?
                      AND commercial_account_type = 'DISTRIBUTOR'
                      AND platform_status = 'ACTIVE'
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
                "UPDATE companies SET distributor_company_id = ? WHERE id = ? AND platform_status = 'ACTIVE'",
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
            detail.put("reason", reason);
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
        return billing(actorUserId, "", "all", "period", "desc", 1, requestedLimit);
    }

    public Map<String, Object> billing(
        long actorUserId,
        String rawQuery,
        String rawStatus,
        String rawSort,
        String rawDirection,
        int requestedPage,
        int requestedPageSize
    ) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        if (query.length() > 120) {
            throw new IllegalArgumentException("Billing search must contain at most 120 characters.");
        }
        var status = lower(rawStatus);
        var sortExpression = switch (lower(rawSort)) {
            case "customer" -> "LOWER(COALESCE(company.name, ''))";
            case "invoice" -> "LOWER(COALESCE(invoice.stripe_invoice_id, ''))";
            case "status" -> "LOWER(COALESCE(invoice.status, ''))";
            case "amount" -> "COALESCE(invoice.amount_due_cents, 0)";
            case "paid" -> "COALESCE(invoice.amount_paid_cents, 0)";
            default -> "COALESCE(invoice.period_starts_at, invoice.updated_at)";
        };
        var sortDirection = "asc".equals(lower(rawDirection)) ? "ASC" : "DESC";
        var pageSize = Math.max(1, Math.min(requestedPageSize, 200));
        var where = new StringBuilder(" WHERE 1 = 1");
        var parameters = new ArrayList<Object>();
        if (!query.isBlank()) {
            var pattern = "%" + query + "%";
            where.append("""
                 AND (LOWER(COALESCE(company.name, '')) LIKE ?
                   OR LOWER(COALESCE(owner.email, '')) LIKE ?
                   OR LOWER(COALESCE(invoice.stripe_invoice_id, '')) LIKE ?
                   OR LOWER(COALESCE(invoice.status, '')) LIKE ?
                   OR CAST(invoice.company_id AS CHAR) = ?)
                """);
            parameters.add(pattern);
            parameters.add(pattern);
            parameters.add(pattern);
            parameters.add(pattern);
            parameters.add(query);
        }
        switch (status) {
            case "paid" -> where.append(" AND LOWER(COALESCE(invoice.status, '')) = 'paid'");
            case "open" -> where.append(" AND LOWER(COALESCE(invoice.status, '')) = 'open'");
            case "attention" -> where.append(" AND LOWER(COALESCE(invoice.status, '')) IN ('past_due', 'uncollectible', 'void')");
            default -> {
                // Unknown and empty filters intentionally fall back to the complete authorized list.
            }
        }
        var fromSql = """
             FROM billing_invoice_snapshots invoice
             LEFT JOIN companies company ON company.id = invoice.company_id
             LEFT JOIN company_ownerships ownership
               ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
             LEFT JOIN users owner ON owner.id = ownership.owner_user_id
            """;
        var totalResult = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) " + fromSql + where,
            Integer.class,
            parameters.toArray()
        );
        var totalItems = totalResult == null ? 0 : totalResult;
        var totalPages = Math.max(1, (int) Math.ceil(totalItems / (double) pageSize));
        var page = Math.min(Math.max(1, requestedPage), totalPages);
        var offset = (page - 1) * pageSize;
        var pageParameters = new ArrayList<>(parameters);
        pageParameters.add(pageSize);
        pageParameters.add(offset);
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
            """ + fromSql + where + " ORDER BY " + sortExpression + " " + sortDirection
                + ", invoice.id DESC LIMIT ? OFFSET ?",
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
            pageParameters.toArray()
        );
        var totals = new LinkedHashMap<String, Object>();
        totals.put("invoices", scalar("SELECT COUNT(*) FROM billing_invoice_snapshots"));
        totals.put("paid_cents", scalarLong("SELECT COALESCE(SUM(amount_paid_cents), 0) FROM billing_invoice_snapshots WHERE currency = 'USD' AND LOWER(COALESCE(status, '')) = 'paid'"));
        totals.put("open_cents", scalarLong("SELECT COALESCE(SUM(COALESCE(amount_due_cents, 0) - COALESCE(amount_paid_cents, 0)), 0) FROM billing_invoice_snapshots WHERE currency = 'USD' AND LOWER(COALESCE(status, '')) IN ('open', 'past_due', 'uncollectible')"));
        totals.put("failed", scalar("SELECT COUNT(*) FROM billing_invoice_snapshots WHERE LOWER(COALESCE(status, '')) IN ('past_due', 'uncollectible', 'void')"));
        totals.put("currency", "USD");
        var pagination = Map.of(
            "page", page,
            "page_size", pageSize,
            "total_items", totalItems,
            "total_pages", totalPages
        );
        return Map.of("totals", totals, "invoices", invoices, "pagination", pagination);
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
                       product.commercial_kind, product.description, product.external_product_id,
                       product.stripe_mode, product.stripe_account_id, product.stripe_verified_at,
                       product.stripe_sync_status,
                       (SELECT monthly_price.unit_amount_cents
                          FROM billing_catalog_prices monthly_price
                         WHERE monthly_price.catalog_product_id = product.id
                           AND monthly_price.billing_interval = 'MONTH'
                           AND monthly_price.currency = 'USD'
                         ORDER BY monthly_price.id DESC LIMIT 1) AS monthly_price_cents,
                       (SELECT annual_price.unit_amount_cents
                          FROM billing_catalog_prices annual_price
                         WHERE annual_price.catalog_product_id = product.id
                           AND annual_price.billing_interval = 'YEAR'
                           AND annual_price.currency = 'USD'
                         ORDER BY annual_price.id DESC LIMIT 1) AS annual_price_cents,
                       EXISTS(
                         SELECT 1 FROM billing_catalog_products model_marker
                         WHERE model_marker.catalog_version_id = product.catalog_version_id
                           AND model_marker.commercial_kind = 'SEAT'
                           AND BINARY model_marker.product_code = BINARY 'extra_user'
                       ) AS commercial_model,
                       product.sort_order, product.active,
                       CASE
                         WHEN product.product_type = 'CORE' OR availability.id IS NOT NULL THEN 1
                         WHEN product.active = 1 AND product.commercial_kind IN ('MODULE', 'PACKAGE', 'SEAT')
                          AND product.stripe_verified_at IS NOT NULL
                          AND product.stripe_sync_status = 'READY'
                          AND (SELECT COUNT(DISTINCT direct_price.billing_interval)
                                 FROM billing_catalog_prices direct_price
                                WHERE direct_price.catalog_product_id = product.id
                                  AND direct_price.billing_interval IN ('MONTH', 'YEAR')
                                  AND direct_price.currency = 'USD' AND direct_price.unit_amount_cents > 0
                                  AND direct_price.stripe_verified_at IS NOT NULL
                                  AND direct_price.stripe_sync_status = 'READY'
                                  AND direct_price.status IN ('READY', 'ACTIVE')) = 2 THEN 1
                         ELSE 0
                       END AS commercially_available,
                       GROUP_CONCAT(capability.capability_code ORDER BY capability.capability_code SEPARATOR ',') AS capabilities,
                       (SELECT GROUP_CONCAT(child.product_code ORDER BY package_item.sort_order, child.id SEPARATOR ',')
                          FROM billing_package_items package_item
                          JOIN billing_catalog_products child ON child.id = package_item.included_product_id
                         WHERE package_item.package_product_id = product.id) AS included_product_codes
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                LEFT JOIN billing_product_capabilities capability ON capability.product_id = product.id
                LEFT JOIN billing_available_commercial_products availability ON availability.id = product.id
                GROUP BY product.id, product.catalog_version_id, version.version_code,
                         product.product_code, product.display_name, product.product_type,
                         product.commercial_kind, product.description, product.external_product_id,
                         product.stripe_mode, product.stripe_account_id, product.stripe_verified_at,
                         product.stripe_sync_status,
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
                row.put("commercial_kind", rs.getString("commercial_kind"));
                row.put("commercial_model", rs.getBoolean("commercial_model"));
                row.put("description", nullable(rs.getString("description")));
                row.put("external_product_id", nullable(rs.getString("external_product_id")));
                row.put("stripe_mode", nullable(rs.getString("stripe_mode")));
                row.put("stripe_account_id", nullable(rs.getString("stripe_account_id")));
                row.put("stripe_verified_at", instant(rs.getTimestamp("stripe_verified_at")));
                row.put("stripe_sync_status", rs.getString("stripe_sync_status"));
                row.put("monthly_price_cents", rs.getObject("monthly_price_cents"));
                row.put("annual_price_cents", rs.getObject("annual_price_cents"));
                row.put("sort_order", rs.getInt("sort_order"));
                row.put("active", rs.getBoolean("active"));
                row.put("commercially_available", rs.getBoolean("commercially_available"));
                row.put("capabilities", csv(rs.getString("capabilities"), ","));
                row.put("included_product_codes", csv(rs.getString("included_product_codes"), ","));
                return row;
            }
        );
        var prices = jdbcTemplate.query(
            """
                SELECT price.id, price.catalog_version_id, price.catalog_product_id, version.version_code,
                       price.billable_code, price.price_type, price.billing_interval,
                       price.currency, price.unit_amount_cents, price.included_quantity,
                       price.external_price_id, price.stripe_mode, price.stripe_account_id,
                       price.stripe_verified_at, price.stripe_sync_status,
                       price.status, price.effective_from, price.effective_to
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
                row.put("stripe_mode", nullable(rs.getString("stripe_mode")));
                row.put("stripe_account_id", nullable(rs.getString("stripe_account_id")));
                row.put("stripe_verified_at", instant(rs.getTimestamp("stripe_verified_at")));
                row.put("stripe_sync_status", rs.getString("stripe_sync_status"));
                row.put("status", rs.getString("status"));
                row.put("effective_from", instant(rs.getTimestamp("effective_from")));
                row.put("effective_to", instant(rs.getTimestamp("effective_to")));
                return row;
            }
        );
        var promotions = jdbcTemplate.query(
            """
                SELECT promotion.id, promotion.catalog_version_id, version.version_code,
                       promotion.promotion_code, promotion.display_name, promotion.description,
                       promotion.discount_type, promotion.percent_basis_points,
                       promotion.amount_off_cents, promotion.currency, promotion.duration_type,
                       promotion.duration_cycles, promotion.starts_at, promotion.ends_at,
                       promotion.external_promotion_code_id, promotion.stripe_mode,
                       promotion.stripe_account_id, promotion.stripe_verified_at,
                       promotion.stripe_sync_status, promotion.active, promotion.sort_order,
                       (SELECT GROUP_CONCAT(product.product_code ORDER BY product.sort_order, product.id SEPARATOR ',')
                          FROM billing_catalog_promotion_products link
                          JOIN billing_catalog_products product ON product.id = link.catalog_product_id
                         WHERE link.promotion_id = promotion.id) AS product_codes
                FROM billing_catalog_promotions promotion
                JOIN billing_catalog_versions version ON version.id = promotion.catalog_version_id
                ORDER BY version.effective_from DESC, promotion.sort_order, promotion.id
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("catalog_version_id", rs.getLong("catalog_version_id"));
                row.put("version_code", rs.getString("version_code"));
                row.put("promotion_code", rs.getString("promotion_code"));
                row.put("display_name", rs.getString("display_name"));
                row.put("description", nullable(rs.getString("description")));
                row.put("discount_type", rs.getString("discount_type"));
                row.put("percent_basis_points", rs.getObject("percent_basis_points"));
                row.put("amount_off_cents", rs.getObject("amount_off_cents"));
                row.put("currency", rs.getString("currency"));
                row.put("duration_type", rs.getString("duration_type"));
                row.put("duration_cycles", rs.getObject("duration_cycles"));
                row.put("starts_at", instant(rs.getTimestamp("starts_at")));
                row.put("ends_at", instant(rs.getTimestamp("ends_at")));
                row.put("external_promotion_code_id", nullable(rs.getString("external_promotion_code_id")));
                row.put("stripe_mode", nullable(rs.getString("stripe_mode")));
                row.put("stripe_account_id", nullable(rs.getString("stripe_account_id")));
                row.put("stripe_verified_at", instant(rs.getTimestamp("stripe_verified_at")));
                row.put("stripe_sync_status", rs.getString("stripe_sync_status"));
                row.put("active", rs.getBoolean("active"));
                row.put("sort_order", rs.getInt("sort_order"));
                row.put("product_codes", csv(rs.getString("product_codes"), ","));
                return row;
            }
        );
        var result = new LinkedHashMap<String, Object>();
        result.put("versions", versions);
        result.put("products", products);
        result.put("prices", prices);
        result.put("promotions", promotions);
        result.put("stripe_environment", Map.of(
            "enabled", stripeProperties != null && stripeProperties.isEnabled(),
            "mode", stripeProperties != null && "live".equalsIgnoreCase(stripeProperties.getMode()) ? "LIVE" : "TEST",
            "catalog_live_sync_enabled", stripeProperties != null && stripeProperties.isCatalogLiveSyncEnabled()
        ));
        return result;
    }

    /**
     * Returns the customer-facing commercial offer without exposing draft or
     * superseded catalog rows. Callers must authorize their audience first.
     */
    public Map<String, Object> activeCatalogAfterAuthorization() {
        return activeCommercialCatalog(catalogAfterAuthorization());
    }

    static Map<String, Object> activeCommercialCatalog(Map<String, Object> catalog) {
        var versions = catalogRows(catalog.get("versions"));
        var activeVersion = versions.stream()
            .filter(version -> "ACTIVE".equalsIgnoreCase(String.valueOf(version.get("status")).trim()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Active commercial catalog not found."));
        var activeVersionId = numericId(activeVersion.get("id"));

        var result = new LinkedHashMap<String, Object>(catalog);
        result.put("versions", List.of(activeVersion));
        result.put("products", catalogRows(catalog.get("products")).stream()
            .filter(product -> belongsToCatalog(product, activeVersionId))
            .filter(product -> Boolean.TRUE.equals(product.get("active")))
            .filter(product -> !Boolean.FALSE.equals(product.get("commercially_available")))
            .toList());
        result.put("prices", catalogRows(catalog.get("prices")).stream()
            .filter(price -> belongsToCatalog(price, activeVersionId))
            .toList());
        result.put("promotions", catalogRows(catalog.get("promotions")).stream()
            .filter(promotion -> belongsToCatalog(promotion, activeVersionId))
            .filter(promotion -> !Boolean.FALSE.equals(promotion.get("active")))
            .toList());
        return result;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> catalogRows(Object value) {
        if (!(value instanceof List<?> rows)) return List.of();
        return rows.stream()
            .filter(Map.class::isInstance)
            .map(row -> (Map<String, Object>) row)
            .toList();
    }

    private static long numericId(Object value) {
        if (value instanceof Number number) return number.longValue();
        throw new IllegalStateException("Active commercial catalog has an invalid identifier.");
    }

    private static boolean belongsToCatalog(Map<String, Object> row, long catalogVersionId) {
        var value = row.get("catalog_version_id");
        return value instanceof Number number && number.longValue() == catalogVersionId;
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
                SELECT product.id AS catalog_product_id, product.catalog_version_id,
                       version.version_code AS catalog_version, product.product_code,
                       product.display_name, product.product_type, product.commercial_kind,
                       product.sort_order,
                       GROUP_CONCAT(DISTINCT active_product.source ORDER BY active_product.source SEPARATOR ', ') AS source,
                       (SELECT monthly_price.unit_amount_cents
                          FROM billing_catalog_prices monthly_price
                         WHERE monthly_price.catalog_product_id = product.id
                           AND monthly_price.billing_interval = 'MONTH'
                           AND monthly_price.currency = 'USD'
                         ORDER BY monthly_price.id DESC LIMIT 1) AS monthly_price_cents,
                       (SELECT annual_price.unit_amount_cents
                          FROM billing_catalog_prices annual_price
                         WHERE annual_price.catalog_product_id = product.id
                           AND annual_price.billing_interval = 'YEAR'
                           AND annual_price.currency = 'USD'
                         ORDER BY annual_price.id DESC LIMIT 1) AS annual_price_cents,
                       (SELECT GROUP_CONCAT(capability.capability_code ORDER BY capability.capability_code SEPARATOR ',')
                          FROM billing_product_capabilities capability
                         WHERE capability.product_id = product.id) AS capabilities
                FROM (
                    SELECT selected_product.catalog_product_id,
                           CONCAT('SUBSCRIPTION_', selected_product.source) AS source
                    FROM company_billing_subscription_products selected_product
                    JOIN company_billing_subscriptions subscription ON subscription.id = selected_product.subscription_id
                    WHERE subscription.id = (
                        SELECT MAX(candidate.id)
                        FROM company_billing_subscriptions candidate
                        WHERE candidate.company_id = ?
                    )
                      AND LOWER(subscription.status) IN ('trialing', 'active', 'past_due')
                      AND (subscription.current_period_ends_at IS NULL OR subscription.current_period_ends_at > CURRENT_TIMESTAMP(6))
                    UNION ALL
                    SELECT trial.catalog_product_id, 'TRIAL'
                    FROM company_trial_product_grants trial
                    WHERE trial.company_id = ?
                      AND trial.status = 'ACTIVE'
                      AND trial.starts_at <= CURRENT_TIMESTAMP(6)
                      AND trial.ends_at > CURRENT_TIMESTAMP(6)
                    UNION ALL
                    SELECT benefit.catalog_product_id, CONCAT('BENEFIT_', benefit.source_type)
                    FROM company_benefit_grants benefit
                    WHERE benefit.company_id = ?
                      AND benefit.benefit_type = 'PRODUCT'
                      AND benefit.status = 'ACTIVE'
                      AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                      AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
                ) active_product
                JOIN billing_catalog_products product ON product.id = active_product.catalog_product_id
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                GROUP BY product.id, product.catalog_version_id, version.version_code,
                         product.product_code, product.display_name, product.product_type,
                         product.commercial_kind, product.sort_order
                ORDER BY product.sort_order, product.display_name
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("catalog_product_id", rs.getLong("catalog_product_id"));
                row.put("catalog_version_id", rs.getLong("catalog_version_id"));
                row.put("catalog_version", rs.getString("catalog_version"));
                row.put("code", rs.getString("product_code"));
                row.put("name", rs.getString("display_name"));
                row.put("type", rs.getString("product_type"));
                row.put("commercial_kind", rs.getString("commercial_kind"));
                row.put("source", rs.getString("source"));
                row.put("sort_order", rs.getInt("sort_order"));
                row.put("monthly_price_cents", rs.getObject("monthly_price_cents"));
                row.put("annual_price_cents", rs.getObject("annual_price_cents"));
                row.put("capabilities", csv(rs.getString("capabilities"), ","));
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
        requireActiveCompany(companyId);
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

    private void requireActiveCompany(long companyId) {
        var statuses = jdbcTemplate.query(
            "SELECT platform_status FROM companies WHERE id = ? FOR UPDATE",
            (rs, rowNum) -> rs.getString("platform_status"),
            companyId
        );
        if (statuses.isEmpty()) {
            throw new NoSuchElementException("Company not found.");
        }
        requireActiveCompanyStatus(statuses.getFirst());
    }

    private void requireActiveCompanyStatus(Object status) {
        if (!"ACTIVE".equalsIgnoreCase(String.valueOf(status))) {
            throw new IllegalStateException("Deleted accounts cannot receive operational or access changes.");
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

    private static String requireOperationalReason(String value) {
        var reason = value == null ? "" : value.trim();
        if (reason.length() < 5 || reason.length() > 500) {
            throw new IllegalArgumentException("Provide an operational reason between 5 and 500 characters.");
        }
        return reason;
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

    public record AccountTypeUpdateRequest(String account_type, String reason) {
    }

    public record CompanyDeletionRequest(String confirmation_name, String reason) {
    }

    public record PublicDemoUpdateRequest(Boolean enabled, String reason) {
    }

    public record DistributorAssignmentRequest(Long distributor_company_id, String reason) {
    }

    private record ModuleAvailabilityRow(long id, String slug, String name, boolean core, boolean active) {
    }
}
