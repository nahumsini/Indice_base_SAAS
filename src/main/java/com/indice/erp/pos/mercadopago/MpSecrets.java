package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MpSecrets {
    private final MpProperties properties;

    public void requireEnabled() {
        if (!properties.isEnabled()) throw PosApiException.serviceUnavailable("Mercado Pago is disabled.");
        properties.environment();
    }
    public void requireConfigured() {
        applicationId();
        applicationSecret();
        webhookSecret();
        tokenProtectionSecret();
    }
    public String applicationId() { requireEnabled(); return required(properties.getApplicationId()); }
    public String applicationSecret() {
        requireEnabled(); return resolve(properties.getApplicationSecretFile(), properties.getApplicationSecret());
    }
    public String webhookSecret() {
        requireEnabled(); return resolve(properties.getWebhookSecretFile(), properties.getWebhookSecret());
    }
    public String tokenProtectionSecret() {
        requireEnabled();
        var value = resolve(properties.getTokenProtectionSecretFile(), properties.getTokenProtectionSecret());
        if (value.length() < 32) throw PosApiException.serviceUnavailable("Mercado Pago protection key is invalid.");
        return value;
    }
    private String resolve(String file, String direct) {
        if (file == null || file.isBlank()) return required(direct);
        try { return required(Files.readString(Path.of(file.trim()))); }
        catch (Exception exception) {
            throw PosApiException.serviceUnavailable("Mercado Pago secret file is unavailable.");
        }
    }
    private String required(String value) {
        if (value == null || value.isBlank()) throw PosApiException.serviceUnavailable("Mercado Pago secret is missing.");
        return value.trim();
    }
}
