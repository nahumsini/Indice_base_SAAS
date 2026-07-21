package com.indice.erp.entitlement;

import com.indice.erp.auth.AuthSessionResponse;
import com.indice.erp.billing.catalog.CommercialCapabilityNormalizer;
import com.indice.erp.tenant.TenantContext;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class CapabilityShadowDecisionService {

    private static final Set<String> CORE_CAPABILITIES = Set.of(
        "dashboard",
        "config_center",
        "kpis",
        "security",
        "billing"
    );

    private final CompanyEntitlementService companyEntitlements;

    public CapabilityShadowDecisionService(CompanyEntitlementService companyEntitlements) {
        this.companyEntitlements = companyEntitlements;
    }

    public CapabilityShadowDecision evaluate(
        TenantContext tenant,
        AuthSessionResponse session,
        String rawCapability,
        CapabilityOperation operation
    ) {
        var capability = CommercialCapabilityNormalizer.normalize(rawCapability);
        var role = tenant.role() == null ? "" : tenant.role().trim().toLowerCase(Locale.ROOT);
        var privileged = role.equals("root") || role.equals("superadmin");
        var assigned = session.user().module_slugs().stream()
            .map(CommercialCapabilityNormalizer::normalize)
            .anyMatch(capability::equals);
        var legacyAllowed = privileged || CORE_CAPABILITIES.contains(capability) || assigned;
        var entitlement = companyEntitlements.resolve(tenant.company_id(), capability);
        if (entitlement.policy_mode() == EntitlementPolicyMode.LEGACY
            || entitlement.policy_mode() == EntitlementPolicyMode.DISABLED) {
            return new CapabilityShadowDecision(
                capability,
                operation,
                legacyAllowed,
                legacyAllowed,
                legacyAllowed,
                true,
                entitlement.policy_mode() == EntitlementPolicyMode.DISABLED
                    ? "legacy-kill-switch"
                    : "legacy-not-enrolled",
                entitlement.policy_mode()
            );
        }

        // A commercial product enables the company; it never grants a module to an
        // unassigned user. Root/superadmin keep an explicit support bypass.
        var companyAllowed = privileged || entitlement.allowed();
        var shadowAllowed = companyAllowed && legacyAllowed;
        return new CapabilityShadowDecision(
            capability,
            operation,
            legacyAllowed,
            companyAllowed,
            shadowAllowed,
            legacyAllowed == shadowAllowed,
            privileged ? "platform-support-bypass" : entitlement.sourceSummary(),
            entitlement.policy_mode()
        );
    }
}
