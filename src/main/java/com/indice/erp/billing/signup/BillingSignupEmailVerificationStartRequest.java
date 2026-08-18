package com.indice.erp.billing.signup;

public record BillingSignupEmailVerificationStartRequest(
    String fullName,
    String email,
    String confirmEmail,
    String companyName
) {
}
