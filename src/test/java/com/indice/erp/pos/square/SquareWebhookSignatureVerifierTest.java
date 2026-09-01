package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class SquareWebhookSignatureVerifierTest {

    @Test
    void verifiesSignatureAgainstConfiguredNotificationUrlAndRawPayload() throws Exception {
        var verifier = new SquareWebhookSignatureVerifier(properties(), new SquareTerminalSecretProvider(properties()));
        var payload = "{\"type\":\"terminal.checkout.updated\"}";

        assertThatCode(() -> verifier.verify(payload, sign("https://indice.test/square/webhook" + payload)))
            .doesNotThrowAnyException();
    }

    @Test
    void rejectsWrongSignature() {
        var verifier = new SquareWebhookSignatureVerifier(properties(), new SquareTerminalSecretProvider(properties()));

        assertThatThrownBy(() -> verifier.verify("{\"ok\":true}", "wrong"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("invalid");
    }

    private SquareTerminalProperties properties() {
        var properties = new SquareTerminalProperties();
        properties.setEnabled(true);
        properties.setEnvironment("sandbox");
        properties.setWebhookSignatureKey("square-webhook-signature-secret");
        properties.setWebhookNotificationUrl("https://indice.test/square/webhook");
        return properties;
    }

    private String sign(String payload) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("square-webhook-signature-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getEncoder().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    }
}
