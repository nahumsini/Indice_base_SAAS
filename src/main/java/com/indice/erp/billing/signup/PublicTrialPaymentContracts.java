package com.indice.erp.billing.signup;

import java.time.Instant;
import java.util.List;

public final class PublicTrialPaymentContracts {
    private PublicTrialPaymentContracts() { }
    public static final String TERMS_VERSION = "AUTOPAY_REGIONAL_15D_V1";
    public record Quote(String productCode, String displayName, String billingInterval, String currency,
        long amountBeforeTaxCents, int includedSeats, String quoteHash, String termsVersion,
        String chargeTiming, Instant originalTrialEndsAt, List<String> capabilities) { }
    public record Workspace(boolean cohort, boolean converted, boolean paymentReady, String countryCode,
        Instant trialEndsAt, String setupStatus, String checkoutUrl, List<Quote> offers) { }
    public record Activation(String productCode, String billingInterval, String quoteHash,
        String termsVersion, boolean acceptedAutomaticPayment) { }
    public record Setup(String status, String checkoutUrl, Instant expiresAt, boolean replayed) { }
}
