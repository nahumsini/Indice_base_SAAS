package com.indice.erp.pos.square;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class SquareWebhookSignatureVerifier {

    private final SquareTerminalProperties properties;
    private final SquareTerminalSecretProvider secrets;

    public SquareWebhookSignatureVerifier(
        SquareTerminalProperties properties,
        SquareTerminalSecretProvider secrets) {
        this.properties = properties;
        this.secrets = secrets;
    }

    public void verify(String rawPayload, String signature) {
        if (rawPayload == null || rawPayload.isBlank() || signature == null || signature.isBlank()) {
            throw new IllegalArgumentException("Square webhook payload and signature are required.");
        }
        var notificationUrl = properties.getWebhookNotificationUrl();
        if (notificationUrl.isBlank()) {
            throw SquareTerminalUnavailableException.config("Square webhook notification URL is required.");
        }
        var expected = sign(notificationUrl + rawPayload, secrets.webhookSignatureKey());
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                signature.trim().getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Square webhook signature is invalid.");
        }
    }

    private String sign(String payload, String secret) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw SquareTerminalUnavailableException.config("Square webhook signature could not be verified.");
        }
    }
}
