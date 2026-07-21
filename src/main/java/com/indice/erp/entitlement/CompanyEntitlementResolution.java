package com.indice.erp.entitlement;

import java.util.List;

public record CompanyEntitlementResolution(
    long company_id,
    String capability,
    boolean allowed,
    EntitlementPolicyMode policy_mode,
    List<String> sources
) {
    public String sourceSummary() {
        return sources == null || sources.isEmpty() ? "none" : String.join(",", sources);
    }
}
