package com.indice.erp.billing.signup;

import java.util.List;

public record BillingSignupRequest(
    String fullName,
    String email,
    String confirmEmail,
    String password,
    String companyName,
    String countryCode,
    String phone,
    String industry,
    String companySize,
    String billingInterval,
    Integer extraSeats,
    List<String> selectedProductCodes,
    String courtesyCode,
    String emailVerificationReference,
    String promotionCode
) {
    public BillingSignupRequest(
        String fullName,
        String email,
        String confirmEmail,
        String password,
        String companyName,
        String countryCode,
        String phone,
        String industry,
        String companySize,
        String billingInterval,
        Integer extraSeats,
        List<String> selectedProductCodes,
        String courtesyCode,
        String emailVerificationReference
    ) {
        this(
            fullName, email, confirmEmail, password, companyName, countryCode, phone,
            industry, companySize, billingInterval, extraSeats, selectedProductCodes,
            courtesyCode, emailVerificationReference, null
        );
    }

    public BillingSignupRequest withPhone(String normalizedPhone) {
        return new BillingSignupRequest(
            fullName, email, confirmEmail, password, companyName, countryCode, normalizedPhone,
            industry, companySize, billingInterval, extraSeats, selectedProductCodes,
            courtesyCode, emailVerificationReference, promotionCode
        );
    }
}
