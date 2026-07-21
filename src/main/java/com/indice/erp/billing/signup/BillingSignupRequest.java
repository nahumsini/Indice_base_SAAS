package com.indice.erp.billing.signup;

import java.util.List;

public record BillingSignupRequest(
    String fullName,
    String email,
    String password,
    String companyName,
    String countryCode,
    String phone,
    String industry,
    String companySize,
    String billingInterval,
    Integer extraSeats,
    List<String> selectedProductCodes
) {
}
