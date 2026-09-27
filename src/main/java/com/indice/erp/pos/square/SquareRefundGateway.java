package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Component;

@Component
class SquareRefundGateway {
    private final SquareRestClient client; private final ObjectMapper mapper;
    SquareRefundGateway(SquareRestClient client, ObjectMapper mapper) {
        this.client=client; this.mapper=mapper;
    }
    JsonNode request(String json) {
        try { return mapper.readTree(json); }
        catch (Exception invalid) { throw new IllegalStateException("Stored Square refund request is invalid.", invalid); }
    }
    JsonNode create(String token, JsonNode request) {
        return client.post("/v2/refunds", token, request).path("refund");
    }
    JsonNode get(String token, String id) {
        if (!SquareProviderIdentifiers.refund(id))
            throw new IllegalArgumentException("Square refund identifier is invalid.");
        return client.get("/v2/refunds/{id}", token, id).path("refund");
    }
}
