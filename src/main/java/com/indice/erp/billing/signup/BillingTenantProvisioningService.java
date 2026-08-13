package com.indice.erp.billing.signup;

import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.indice.erp.billing.storage.StorageQuotaService;
import com.indice.erp.configcenter.users.ConfigCenterTabPermissionCatalog;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingTenantProvisioningService {

    private static final Duration TRIAL_DURATION = Duration.ofDays(30);

    private final BillingProvisioningProperties properties;
    private final BillingSignupIntentRepository signupIntents;
    private final BillingAuditService audit;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;
    private final CompanyEntitlementProjectionService entitlementProjection;
    private final CommercialLifecycleService commercialLifecycle;
    private final StorageQuotaService storageQuota;

    public BillingTenantProvisioningService(
        BillingProvisioningProperties properties,
        BillingSignupIntentRepository signupIntents,
        BillingAuditService audit,
        JdbcTemplate jdbcTemplate,
        Clock clock,
        CompanyEntitlementProjectionService entitlementProjection,
        CommercialLifecycleService commercialLifecycle,
        StorageQuotaService storageQuota
    ) {
        this.properties = properties;
        this.signupIntents = signupIntents;
        this.audit = audit;
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
        this.entitlementProjection = entitlementProjection;
        this.commercialLifecycle = commercialLifecycle;
        this.storageQuota = storageQuota;
    }

    @Transactional
    public ProvisioningResult provisionIfEligible(long intentId) {
        if (!properties.isEnabled()) {
            return ProvisioningResult.disabled(intentId);
        }

        var intent = signupIntents.lockProvisioningSpec(intentId);
        if (intent == null) {
            return new ProvisioningResult(intentId, "NOT_FOUND", null, null, false);
        }
        if ("PROVISIONED".equals(intent.provisioningStatus())) {
            return new ProvisioningResult(intentId, "PROVISIONED", intent.companyId(), intent.ownerUserId(), true);
        }
        if ("REQUIRES_REVIEW".equals(intent.provisioningStatus())) {
            return new ProvisioningResult(intentId, "REQUIRES_REVIEW", null, null, false);
        }
        var courtesySignup = "COURTESY_COMPLETED".equals(intent.checkoutStatus());
        if (!"CHECKOUT_COMPLETED".equals(intent.checkoutStatus()) && !courtesySignup) {
            return new ProvisioningResult(intentId, "NOT_ELIGIBLE", null, null, false);
        }
        var courtesy = courtesySignup ? signupIntents.courtesyProvisioningSpec(intentId) : null;
        if (courtesySignup && courtesy == null) {
            throw new IllegalStateException("Courtesy provisioning details are missing.");
        }

        signupIntents.markProvisioningStarted(intentId);
        var existingUserId = existingUserId(intent.email());
        if (existingUserId != null) {
            signupIntents.markProvisioningReview(
                intentId,
                "EMAIL_ALREADY_REGISTERED",
                "The owner email already belongs to an Índice account and requires a verified account-linking flow."
            );
            audit.record(
                "PROVISIONING", "TENANT_PROVISIONING_REVIEW", "REQUIRES_REVIEW", null, null,
                intent.stripeCustomerId(), null, intentId, Map.of("reason", "EMAIL_ALREADY_REGISTERED")
            );
            return new ProvisioningResult(intentId, "REQUIRES_REVIEW", null, null, false);
        }

        var companyId = insertCompany(intent.companyName());
        var ownerUserId = insertUser(intent.email(), intent.passwordHash(), intent.fullName());
        jdbcTemplate.update(
            "UPDATE companies SET created_by_user_id = ? WHERE id = ?",
            ownerUserId,
            companyId
        );
        var membershipId = insertOwnerMembership(ownerUserId, companyId);
        insertCorporateWorkProfile(intent, companyId, ownerUserId, membershipId);

        jdbcTemplate.update(
            """
                INSERT INTO company_ownerships (
                    company_id, owner_user_id, owner_user_company_id, source_signup_intent_id
                ) VALUES (?, ?, ?, ?)
                """,
            companyId,
            ownerUserId,
            membershipId,
            intentId
        );

        var selectedProductIds = Set.copyOf(signupIntents.productIds(intentId));
        var moduleSlugs = provisionOwnerModules(
            intent.catalogVersionId(),
            companyId,
            membershipId,
            courtesy,
            selectedProductIds
        );
        provisionOwnerTabs(membershipId, moduleSlugs);
        associateBillingRecords(intentId, companyId, intent.stripeCustomerId());
        entitlementProjection.enrollPremiumSignup(companyId, intent.catalogVersionId(), ownerUserId);
        TrialWindow trial = null;
        if (courtesySignup) {
            provisionCourtesyBenefits(intent.catalogVersionId(), intentId, companyId, courtesy);
            entitlementProjection.refreshIfEnrolled(companyId);
            commercialLifecycle.initializeCourtesy(companyId, courtesy.accessEndsAt());
            signupIntents.markCourtesyProvisioned(intentId, companyId);
        } else {
            trial = resolveTrialWindow(intent);
            provisionTrialProducts(intent.catalogVersionId(), intentId, companyId, trial);
            commercialLifecycle.initializeTrial(companyId, trial.endsAt());
        }
        storageQuota.initializeCompany(companyId);
        jdbcTemplate.update(
            """
                INSERT INTO company_seat_states (company_id, included_seats, purchased_extra_seats)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    included_seats = VALUES(included_seats),
                    purchased_extra_seats = VALUES(purchased_extra_seats),
                    version = version + 1
                """,
            companyId,
            Math.max(5, intent.includedSeats()),
            courtesySignup ? 0 : Math.max(0, intent.requestedExtraSeats())
        );
        signupIntents.markProvisioned(intentId, companyId, ownerUserId, membershipId);

        var auditDetail = new java.util.LinkedHashMap<String, Object>();
        auditDetail.put("ownerRole", "superadmin");
        auditDetail.put("scope", "corporate_office");
        auditDetail.put("signupChannel", courtesySignup ? "COURTESY" : "STRIPE");
        auditDetail.put("moduleCount", moduleSlugs.size());
        if (courtesySignup) {
            auditDetail.put("courtesyPermanent", courtesy.permanent());
            if (courtesy.accessEndsAt() != null) auditDetail.put("accessEndsAt", courtesy.accessEndsAt().toString());
        } else {
            auditDetail.put("trialEndsAt", trial.endsAt().toString());
        }
        audit.record(
            "PROVISIONING", "TENANT_PROVISIONED", "SUCCESS", null, null,
            intent.stripeCustomerId(), companyId, intentId,
            auditDetail
        );
        return new ProvisioningResult(intentId, "PROVISIONED", companyId, ownerUserId, true);
    }

    public boolean enabled() {
        return properties.isEnabled();
    }

    public int reconciliationBatchSize() {
        return properties.getReconciliationBatchSize();
    }

    private Long existingUserId(String email) {
        var ids = jdbcTemplate.query(
            "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
            (rs, rowNum) -> rs.getLong(1),
            email
        );
        return ids.isEmpty() ? null : ids.getFirst();
    }

    private long insertCompany(String companyName) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                "INSERT INTO companies (name, commercial_account_type, creation_origin) VALUES (?, 'SUPER_ADMIN', 'WEB_SELF_SERVICE')",
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setString(1, companyName);
            return statement;
        }, keys);
        return requiredKey(keys, "company");
    }

    private long insertUser(String email, String passwordHash, String fullName) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                "INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setString(1, email);
            statement.setString(2, passwordHash);
            statement.setString(3, fullName);
            return statement;
        }, keys);
        return requiredKey(keys, "owner user");
    }

    private long insertOwnerMembership(long userId, long companyId) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_companies (user_id, company_id, role, status, visibility)
                    VALUES (?, ?, 'superadmin', 'active', 'all')
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setLong(1, userId);
            statement.setLong(2, companyId);
            return statement;
        }, keys);
        return requiredKey(keys, "owner membership");
    }

    private void insertCorporateWorkProfile(
        BillingSignupIntentRepository.ProvisioningSpec intent,
        long companyId,
        long userId,
        long membershipId
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO user_work_profiles (
                    company_id, user_company_id, user_id, position, department,
                    unit_id, business_id, registration_country, alternate_phone,
                    status, created_by
                ) VALUES (?, ?, ?, 'Owner', 'Corporate office', NULL, NULL, ?, ?, 'active', ?)
                """,
            companyId,
            membershipId,
            userId,
            intent.countryCode(),
            blankToNull(intent.phone()),
            userId
        );
    }

    private Set<String> provisionOwnerModules(
        long catalogVersionId,
        long companyId,
        long membershipId,
        BillingSignupIntentRepository.CourtesyProvisioningSpec courtesy,
        Set<Long> selectedProductIds
    ) {
        var allowedProducts = courtesy == null ? Set.<String>of() : Set.copyOf(courtesy.productCodes());
        var productModules = jdbcTemplate.query(
            """
                SELECT DISTINCT m.slug, p.id AS product_id, p.product_code, p.product_type
                FROM billing_catalog_products p
                JOIN billing_product_capabilities pc ON pc.product_id = p.id
                JOIN modules m ON CAST(m.slug AS BINARY) = CAST((CASE pc.capability_code
                    WHEN 'sales' THEN 'crm'
                    ELSE pc.capability_code
                END) AS BINARY)
                WHERE p.catalog_version_id = ?
                  AND p.active = 1
                  AND p.product_type IN ('CORE', 'BASIC', 'ADDON')
                  AND m.is_active = 1
                ORDER BY m.slug
                """,
            (rs, rowNum) -> new ProductModule(
                rs.getString("slug"),
                rs.getLong("product_id"),
                rs.getString("product_code"),
                rs.getString("product_type")
            ),
            catalogVersionId
        );
        var moduleSlugs = new LinkedHashSet<String>();
        for (var productModule : productModules) {
            var selectedForAccess = courtesy == null
                ? selectedProductIds.contains(productModule.productId())
                : courtesy.allBasicProducts() || allowedProducts.contains(productModule.productCode());
            if ("CORE".equalsIgnoreCase(productModule.productType()) || selectedForAccess) {
                moduleSlugs.add(productModule.moduleSlug());
            }
        }
        for (var moduleSlug : moduleSlugs) {
            jdbcTemplate.update(
                """
                    INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
                    VALUES (?, ?, 'admin', 100)
                    """,
                membershipId,
                moduleSlug
            );
            jdbcTemplate.update(
                """
                    INSERT INTO company_module_entitlements (company_id, module_slug, status, source)
                    VALUES (?, ?, 'active', 'premium_signup')
                    ON DUPLICATE KEY UPDATE
                        status = VALUES(status),
                        source = VALUES(source)
                    """,
                companyId,
                moduleSlug
            );
        }
        return Set.copyOf(moduleSlugs);
    }

    private void provisionOwnerTabs(long membershipId, Set<String> moduleSlugs) {
        for (var permissionKey : ConfigCenterTabPermissionCatalog.permissionKeysForModuleSlugs(moduleSlugs)) {
            var separator = permissionKey.indexOf('.');
            jdbcTemplate.update(
                """
                    INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
                    VALUES (?, ?, ?, 1)
                    """,
                membershipId,
                permissionKey.substring(0, separator),
                permissionKey.substring(separator + 1)
            );
        }
    }

    private TrialWindow resolveTrialWindow(BillingSignupIntentRepository.ProvisioningSpec intent) {
        var windows = jdbcTemplate.query(
            """
                SELECT trial_starts_at, trial_ends_at
                FROM company_billing_subscriptions
                WHERE signup_intent_id = ?
                  AND trial_starts_at IS NOT NULL
                  AND trial_ends_at IS NOT NULL
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new TrialWindow(
                rs.getTimestamp("trial_starts_at").toInstant(),
                rs.getTimestamp("trial_ends_at").toInstant()
            ),
            intent.id()
        );
        if (!windows.isEmpty()) {
            return windows.getFirst();
        }
        var startsAt = intent.completedAt() == null ? clock.instant() : intent.completedAt();
        return new TrialWindow(startsAt, startsAt.plus(TRIAL_DURATION));
    }

    private void provisionTrialProducts(long catalogVersionId, long intentId, long companyId, TrialWindow trial) {
        jdbcTemplate.update(
            """
                INSERT INTO company_trial_product_grants (
                    company_id, catalog_product_id, source_signup_intent_id,
                    status, starts_at, ends_at
                )
                SELECT ?, p.id, ?, 'ACTIVE', ?, ?
                FROM billing_available_commercial_products p
                JOIN billing_signup_intent_products selected
                  ON selected.catalog_product_id = p.id
                 AND selected.signup_intent_id = ?
                WHERE p.catalog_version_id = ?
                """,
            companyId,
            intentId,
            Timestamp.from(trial.startsAt()),
            Timestamp.from(trial.endsAt()),
            intentId,
            catalogVersionId
        );
    }

    private void provisionCourtesyBenefits(
        long catalogVersionId,
        long intentId,
        long companyId,
        BillingSignupIntentRepository.CourtesyProvisioningSpec courtesy
    ) {
        var allowedCodes = Set.copyOf(courtesy.productCodes());
        var products = jdbcTemplate.query(
            """
                SELECT id, product_code, product_type
                FROM billing_available_commercial_products
                WHERE catalog_version_id = ?
                ORDER BY sort_order, id
                """,
            (rs, rowNum) -> new CourtesyProduct(
                rs.getLong("id"),
                rs.getString("product_code"),
                rs.getString("product_type")
            ),
            catalogVersionId
        );
        for (var product : products) {
            var include = courtesy.allBasicProducts()
                ? "BASIC".equalsIgnoreCase(product.productType())
                : allowedCodes.contains(product.code());
            if (!include) continue;
            insertCourtesyBenefit(
                intentId, companyId, "PRODUCT", product.id(), 1, courtesy,
                "product:" + product.code()
            );
        }
        if (courtesy.includedExtraSeats() > 0) {
            insertCourtesyBenefit(
                intentId, companyId, "SEAT", null, courtesy.includedExtraSeats(), courtesy, "seats"
            );
        }
    }

    private void insertCourtesyBenefit(
        long intentId,
        long companyId,
        String benefitType,
        Long productId,
        int quantity,
        BillingSignupIntentRepository.CourtesyProvisioningSpec courtesy,
        String suffix
    ) {
        jdbcTemplate.update(
            """
                INSERT IGNORE INTO company_benefit_grants (
                    public_reference, company_id, benefit_type, catalog_product_id,
                    quantity, source_type, status, starts_at, ends_at, reason,
                    campaign_code, idempotency_key_hash, created_by_user_id
                ) VALUES (?, ?, ?, ?, ?, 'COURTESY', 'ACTIVE', ?, ?, ?, ?, ?, ?)
                """,
            BillingHashing.randomReference().substring(0, 32),
            companyId,
            benefitType,
            productId,
            quantity,
            Timestamp.from(clock.instant()),
            courtesy.accessEndsAt() == null ? null : Timestamp.from(courtesy.accessEndsAt()),
            courtesy.reason(),
            "SIGNUP-COURTESY",
            BillingHashing.sha256("courtesy-signup:" + intentId + ":" + suffix),
            courtesy.createdByUserId()
        );
    }

    private void associateBillingRecords(long intentId, long companyId, String stripeCustomerId) {
        if (stripeCustomerId != null && !stripeCustomerId.isBlank()) {
            jdbcTemplate.update(
                """
                    INSERT INTO company_billing_customers (
                        company_id, stripe_customer_id, source_signup_intent_id, status
                    ) VALUES (?, ?, ?, 'ACTIVE')
                    """,
                companyId,
                stripeCustomerId,
                intentId
            );
        }
        jdbcTemplate.update(
            "UPDATE company_billing_subscriptions SET company_id = ? WHERE signup_intent_id = ? AND company_id IS NULL",
            companyId,
            intentId
        );
        jdbcTemplate.update(
            """
                UPDATE billing_invoice_snapshots i
                JOIN company_billing_subscriptions s
                  ON s.stripe_subscription_id = i.stripe_subscription_id
                SET i.company_id = ?
                WHERE s.signup_intent_id = ?
                  AND i.company_id IS NULL
                """,
            companyId,
            intentId
        );
    }

    private long requiredKey(GeneratedKeyHolder keys, String entity) {
        var key = keys.getKey();
        if (key == null) {
            throw new IllegalStateException("Could not obtain the generated identifier for " + entity + ".");
        }
        return key.longValue();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record TrialWindow(Instant startsAt, Instant endsAt) {
    }

    private record ProductModule(String moduleSlug, long productId, String productCode, String productType) {
    }

    private record CourtesyProduct(long id, String code, String productType) {
    }

    public record ProvisioningResult(
        long signupIntentId,
        String status,
        Long companyId,
        Long ownerUserId,
        boolean provisioned
    ) {
        static ProvisioningResult disabled(long intentId) {
            return new ProvisioningResult(intentId, "DISABLED", null, null, false);
        }
    }
}
