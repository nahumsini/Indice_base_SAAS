package com.indice.erp.observability;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LogSanitizerTest {

    @Test
    void redactsSensitiveAssignments() {
        var sanitized = LogSanitizer.sanitizeMessage("password=plain token: abc123 csrf=def456 normal=value");

        assertThat(sanitized).contains("password=[redacted]");
        assertThat(sanitized).contains("token: [redacted]");
        assertThat(sanitized).contains("csrf=[redacted]");
        assertThat(sanitized).doesNotContain("plain", "abc123", "def456");
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
}
