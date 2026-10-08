package com.indice.erp.billing.signup;

import java.time.Instant;
import java.util.List;

public final class PublicTrialEntryContracts {
    private PublicTrialEntryContracts() { }

    public record Config(boolean enabled, int trialDays, int includedSeats, boolean cardRequired,
                         boolean paidActivationReady, List<String> countries) { }

    public record Start(String fullName, String companyName, String email, String confirmEmail,
                        String phone, String countryCode, String challenge, String planInterest,
                        String utmSource, String utmMedium, String utmCampaign, boolean contactConsent) {
        @Override public String toString() { return "Start[redacted]"; }
    }

    public record Continuation(String entryReference, Instant expiresAt) {
        @Override public String toString() { return "Continuation[redacted]"; }
    }

    public record VerifyStart(String entryReference) {
        @Override public String toString() { return "VerifyStart[redacted]"; }
    }
    public record VerifyCode(String entryReference, String verificationReference, String otpCode) {
        @Override public String toString() { return "VerifyCode[redacted]"; }
    }

    public record Activate(String entryReference, String emailVerificationReference,
                           String password, boolean acceptedTrialTerms) {
        @Override public String toString() { return "Activate[redacted]"; }
    }

    public record Result(boolean provisioned, boolean requiresReview, boolean replayed,
                         Instant trialStartsAt, Instant trialEndsAt, String loginPath) { }
}
