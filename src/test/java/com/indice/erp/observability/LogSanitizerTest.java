package com.indice.erp.observability;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LogSanitizerTest {

    @Test
    void redactsSensitiveAssignments() {
        var sanitized = LogSanitizer.sanitizeMessage(
            "password=plain token: abc123 csrf=def456 credential_payload=12345 pin=54321 "
                + "upload_url=https://storage/signed?X-Amz-Signature=secret face_image=base64 latitude=20.1 normal=value"
        );

        assertThat(sanitized).contains("password=[redacted]");
        assertThat(sanitized).contains("token: [redacted]");
        assertThat(sanitized).contains("csrf=[redacted]");
        assertThat(sanitized).doesNotContain(
            "plain", "abc123", "def456", "12345", "54321", "storage", "base64", "20.1");
    }

    @Test
    void removesUrlCredentialsAndQueryValues() {
        var sanitized = LogSanitizer.sanitizeUrl(
            "jdbc:mysql://user:secret@127.0.0.1:3307/indice_db?password=test&useSSL=false"
        );

        assertThat(sanitized).contains("[redacted]");
        assertThat(sanitized).contains("?[query-redacted]");
        assertThat(sanitized).doesNotContain("secret", "password=test", "useSSL=false");
    }

    @Test
    void rejectsUnsafeRequestIds() {
        var sanitized = LogSanitizer.normalizeRequestId("bad\nrequest");

        assertThat(sanitized).matches("[a-f0-9-]{36}");
    }

    @Test
    void redactsKioskAccessTokensEmbeddedInPaths() {
        var sanitized = LogSanitizer.sanitizePath(
            "/api/v1/process-tasks/public-kiosk/very-secret-token/tasks/11"
        );

        assertThat(sanitized)
            .isEqualTo("/api/v1/process-tasks/public-kiosk/[redacted]/tasks/11")
            .doesNotContain("very-secret-token");

        assertThat(LogSanitizer.sanitizePath("/api/v2/kiosks/public/another-secret/bootstrap"))
            .isEqualTo("/api/v2/kiosks/public/[redacted]/bootstrap")
            .doesNotContain("another-secret");

        assertThat(LogSanitizer.sanitizePath(
            "/API/V1/POS/PUBLIC/SUPPLIER-PORTAL/PORTAL-VERY-SECRET/context?pin=1234"))
            .isEqualTo("/API/V1/POS/PUBLIC/SUPPLIER-PORTAL/[redacted]/context")
            .doesNotContain("PORTAL-VERY-SECRET", "1234");

        assertThat(LogSanitizer.sanitizePath("/supplier-portal/PORTAL-SPA-SECRET"))
            .isEqualTo("/supplier-portal/[redacted]")
            .doesNotContain("PORTAL-SPA-SECRET");

        assertThat(LogSanitizer.sanitizePath("/public-catalog/SALES-SECRET"))
            .isEqualTo("/public-catalog/[redacted]")
            .doesNotContain("SALES-SECRET");

        assertThat(LogSanitizer.sanitizePath("/pos-self-service/PRETICKET-SECRET"))
            .isEqualTo("/pos-self-service/[redacted]")
            .doesNotContain("PRETICKET-SECRET");

        assertThat(LogSanitizer.sanitizePath(
            "/api/v1/pos/customer-displays/public/DISPLAY-SECRET/state"))
            .isEqualTo("/api/v1/pos/customer-displays/public/[redacted]/state")
            .doesNotContain("DISPLAY-SECRET");
    }
    @Test
    void redactsInvitationSecretsWithoutHidingAdministrativeIdentifiers() {
        assertThat(LogSanitizer.sanitizePath("/api/v1/invitations/synthetic-private-token/accept"))
            .isEqualTo("/api/v1/invitations/[redacted]/accept");
        assertThat(LogSanitizer.sanitizePath("/invite/synthetic-private-token?example=value"))
            .isEqualTo("/invite/[redacted]");
        assertThat(LogSanitizer.sanitizePath("/api/v1/config-center/users/invitations/42/resend"))
            .isEqualTo("/api/v1/config-center/users/invitations/42/resend");
    }
    @Test
    void redactsRecoveryLinksAndPreservesTheRequestAction() {
        assertThat(LogSanitizer.sanitizePath("/api/v1/auth/password-reset/synthetic-secret/complete"))
            .isEqualTo("/api/v1/auth/password-reset/[redacted]/complete");
        assertThat(LogSanitizer.sanitizePath("/reset-password/synthetic-secret"))
            .isEqualTo("/reset-password/[redacted]");
        assertThat(LogSanitizer.sanitizePath("/api/v1/auth/password-reset/request"))
            .isEqualTo("/api/v1/auth/password-reset/request");
    }
}
