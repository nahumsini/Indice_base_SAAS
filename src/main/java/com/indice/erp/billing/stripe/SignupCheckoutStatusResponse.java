package com.indice.erp.billing.stripe;

public record SignupCheckoutStatusResponse(
    String status,
    String message,
    Long companyId,
    boolean canRestart,
    boolean canLogin
) {
}
