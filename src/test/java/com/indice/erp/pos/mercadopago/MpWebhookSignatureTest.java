package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static com.indice.erp.pos.mercadopago.MpWebhookTestSignatures.*;
import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class MpWebhookSignatureTest {
    private final MpProperties properties = properties();
    private final MpWebhookSignature signature = new MpWebhookSignature(new MpSecrets(properties), properties, MpTestFixtures.CLOCK);
    @ParameterizedTest @ValueSource(booleans={false, true})
    void authenticatesCasePreservedIdentifierAndOriginalSecondsOrMilliseconds(boolean milliseconds) throws Exception {
        var timestamp = Long.toString(MpTestFixtures.NOW.getEpochSecond() * (milliseconds ? 1000 : 1));
        var digest = sign(ORDER, REQUEST, timestamp);
        assertEquals("id:" + ORDER + ";request-id:" + REQUEST + ";ts:" + timestamp + ";",
            signature.verify(ORDER, REQUEST, digest));
        assertThrows(PosApiException.class, () -> signature.verify("ORDabc123", REQUEST, digest));
        assertThrows(PosApiException.class, () -> signature.verify(ORDER, "changed-request", digest));
    }
    @ParameterizedTest @ValueSource(longs={-301, 301})
    void correctlySignedStaleOrFutureDeliveryCannotBypassFreshness(long offset) throws Exception {
        var digest = sign(ORDER, REQUEST, Long.toString(MpTestFixtures.NOW.getEpochSecond() + offset));
        assertThrows(PosApiException.class, () -> signature.verify(ORDER, REQUEST, digest));
    }
    @ParameterizedTest @ValueSource(strings={"", "ts=invalid,v1=invalid", "ts=1", "v1=00", "ts=1,ts=2,v1=00"})
    void malformedOrDuplicateHeadersFailClosed(String digest) {
        assertThrows(PosApiException.class, () -> signature.verify(ORDER, REQUEST, digest));
    }
    @Test void invalidToleranceOrSignatureNeverAuthenticatesNotification() throws Exception {
        var digest = sign(ORDER, REQUEST, now());
        var modified = digest.substring(0, digest.length() - 1) + (digest.endsWith("0") ? "1" : "0");
        assertThrows(PosApiException.class, () -> signature.verify(ORDER, REQUEST, modified));
        properties.setWebhookToleranceSeconds(0);
        assertThrows(PosApiException.class, () -> signature.verify(ORDER, REQUEST, digest));
    }
}
