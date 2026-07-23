package com.indice.erp.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class SignupAccountProvisioner {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final SignupBillingSubscriptionWriter billingSubscriptionWriter;
    private final CompanyModuleEntitlementService moduleEntitlementService;

    SignupAccountProvisioner(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        SignupBillingSubscriptionWriter billingSubscriptionWriter,
        CompanyModuleEntitlementService moduleEntitlementService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.billingSubscriptionWriter = billingSubscriptionWriter;
        this.moduleEntitlementService = moduleEntitlementService;
    }

    void provision(long companyId, long userId, long userCompanyId, SignupProfile profile, SignupBillingInfo billing) {
        seedOwnerWorkProfile(companyId, userId, userCompanyId);
        moduleEntitlementService.grantLaunchOffer(companyId);
        moduleEntitlementService.storePaidPlan(companyId, billing.plan().selectedModuleSlugs());
        moduleEntitlementService.grantUserLaunchRoles(userCompanyId);
        storeAccountSettings(companyId, profile, billing);
        billingSubscriptionWriter.store(companyId, billing);
    }

    private void seedOwnerWorkProfile(long companyId, long userId, long userCompanyId) {
        jdbcTemplate.update(
            """
                INSERT INTO user_work_profiles
                    (company_id, user_company_id, user_id, position, department, unit_id, business_id, status, created_by)
                VALUES (?, ?, ?, 'Owner', 'Administration', NULL, NULL, 'active', ?)
                """,
            companyId,
            userCompanyId,
            userId,
            userId
        );
    }

    private void storeAccountSettings(long companyId, SignupProfile profile, SignupBillingInfo billing) {
        var root = objectMapper.createObjectNode();
        var configCenter = root.putObject("config_center");
        configCenter.put("estructura", "simple");
        configCenter.put("tamano_empresa", profile.companySize());
        var template = configCenter.putObject("empresa_template");
        template.put("display_name", profile.companyName());
        template.put("industria", profile.industry());
        template.put("country", profile.country());
        var account = root.putObject("account_profile");
        account.put("company_name", profile.companyName());
        account.put("owner_name", profile.fullName());
        account.put("owner_email", profile.email());
        account.put("created_from", "self_signup");
        var subscription = root.putObject("subscription");
        subscription.put("status", billing.stripeSubscriptionStatus());
        subscription.put("trial_days", SignupTrialTerms.TRIAL_DAYS);
        subscription.put("trial_started_at", instantText(billing.trialStart()));
        subscription.put("trial_ends_at", instantText(billing.trialEnd()));
        subscription.put("launch_offer_basic_modules", true);
        subscription.put("plan_id", billing.plan().planId());
        subscription.put("module_count", billing.plan().moduleCount());
        var selectedModules = subscription.putArray("selected_module_slugs");
        billing.plan().selectedModuleSlugs().forEach(selectedModules::add);
        subscription.put("included_collaborators", billing.plan().includedCollaborators());
        subscription.put("extra_collaborators", billing.plan().extraCollaborators());
        subscription.put("monthly_amount_cents", billing.plan().monthlyAmountCents());
        subscription.put("currency", billing.plan().currency());
        subscription.put("source", billing.source());
        subscription.put("prices_exclude_taxes", true);
        try {
            jdbcTemplate.update("INSERT INTO company_settings (company_id, settings_json) VALUES (?, ?)", companyId, objectMapper.writeValueAsString(root));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to create account settings.", ex);
        }
    }

    private String instantText(Instant instant) {
        return instant == null ? "" : instant.toString();
    }

}
