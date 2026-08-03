package com.indice.erp.observability;

import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

final class LogSanitizer {

    private static final int MAX_MESSAGE_LENGTH = 2_000;
    private static final int MAX_PATH_LENGTH = 300;
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\r\\n\\t]+");
    private static final Pattern URL_USER_INFO = Pattern.compile("(?i)([a-z][a-z0-9+.-]*://)([^/@\\s]+)@");
    private static final Pattern SENSITIVE_ASSIGNMENT = Pattern.compile(
        "(?i)(password|passwd|pwd|pin|secret|token|csrf|authorization|cookie|set-cookie|session|api[-_]?key|access[-_]?key|secret[-_]?key|credential(?:[-_][a-z0-9]+)*|(?:upload|download|presigned|signed)[-_]?url|biometric(?:[-_][a-z0-9]+)*|face[-_]?(?:image|template)|latitude|longitude)(\\s*[:=]\\s*)([^\\s,;&]+)"
    );
    private static final Pattern KIOSK_ACCESS_PATH_SEGMENT = Pattern.compile(
        "(?i)(/(?:public-kiosk|public-payable-kiosks|multi-kiosk|multi-kiosks/public|kiosk|kiosks/public|"
            + "public-catalog|pos-self-service|pos-display|customer-displays/public|"
            + "(?:pos/public/)?supplier-portal)/)([^/?#\\s]+)"
    );
    private static final Pattern VALID_REQUEST_ID = Pattern.compile("[A-Za-z0-9._:-]{1,128}");
    private static final Pattern SAFE_CLIENT_IP = Pattern.compile("[^0-9a-fA-F:., ]");

    private LogSanitizer() {
    }

    static String sanitizeMessage(String value) {
        if (value == null || value.isBlank()) {
            return "n/a";
        }

        var sanitized = CONTROL_CHARS.matcher(value).replaceAll(" ");
        sanitized = URL_USER_INFO.matcher(sanitized).replaceAll("$1[redacted]@");
        sanitized = SENSITIVE_ASSIGNMENT.matcher(sanitized).replaceAll("$1$2[redacted]");
        return truncate(sanitized.trim(), MAX_MESSAGE_LENGTH);
    }

    static String sanitizeUrl(String value) {
        var sanitized = sanitizeMessage(value);
        var queryStart = sanitized.indexOf('?');
        if (queryStart >= 0) {
            sanitized = sanitized.substring(0, queryStart) + "?[query-redacted]";
        }
        return sanitized;
    }

    static String sanitizePath(String value) {
        if (value == null || value.isBlank()) {
            return "/";
        }

        var sanitized = CONTROL_CHARS.matcher(value).replaceAll("");
        var queryStart = sanitized.indexOf('?');
        if (queryStart >= 0) {
            sanitized = sanitized.substring(0, queryStart);
        }
        sanitized = KIOSK_ACCESS_PATH_SEGMENT.matcher(sanitized).replaceAll("$1[redacted]");
        return truncate(sanitized, MAX_PATH_LENGTH);
    }

    static String sanitizeClientIp(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }

        var firstValue = value.split(",", 2)[0].trim();
        var sanitized = SAFE_CLIENT_IP.matcher(firstValue).replaceAll("");
        return sanitized.isBlank() ? "unknown" : truncate(sanitized, 64);
    }

    static String normalizeRequestId(String value) {
        if (value != null && VALID_REQUEST_ID.matcher(value.trim()).matches()) {
            return value.trim();
        }
        return UUID.randomUUID().toString().toLowerCase(Locale.ROOT);
    }

    private static String truncate(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }
}
