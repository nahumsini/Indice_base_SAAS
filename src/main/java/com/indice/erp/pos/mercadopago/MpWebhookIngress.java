package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.io.IOException;
import java.io.InputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public record MpWebhookIngress(MpSecrets secrets, MpProperties properties,
        MpWebhookSignature signature, MpWebhookInbox inbox, MpJson json) {
    public void receive(String id, String requestId, String digest, InputStream body) throws IOException {
        secrets.requireEnabled();
        var manifest = signature.verify(id, requestId, digest);
        if (body.readNBytes(65537).length > 65536) {
            throw new PosApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Notification body is too large.");
        }
        inbox.receive(properties.environment(), id, json.hash(manifest));
    }
}
