package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentEvidenceGateway {
    private final SquareRestClient client;
    SquarePaymentEvidenceGateway(SquareRestClient client) {
        this.client = client;
    }
    JsonNode payment(String token, String id) {
        return resource(token, "/v2/payments/{id}", id, 192).path("payment");
    }
    JsonNode device(String token, String id) {
        return resource(token, "/v2/devices/codes/{id}", id, 128).path("device_code");
    }
    private JsonNode resource(String token, String path, String id, int max) {
        if (!SquareProviderIdentifiers.valid(id,max))
            throw new IllegalArgumentException("Square provider identifier is invalid.");
        return client.get(path, token, id);
    }
}
