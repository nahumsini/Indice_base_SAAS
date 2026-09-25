package com.indice.erp.pos.mercadopago;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public record MpWebhookSignature(MpSecrets secrets, MpProperties properties, Clock clock) {
    public String verify(String orderId, String requestId, String signature) {
        if (orderId == null || !orderId.matches("ORD[A-Za-z0-9_-]{1,125}")
                || requestId == null || !requestId.matches("[A-Za-z0-9_-]{1,128}")) {
            throw MpWebhookHeaders.invalid();
        }
        var headers = MpWebhookHeaders.parse(signature);
        var seconds = Long.parseLong(headers.timestamp());
        if (headers.timestamp().length() == 13) seconds /= 1000;
        var tolerance = properties.getWebhookToleranceSeconds();
        if (tolerance < 60 || tolerance > 3600
                || Math.abs(clock.instant().getEpochSecond() - seconds) > tolerance) {
            throw MpWebhookHeaders.invalid();
        }
        var manifest = "id:" + orderId + ";request-id:" + requestId + ";ts:" + headers.timestamp() + ";";
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secrets.webhookSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            var expected = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            if (!MessageDigest.isEqual(expected, HexFormat.of().parseHex(headers.digest()))) {
                throw MpWebhookHeaders.invalid();
            }
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException("Webhook verification is unavailable.");
        }
        return manifest;
    }
}
