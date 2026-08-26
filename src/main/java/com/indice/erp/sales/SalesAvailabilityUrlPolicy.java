package com.indice.erp.sales;

import java.net.URI;
import java.util.Locale;

/** Shared validation for private calendar feed addresses. */
public final class SalesAvailabilityUrlPolicy {

    public static final int MAX_URL_LENGTH = 2048;

    private SalesAvailabilityUrlPolicy() {
    }

    public static URI requireSafeConfiguredUrl(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Availability calendar URL is required for a reservable product.");
        }
        var normalized = value.trim();
        if (normalized.length() > MAX_URL_LENGTH) {
            throw new IllegalArgumentException("Availability calendar URL is too long.");
        }
        final URI uri;
        try {
            uri = URI.create(normalized);
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("Availability calendar URL is invalid.");
        }
        var host = uri.getHost();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || host.isBlank()
                || uri.getRawUserInfo() != null || uri.getRawFragment() != null
                || uri.getPort() != -1 && uri.getPort() != 443) {
            throw new IllegalArgumentException("Availability calendar URL must be a valid HTTPS address.");
        }
        var lowerHost = host.toLowerCase(Locale.ROOT);
        if (lowerHost.equals("localhost") || lowerHost.endsWith(".localhost")
                || lowerHost.endsWith(".local") || lowerHost.endsWith(".internal")
                || lowerHost.endsWith(".home") || lowerHost.endsWith(".lan")) {
            throw new IllegalArgumentException("Availability calendar host is not allowed.");
        }
        return uri;
    }
}
