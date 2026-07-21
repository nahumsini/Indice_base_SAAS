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

        // Phase 1 deliberately mirrors current access. Company entitlements become
        // authoritative only after shadow telemetry has been reviewed.
        var shadowAllowed = legacyAllowed;
        return new CapabilityShadowDecision(
            capability,
            operation,
            legacyAllowed,
            shadowAllowed,
            legacyAllowed == shadowAllowed,
            "legacy-module-assignment"
        );
    }
}
