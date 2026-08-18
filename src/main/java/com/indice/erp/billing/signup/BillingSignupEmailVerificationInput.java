package com.indice.erp.billing.signup;

import java.util.Locale;
import java.util.regex.Pattern;

final class BillingSignupEmailVerificationInput {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern REFERENCE = Pattern.compile("[a-f0-9]{64}");

    private BillingSignupEmailVerificationInput() {
    }

    static NormalizedStart validateStart(BillingSignupEmailVerificationStartRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Email verification request is required.");
        }
        var fullName = clean(request.fullName(), 100);
        if (fullName.length() < 2) {
            throw new IllegalArgumentException("Full name must contain between 2 and 100 characters.");
        }
        var companyName = clean(request.companyName(), 120);
        if (companyName.length() < 2) {
            throw new IllegalArgumentException("Company name must contain between 2 and 120 characters.");
        }
        var email = normalizeEmail(request.email());
        var confirmEmail = normalizeEmail(request.confirmEmail());
        if (email.length() > 190 || !EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("A valid email is required.");
        }
        if (!email.equals(confirmEmail)) {
            throw new IllegalArgumentException("Email and confirm email must match.");
        }
        return new NormalizedStart(fullName, email, companyName);
    }

    static boolean validReference(String reference) {
        return reference != null && REFERENCE.matcher(reference).matches();
    }

    static String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    static String status(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    static String maskEmail(String email) {
        var cleaned = normalizeEmail(email);
        var at = cleaned.indexOf('@');
        if (at <= 0) {
            return "email";
        }
        return cleaned.charAt(0) + "***" + cleaned.substring(at);
    }

    private static String clean(String value, int maxLength) {
        var cleaned = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ").trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }

    record NormalizedStart(String fullName, String email, String companyName) {
    }
}
