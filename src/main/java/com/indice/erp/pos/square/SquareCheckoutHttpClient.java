package com.indice.erp.pos.square;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class SquareCheckoutHttpClient {
    private final SquareRestClient client;
    private final SquareCheckoutPayloads payloads;
    private final SquareCheckoutResponses responses;
    SquareCheckoutHttpClient(SquareRestClient client, SquareCheckoutPayloads payloads,
            SquareCheckoutResponses responses) {
        this.client = client; this.payloads = payloads; this.responses = responses;
    }
    SquareTerminalGateway.Checkout create(String token, String requestJson) {
        return responses.root(client.post("/v2/terminals/checkouts", token, requestJson), requestJson);
    }
    SquareTerminalGateway.Checkout get(String token, String id) {
        valid(id);
        return responses.root(client.get("/v2/terminals/checkouts/{id}", token, id), null);
    }
    List<SquareTerminalGateway.Checkout> search(String token, SquareTerminalGateway.CheckoutSearch search) {
        var root = client.post("/v2/terminals/checkouts/search", token, payloads.search(search));
        var values = new ArrayList<SquareTerminalGateway.Checkout>();
        root.path("checkouts").forEach(node -> values.add(responses.node(node)));
        return List.copyOf(values);
    }
    SquareTerminalGateway.Checkout cancel(String token, String id) {
        valid(id);
        return responses.root(client.post("/v2/terminals/checkouts/{id}/cancel", token, Map.of(), id), null);
    }
    private void valid(String id) {
        if (!SquareProviderIdentifiers.valid(id,255))
            throw new IllegalArgumentException("Square checkout identifier is invalid.");
    }
}
