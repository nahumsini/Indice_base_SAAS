package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PublicTrialEntryContractsTest {
    @Test void diagnosticStringsDoNotExposeIdentityCredentialsOrCapabilities() {
        var reference = "test-only-capability";
        var verification = "test-only-verification";
        var values = java.util.List.of(
            new PublicTrialEntryContracts.Start("Test Person", "Test Company", "synthetic@example.com", "synthetic@example.com",
                "5550000000", "CA", "private business challenge", "CONTROLA", "test", "test", "test", true),
            new PublicTrialEntryContracts.Continuation(reference, Instant.EPOCH),
            new PublicTrialEntryContracts.VerifyStart(reference),
            new PublicTrialEntryContracts.VerifyCode(reference, verification, "123456"),
            new PublicTrialEntryContracts.Activate(reference, verification, "test-only-password", true),
            new BillingSignupEmailVerificationResponse(true, false, false, verification, "s***@example.com",
                60, 30, null, "test-only-response-message")
        );
        for (var value : values) {
            assertThat(value.toString()).contains("redacted").doesNotContain(reference, verification,
                "123456", "test-only-password", "synthetic@example.com", "Test Person", "private business challenge", "5550000000");
        }
    }
}
