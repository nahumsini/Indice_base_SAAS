package com.indice.erp.billing.signup;

import com.indice.erp.billing.audit.BillingAuditService;
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
        if (!"CHECKOUT_COMPLETED".equals(intent.checkoutStatus())) {
            return new ProvisioningResult(intentId, "NOT_ELIGIBLE", null, null, false);
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

        var moduleSlugs = provisionOwnerModules(intent.catalogVersionId(), companyId, membershipId);
        provisionOwnerTabs(membershipId, moduleSlugs);
        var trial = resolveTrialWindow(intent);
        provisionTrialProducts(intent.catalogVersionId(), intentId, companyId, trial);
        associateBillingRecords(intentId, companyId, intent.stripeCustomerId());
        entitlementProjection.enrollPremiumSignup(companyId, intent.catalogVersionId(), ownerUserId);
        commercialLifecycle.initializeTrial(companyId, trial.endsAt());
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
            Math.max(0, intent.requestedExtraSeats())
        );
        signupIntents.markProvisioned(intentId, companyId, ownerUserId, membershipId);

        audit.record(
            "PROVISIONING", "TENANT_PROVISIONED", "SUCCESS", null, null,
            intent.stripeCustomerId(), companyId, intentId,
            Map.of(
                "ownerRole", "superadmin",
                "scope", "corporate_office",
                "trialEndsAt", trial.endsAt().toString(),
                "moduleCount", moduleSlugs.size()
            )
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
                "INSERT INTO companies (name) VALUES (?)",
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

    private Set<String> provisionOwnerModules(long catalogVersionId, long companyId, long membershipId) {
        var moduleSlugs = new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT DISTINCT m.slug
                FROM billing_catalog_products p
                JOIN billing_product_capabilities pc ON pc.product_id = p.id
                JOIN modules m ON CAST(m.slug AS BINARY) = CAST((CASE pc.capability_code
                    WHEN 'sales' THEN 'crm'
                    ELSE pc.capability_code
                END) AS BINARY)
                WHERE p.catalog_version_id = ?
                  AND p.active = 1
                  AND p.product_type IN ('CORE', 'BASIC')
                  AND m.is_active = 1
                ORDER BY m.slug
                """,
            (rs, rowNum) -> rs.getString(1),
            catalogVersionId
        ));
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
                FROM billing_catalog_products p
                WHERE p.catalog_version_id = ?
                  AND p.product_type = 'BASIC'
                  AND p.active = 1
                """,
            companyId,
            intentId,
            Timestamp.from(trial.startsAt()),
            Timestamp.from(trial.endsAt()),
            catalogVersionId
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
