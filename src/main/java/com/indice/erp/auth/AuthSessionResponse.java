package com.indice.erp.auth;

public record AuthSessionResponse(
    UserInfo user,
    CompanyInfo company
) {

    public record UserInfo(
        Long id,
        String name,
        String role
    ) {
    }

    public record CompanyInfo(
        Long id
    ) {
    }
}
