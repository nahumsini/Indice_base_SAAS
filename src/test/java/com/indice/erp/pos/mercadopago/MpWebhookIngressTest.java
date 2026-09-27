package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.indice.erp.pos.mercadopago.MpWebhookTestSignatures.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class MpWebhookIngressTest {
    private final MpProperties properties = properties();
    private final MpSecrets secrets = new MpSecrets(properties);
    private final MpWebhookInbox inbox = mock(MpWebhookInbox.class);
    private final MpJson json = new MpJson(new ObjectMapper());
    private final MpWebhookIngress ingress = new MpWebhookIngress(secrets, properties,
        new MpWebhookSignature(secrets, properties, MpTestFixtures.CLOCK), inbox, json);

    @Test void validWakeupIgnoresAllBodyFinancialAndTenantAuthority() throws Exception {
        var digest = sign(ORDER, REQUEST, now());
        for (var body : new String[]{"not-json", "{\"company_id\":99,\"status\":\"approved\",\"amount\":1}"}) {
            ingress.receive(ORDER, REQUEST, digest, new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
        }
        var hash = json.hash("id:" + ORDER + ";request-id:" + REQUEST + ";ts:" + now() + ";");
        verify(inbox, times(2)).receive("sandbox", ORDER, hash);
        verifyNoMoreInteractions(inbox);
    }
    @Test void invalidSignatureAndDisabledFeatureCannotReadBodyOrWriteInbox() {
        var unreadable = new InputStream() {
            @Override public int read() { throw new AssertionError("Unauthenticated body must not be read"); }
        };
        assertThrows(PosApiException.class, () -> ingress.receive(ORDER, REQUEST, "invalid", unreadable));
        properties.setEnabled(false);
        assertThrows(PosApiException.class, () -> ingress.receive(ORDER, REQUEST, "invalid", unreadable));
        verifyNoInteractions(inbox);
    }
    @Test void oversizedAuthenticatedBodyIsRejectedBeforeDurableAcceptance() throws Exception {
        var digest = sign(ORDER, REQUEST, now());
        var error = assertThrows(PosApiException.class, () -> ingress.receive(ORDER, REQUEST, digest,
            new ByteArrayInputStream(new byte[65537])));
        assertEquals(413, error.status().value());
        verifyNoInteractions(inbox);
    }
}
