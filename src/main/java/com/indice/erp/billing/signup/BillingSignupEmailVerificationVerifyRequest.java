package com.indice.erp.billing.signup;

public record BillingSignupEmailVerificationVerifyRequest(
    String verificationReference,
    String otpCode
) {
}
