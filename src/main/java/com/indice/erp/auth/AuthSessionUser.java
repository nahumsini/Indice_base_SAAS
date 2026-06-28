package com.indice.erp.auth;

public record AuthSessionUser(
    Long userId,
    Long companyId,
    Long userCompanyId,
    String userName,
    String role
) {
    public AuthSessionUser(Long userId, Long companyId, String userName, String role) {
        this(userId, companyId, null, userName, role);
    }
}
