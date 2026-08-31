package com.indice.erp.pos.square;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.stereotype.Service;

@Service
public class SquareTerminalSecretProvider {

    private final SquareTerminalProperties properties;

    public SquareTerminalSecretProvider(SquareTerminalProperties properties) {
        this.properties = properties;
    }

    public void requireEnabled() {
        if (!properties.isEnabled()) {
            throw SquareTerminalUnavailableException.disabled();
        }
        if (!"sandbox".equalsIgnoreCase(properties.getEnvironment())
                && !"production".equalsIgnoreCase(properties.getEnvironment())) {
            throw SquareTerminalUnavailableException.config("Square environment must be sandbox or production.");
        }
    }

    public String applicationId() {
        requireEnabled();
        return require("Square application ID", properties.getApplicationId());
    }

    public String applicationSecret() {
        requireEnabled();
        return require("Square application secret",
            resolve(properties.getApplicationSecretFile(), properties.getApplicationSecret()));
    }

    public String webhookSignatureKey() {
        requireEnabled();
        return require("Square webhook signature key",
            resolve(properties.getWebhookSignatureKeyFile(), properties.getWebhookSignatureKey()));
    }

    private String require(String label, String value) {
        if (value == null || value.isBlank()) {
            throw SquareTerminalUnavailableException.config(label + " is required.");
        }
        return value.trim();
    }

    private String resolve(String fileName, String directValue) {
        if (fileName == null || fileName.isBlank()) {
            return directValue == null ? "" : directValue.trim();
        }
        try {
            return Files.readString(Path.of(fileName)).trim();
        } catch (IOException exception) {
            throw SquareTerminalUnavailableException.config("Square secret file cannot be read.");
        }
    }
}
