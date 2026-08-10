package com.indice.erp.platformadmin;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import com.indice.erp.billing.storage.StorageQuotaService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformAdminService {

    private static final Set<String> BENEFIT_TYPES = Set.of("PRODUCT", "SEAT", "STORAGE");
    private static final Set<String> SOURCE_TYPES = Set.of("COURTESY", "PROMOTION", "SUPPORT", "TEST");

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService accessService;
    private final PlatformAuditService audit;
    private final CompanyEntitlementProjectionService entitlementProjection;
    private final StorageQuotaService storageQuota;
    private final Clock clock;

    public PlatformAdminService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit,
        CompanyEntitlementProjectionService entitlementProjection,
        StorageQuotaService storageQuota,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessService = accessService;
        this.audit = audit;
        this.entitlementProjection = entitlementProjection;
        this.storageQuota = storageQuota;
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
        return body;
    }

    public Map<String, Object> overview(long actorUserId, String rawQuery, int requestedLimit) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        var limit = Math.max(1, Math.min(requestedLimit, 100));
        var pattern = "%" + query + "%";
        var companies = jdbcTemplate.query(
            """
                SELECT company.id, company.name,
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
                       lifecycle.state AS lifecycle_state,
                       lifecycle.access_mode AS access_mode,
                       subscription.offer_code,
                       subscription.billing_interval,
                       subscription.currency,
                       subscription.cancel_at_period_end,
                       subscription.trial_ends_at,
                       subscription.current_period_ends_at,
                       subscription.last_payment_status,
                       COALESCE(seats.included_seats, 0) AS included_seats,
                       COALESCE(seats.purchased_extra_seats, 0) AS purchased_extra_seats,
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
                       (
                           SELECT GROUP_CONCAT(product.product_code ORDER BY product.sort_order SEPARATOR ',')
                           FROM company_billing_subscription_products selected_product
                           JOIN billing_catalog_products product ON product.id = selected_product.catalog_product_id
                           WHERE selected_product.subscription_id = subscription.id
                       ) AS product_codes,
                       (
                           SELECT GROUP_CONCAT(product.display_name ORDER BY product.sort_order SEPARATOR '|')
                           FROM company_billing_subscription_products selected_product
                           JOIN billing_catalog_products product ON product.id = selected_product.catalog_product_id
                           WHERE selected_product.subscription_id = subscription.id
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
                           AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))) AS active_benefits
                FROM companies company
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
                WHERE (? = '' OR LOWER(company.name) LIKE ? OR LOWER(COALESCE(owner.email, '')) LIKE ? OR CAST(company.id AS CHAR) = ?)
                ORDER BY company.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("owner_email", nullable(rs.getString("owner_email")));
                row.put("country_code", nullable(rs.getString("country_code")));
                row.put("entitlement_mode", nullable(rs.getString("entitlement_mode")));
                row.put("billing_status", nullable(rs.getString("billing_status")));
                row.put("lifecycle_state", nullable(rs.getString("lifecycle_state")));
                row.put("access_mode", nullable(rs.getString("access_mode")));
                row.put("offer_code", nullable(rs.getString("offer_code")));
                row.put("billing_interval", nullable(rs.getString("billing_interval")));
                row.put("currency", nullable(rs.getString("currency")));
                row.put("cancel_at_period_end", rs.getBoolean("cancel_at_period_end"));
                row.put("trial_ends_at", instant(rs.getTimestamp("trial_ends_at")));
                row.put("current_period_ends_at", instant(rs.getTimestamp("current_period_ends_at")));
                row.put("last_payment_status", nullable(rs.getString("last_payment_status")));
                row.put("included_seats", rs.getInt("included_seats"));
                row.put("purchased_extra_seats", rs.getInt("purchased_extra_seats"));
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
                return row;
            },
            query,
            pattern,
            pattern,
            query,
            limit
        );
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
        totals.put("paid_last_30_days_cents", scalarLong("SELECT COALESCE(SUM(amount_paid_cents), 0) FROM billing_invoice_snapshots WHERE currency = 'USD' AND LOWER(COALESCE(status, '')) = 'paid' AND updated_at >= DATE_SUB(CURRENT_TIMESTAMP(6), INTERVAL 30 DAY)"));
        totals.put("currency", "USD");
        return Map.of("totals", totals, "companies", companies);
    }

    public Map<String, Object> company(long actorUserId, long companyId) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var companies = jdbcTemplate.query(
            """
                SELECT company.id, company.name, policy.mode,
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
        body.put("invoices", companyInvoices(companyId));
        body.put("benefits", listBenefits(companyId));
        body.put("seat_usage", seatUsage(companyId));
        body.put("storage_usage", storageSnapshot(companyId));
        return body;
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
                       GROUP_CONCAT(capability.capability_code ORDER BY capability.capability_code SEPARATOR ',') AS capabilities
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                LEFT JOIN billing_product_capabilities capability ON capability.product_id = product.id
                GROUP BY product.id, product.catalog_version_id, version.version_code,
                         product.product_code, product.display_name, product.product_type,
                         product.sort_order, product.active
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
                row.put("capabilities", csv(rs.getString("capabilities"), ","));
                return row;
            }
        );
        var prices = jdbcTemplate.query(
            """
                SELECT price.id, price.catalog_version_id, version.version_code,
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
                    SELECT billing_event.id, billing_event.event_category,
                           billing_event.action_code, billing_event.outcome,
                           billing_event.request_id, billing_event.stripe_event_id,
                           billing_event.stripe_object_id, billing_event.company_id,
                           billing_event.actor_user_id, billing_event.detail_json,
                           billing_event.occurred_at
                    FROM billing_audit_events billing_event
                    UNION ALL
                    SELECT -platform_event.id AS id, 'PLATFORM_ADMIN' AS event_category,
                           platform_event.action_code, platform_event.outcome,
                           platform_event.request_id, NULL AS stripe_event_id,
                           NULL AS stripe_object_id, platform_event.company_id,
                           platform_event.actor_user_id, platform_event.detail_json,
                           platform_event.occurred_at
                    FROM platform_audit_events platform_event
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
                SELECT product.product_code, product.display_name, product.product_type,
                       product.sort_order, selected_product.source
                FROM company_billing_subscription_products selected_product
                JOIN company_billing_subscriptions subscription ON subscription.id = selected_product.subscription_id
                JOIN billing_catalog_products product ON product.id = selected_product.catalog_product_id
                WHERE subscription.id = (
                    SELECT MAX(candidate.id)
                    FROM company_billing_subscriptions candidate
                    WHERE candidate.company_id = ?
                )
                ORDER BY product.sort_order, product.display_name
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
                       membership.role, membership.status, membership.created_at
                FROM user_companies membership
                JOIN users user ON user.id = membership.user_id
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
            entitlementProjection.refreshIfEnrolled(companyId);
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
        var before = benefitByReference(reference);
        if (before == null || ((Number) before.get("company_id")).longValue() != companyId) {
            throw new NoSuchElementException("Benefit not found.");
        }
        var updated = jdbcTemplate.update(
            """
                UPDATE company_benefit_grants
                SET status = 'REVOKED', revoked_by_user_id = ?, revoked_at = CURRENT_TIMESTAMP(6),
                    reason = CONCAT(reason, '\nRevoked: ', ?)
                WHERE company_id = ? AND public_reference = ? AND status = 'ACTIVE'
                """,
            actorUserId,
            reason == null || reason.isBlank() ? "Administrative decision" : reason.trim(),
            companyId,
            reference
        );
        if (updated == 0) {
            throw new IllegalStateException("Benefit is not active.");
        }
        if ("PRODUCT".equals(before.get("benefit_type"))) {
            entitlementProjection.refreshIfEnrolled(companyId);
        }
        audit.record(actorUserId, "BENEFIT_REVOKED", "COMPANY_BENEFIT", reference, companyId, "SUCCESS", Map.of(
            "reason", reason == null ? "" : reason
        ));
        return benefitByReference(reference);
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

    private record ModuleAvailabilityRow(long id, String slug, String name, boolean core, boolean active) {
    }
}
