package com.indice.erp.billing.signup;

import java.time.Instant;

public record BillingSignupEmailVerificationResponse(
    boolean started,
    boolean verified,
    boolean blocked,
    String verificationReference,
    String maskedEmail,
    int expiresInSeconds,
    int resendAvailableInSeconds,
    Instant verifiedExpiresAt,
    String message
) {
}
