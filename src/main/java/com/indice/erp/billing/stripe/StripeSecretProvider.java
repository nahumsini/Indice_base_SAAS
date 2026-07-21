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
        if (!"test".equalsIgnoreCase(properties.getMode())) {
            throw new StripePhaseTwoUnavailableException("Phase two only accepts Stripe test mode.");
        }
    }

    public String secretKey() {
        requireEnabled();
        var value = resolve(properties.getSecretKeyFile(), properties.getSecretKey());
        if (!value.startsWith("sk_test_")) {
            throw new StripePhaseTwoUnavailableException("A Stripe test secret key is required.");
        }
        return value;
    }

    public String webhookSecret() {
        requireEnabled();
        var value = resolve(properties.getWebhookSecretFile(), properties.getWebhookSecret());
        if (!value.startsWith("whsec_")) {
            throw new StripePhaseTwoUnavailableException("A Stripe webhook signing secret is required.");
        }
        return value;
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
}
