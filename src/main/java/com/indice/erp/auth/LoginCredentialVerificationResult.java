package com.indice.erp.auth;

public record LoginCredentialVerificationResult(
    boolean success,
    String message,
    String failureReasonCode,
    String emailNormalized,
    String companyNameNormalized,
    Long userId,
    Long companyId,
    Long userCompanyId,
    String role,
    AuthenticatedLogin login
) {

    public static LoginCredentialVerificationResult success(
        AuthenticatedLogin login,
        String emailNormalized,
        String companyNameNormalized
    ) {
        return new LoginCredentialVerificationResult(
            true,
            "",
            null,
            emailNormalized,
            companyNameNormalized,
            login.userId(),
            login.companyId(),
            login.userCompanyId(),
            login.role(),
            login
        );
    }

    public static LoginCredentialVerificationResult failure(
        String message,
        String failureReasonCode,
        String emailNormalized,
        String companyNameNormalized,
        Long userId,
        Long companyId,
        Long userCompanyId,
        String role
    ) {
        return new LoginCredentialVerificationResult(
            false,
            message,
            failureReasonCode,
            emailNormalized,
            companyNameNormalized,
            userId,
            companyId,
            userCompanyId,
            role,
            null
        );
    }
}
