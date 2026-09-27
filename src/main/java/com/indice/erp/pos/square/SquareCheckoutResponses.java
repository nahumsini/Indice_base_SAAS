package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
class SquareCheckoutResponses {
    private final ObjectMapper mapper;
    SquareCheckoutResponses(ObjectMapper mapper) { this.mapper = mapper; }
    SquareTerminalGateway.Checkout root(JsonNode root, String request) {
        return checkout(root.path("checkout"), root.toString(), request);
    }
    SquareTerminalGateway.Checkout node(JsonNode node) {
        var wrapper = mapper.createObjectNode();
        wrapper.set("checkout", node);
        return checkout(node, wrapper.toString(), null);
    }
    private SquareTerminalGateway.Checkout checkout(JsonNode node, String raw, String request) {
        var ids = node.path("payment_ids");
        var payment = ids.isArray() && !ids.isEmpty()
            ? SquareProviderIdentifiers.text(ids.get(0),192) : null;
        return new SquareTerminalGateway.Checkout(SquareProviderIdentifiers.text(node.path("id"),255),
            SquareJsonValues.text(node, "status"), payment,
            SquareJsonValues.text(node, "cancel_reason"), raw, request);
    }
}
