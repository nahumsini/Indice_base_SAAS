package com.indice.erp.auth;

public record AuthSessionUser(
    Long userId,
    Long companyId,
    String userName,
    String role
) {
}
