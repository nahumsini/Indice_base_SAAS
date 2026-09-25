package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.springframework.http.HttpStatus;

public record MpWebhookHeaders(String timestamp, String digest) {
    public static MpWebhookHeaders parse(String value) {
        if (value == null || value.length() > 256) throw invalid();
        String timestamp = null;
        String digest = null;
        for (var part : value.split(",")) {
            var pair = part.trim().split("=", 2);
            if (pair.length != 2) throw invalid();
            if (pair[0].equals("ts") && timestamp == null) timestamp = pair[1];
            else if (pair[0].equals("v1") && digest == null) digest = pair[1];
            else throw invalid();
        }
        if (timestamp == null || !timestamp.matches("[0-9]{10}|[0-9]{13}")
                || digest == null || !digest.matches("[a-fA-F0-9]{64}")) throw invalid();
        return new MpWebhookHeaders(timestamp, digest);
    }

    static PosApiException invalid() {
        return new PosApiException(HttpStatus.UNAUTHORIZED, "Invalid provider notification.");
    }
}
