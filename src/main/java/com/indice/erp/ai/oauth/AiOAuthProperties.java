package com.indice.erp.ai.oauth;

import java.net.URI;
import java.time.Duration;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.ai.oauth")
public class AiOAuthProperties {

    private String issuerUrl = "http://localhost:8080";
    private String resourceUrl = "http://localhost:3010/mcp";
    private Duration authorizationCodeTtl = Duration.ofMinutes(5);
    private int accessTokenDays = 30;
    private int refreshTokenDays = 90;
    private Set<String> allowedRedirectHosts = Set.of("chatgpt.com", "chat.openai.com");

    public String getIssuerUrl() {
        return withoutTrailingSlash(issuerUrl);
    }

    public void setIssuerUrl(String issuerUrl) {
        this.issuerUrl = requireHttpUrl(issuerUrl, "issuer-url");
    }

    public String getResourceUrl() {
        return withoutTrailingSlash(resourceUrl);
    }

    public void setResourceUrl(String resourceUrl) {
        this.resourceUrl = requireHttpUrl(resourceUrl, "resource-url");
    }

    public Duration getAuthorizationCodeTtl() {
        return authorizationCodeTtl;
    }

    public void setAuthorizationCodeTtl(Duration authorizationCodeTtl) {
        if (authorizationCodeTtl == null || authorizationCodeTtl.isNegative()
            || authorizationCodeTtl.isZero() || authorizationCodeTtl.compareTo(Duration.ofMinutes(10)) > 0) {
            throw new IllegalArgumentException("AI OAuth authorization-code-ttl must be between 1ns and 10m.");
        }
        this.authorizationCodeTtl = authorizationCodeTtl;
    }

    public int getAccessTokenDays() {
        return accessTokenDays;
    }

    public void setAccessTokenDays(int accessTokenDays) {
        if (accessTokenDays < 1 || accessTokenDays > 90) {
            throw new IllegalArgumentException("AI OAuth access-token-days must be between 1 and 90.");
        }
        this.accessTokenDays = accessTokenDays;
    }

    public int getRefreshTokenDays() {
        return refreshTokenDays;
    }

    public void setRefreshTokenDays(int refreshTokenDays) {
        if (refreshTokenDays < 1 || refreshTokenDays > 365) {
            throw new IllegalArgumentException("AI OAuth refresh-token-days must be between 1 and 365.");
        }
        this.refreshTokenDays = refreshTokenDays;
    }

    public Set<String> getAllowedRedirectHosts() {
        return allowedRedirectHosts;
    }

    public void setAllowedRedirectHosts(Set<String> allowedRedirectHosts) {
        if (allowedRedirectHosts == null || allowedRedirectHosts.isEmpty()) {
            throw new IllegalArgumentException("AI OAuth requires at least one allowed redirect host.");
        }
        this.allowedRedirectHosts = allowedRedirectHosts.stream()
            .map(value -> value == null ? "" : value.trim().toLowerCase())
            .filter(value -> !value.isBlank())
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    public String authorizationEndpoint() {
        return getIssuerUrl() + "/oauth/authorize";
    }

    public String tokenEndpoint() {
        return getIssuerUrl() + "/api/v1/ai/oauth/token";
    }

    public String registrationEndpoint() {
        return getIssuerUrl() + "/api/v1/ai/oauth/register";
    }

    public String protectedResourceMetadataUrl() {
        return getIssuerUrl() + "/.well-known/oauth-protected-resource";
    }

    public boolean isAllowedRedirectUri(String value) {
        try {
            var uri = URI.create(value);
            if (uri.getFragment() != null || uri.getUserInfo() != null || uri.getHost() == null) return false;
            var host = uri.getHost().toLowerCase();
            var local = Set.of("localhost", "127.0.0.1", "::1").contains(host);
            if (!("https".equalsIgnoreCase(uri.getScheme()) || ("http".equalsIgnoreCase(uri.getScheme()) && local))) {
                return false;
            }
            return allowedRedirectHosts.stream().anyMatch(allowed -> host.equals(allowed) || host.endsWith("." + allowed));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String requireHttpUrl(String value, String property) {
        var normalized = withoutTrailingSlash(value);
        try {
            var uri = URI.create(normalized);
            if (uri.getHost() == null || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                throw new IllegalArgumentException();
            }
            return normalized;
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("AI OAuth " + property + " must be an absolute HTTP(S) URL.");
        }
    }

    private String withoutTrailingSlash(String value) {
        var normalized = value == null ? "" : value.trim();
        while (normalized.endsWith("/")) normalized = normalized.substring(0, normalized.length() - 1);
        return normalized;
    }
}
