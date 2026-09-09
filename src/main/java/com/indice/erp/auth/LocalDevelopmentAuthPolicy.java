package com.indice.erp.auth;

import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import org.springframework.core.env.Environment;

/** Explicit development configuration, never inferred from browser-supplied headers. */
public class LocalDevelopmentAuthPolicy {

    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "::1", "[::1]");
    private static final Set<String> DEPLOYED_PROFILES = Set.of("prod", "production", "staging", "apptest");
    private final Environment environment;
    private final AuthSecurityProperties securityProperties;

    public LocalDevelopmentAuthPolicy(Environment environment, AuthSecurityProperties securityProperties) {
        this.environment = environment;
        this.securityProperties = securityProperties;
    }

    @PostConstruct
    public void validateConfiguration() {
        if (enabled() && !localRuntime()) {
            throw new IllegalStateException(
                "Local MFA bypass requires the local profile, a loopback server.address and a loopback app.web.public-url; deployed profiles are forbidden."
            );
        }
    }

    public boolean isMfaBypassed() {
        return enabled() && !securityProperties.isMfaRequired() && localRuntime();
    }

    private boolean enabled() {
        return environment.getProperty("app.auth.local-mfa-bypass-enabled", Boolean.class, false);
    }

    private boolean localRuntime() {
        var profiles = Arrays.stream(environment.getActiveProfiles())
            .map(profile -> profile.toLowerCase(Locale.ROOT)).toList();
        if (!profiles.contains("local") || profiles.stream().anyMatch(DEPLOYED_PROFILES::contains)) return false;
        if (!loopback(environment.getProperty("server.address", ""))) return false;
        try {
            var url = URI.create(environment.getProperty("app.web.public-url", ""));
            return ("http".equalsIgnoreCase(url.getScheme()) || "https".equalsIgnoreCase(url.getScheme()))
                && url.getUserInfo() == null && loopback(url.getHost());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean loopback(String host) {
        return host != null && LOOPBACK_HOSTS.contains(host.trim().toLowerCase(Locale.ROOT));
    }
}
