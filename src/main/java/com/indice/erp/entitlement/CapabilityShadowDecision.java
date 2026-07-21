package com.indice.erp.entitlement;

public record CapabilityShadowDecision(
    String capability,
    CapabilityOperation operation,
    boolean legacy_allowed,
    boolean company_allowed,
    boolean shadow_allowed,
    boolean matched,
    String source,
    EntitlementPolicyMode policy_mode
) {
}
