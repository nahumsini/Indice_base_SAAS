package com.indice.erp.pos.mercadopago;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

final class MpWebhookTestSignatures {
    static final String ORDER = "ORDAbC123";
    static final String REQUEST = "synthetic-request-id";
    static final String SECRET = "synthetic-test-only-webhook-key";
    static MpProperties properties() {
        var properties = new MpProperties();
        properties.setEnabled(true);
        properties.setWebhookSecret(SECRET);
        return properties;
    }
    static String sign(String order, String request, String timestamp) throws Exception {
        var manifest = "id:" + order + ";request-id:" + request + ";ts:" + timestamp + ";";
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "ts=" + timestamp + ",v1=" + HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
    }
    static String now() { return Long.toString(MpTestFixtures.NOW.getEpochSecond()); }
    private MpWebhookTestSignatures() {}
}
