package com.indice.erp.auth;

public record AuthenticatedLogin(
    long userId,
    long companyId,
    long userCompanyId,
    String fullName,
    String email,
    String companyName,
    String role
) {
}
