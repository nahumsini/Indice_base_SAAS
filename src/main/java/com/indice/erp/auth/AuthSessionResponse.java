package com.indice.erp.auth;

public record AuthSessionResponse(
    UserInfo user,
    CompanyInfo company
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
        Long id
    ) {
    }
}
