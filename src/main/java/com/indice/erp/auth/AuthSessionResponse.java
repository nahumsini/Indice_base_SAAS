package com.indice.erp.auth;

public record AuthSessionResponse(
    UserInfo user,
    CompanyInfo company,
    java.util.List<CompanyInfo> companies
) {

    public record UserInfo(
        Long id,
        String name,
        String role,
        java.util.List<String> module_slugs,
        java.util.List<String> tab_permission_keys,
        boolean tab_permissions_configured
    ) {
    }

    public record CompanyInfo(
        Long id,
        String name,
        Long user_company_id,
        String role,
        ScopeInfo scope,
        boolean active,
        SubscriptionInfo subscription
    ) {
    }

    public record ScopeInfo(
        String type,
        Long unit_id,
        Long business_id
    ) {
    }

    public record SubscriptionInfo(
        String status,
        String plan_id,
        String trial_end_at,
        boolean access_allowed,
        String lock_reason
    ) {
    }
}
