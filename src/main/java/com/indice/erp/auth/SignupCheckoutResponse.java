package com.indice.erp.auth;

public record SignupCheckoutResponse(
    String checkoutUrl,
    String checkoutSessionId,
    String csrfToken
) {
}
