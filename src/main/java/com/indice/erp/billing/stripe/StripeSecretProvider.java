package com.indice.erp.billing.stripe;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.stereotype.Service;

@Service
public class StripeSecretProvider {

    private final StripePhaseTwoProperties properties;

    public StripeSecretProvider(StripePhaseTwoProperties properties) {
        this.properties = properties;
    }

    public void requireEnabled() {
        if (!properties.isEnabled()) {
            throw new StripePhaseTwoUnavailableException("Stripe phase two is disabled.");
        }
        if (!isTestMode() && !isLiveMode()) {
            throw new StripePhaseTwoUnavailableException("Stripe mode must be either test or live.");
        }
    }

    public String secretKey() {
        requireEnabled();
        var value = resolve(properties.getSecretKeyFile(), properties.getSecretKey());
        if (!matchesConfiguredMode(value)) {
            throw new StripePhaseTwoUnavailableException(
                "The Stripe API key does not match the configured Stripe mode."
            );
        }
        return value;
    }

    public boolean isLiveMode() {
        return "live".equalsIgnoreCase(properties.getMode());
    }

    public boolean isTestMode() {
        return "test".equalsIgnoreCase(properties.getMode());
    }

    public String webhookSecret() {
        requireEnabled();
        var value = resolve(properties.getWebhookSecretFile(), properties.getWebhookSecret());
        if (!value.startsWith("whsec_")) {
            throw new StripePhaseTwoUnavailableException("A Stripe webhook signing secret is required.");
        }
        return value;
    }

    public boolean isApiConfigured() {
        try {
            secretKey();
            return true;
        } catch (StripePhaseTwoUnavailableException unavailable) {
            return false;
        }
    }

    private String resolve(String fileName, String directValue) {
        if (fileName != null && !fileName.isBlank()) {
            try {
                return Files.readString(Path.of(fileName)).trim();
            } catch (IOException exception) {
                throw new StripePhaseTwoUnavailableException("The configured Stripe secret file cannot be read.", exception);
            }
        }
        return directValue == null ? "" : directValue.trim();
    }

    private boolean matchesConfiguredMode(String value) {
        if (isLiveMode()) {
            return value.startsWith("sk_live_") || value.startsWith("rk_live_");
        }
        return value.startsWith("sk_test_") || value.startsWith("rk_test_");
    }
}
