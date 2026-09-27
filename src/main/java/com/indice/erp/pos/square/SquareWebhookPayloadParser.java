package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
class SquareWebhookPayloadParser {
    private final ObjectMapper mapper;
    private final SquareTerminalProperties properties;
    SquareWebhookPayloadParser(ObjectMapper mapper, SquareTerminalProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
    }
    SquareWebhookPayload parse(String payload, String header) {
        try {
            var root = mapper.readTree(payload);
            var id = required(root.path("event_id").asText(null));
            var type = required(root.path("type").asText(null));
            var data = root.path("data");
            var object = data.path("object");
            var objectId = object.path("checkout").path("id").asText(null);
            if (objectId == null) objectId = object.path("device_code").path("id").asText(null);
            if (objectId == null) objectId = object.path("refund").path("id").asText(null);
            if (objectId == null) objectId = data.path("id").asText(null);
            return new SquareWebhookPayload(id, type, properties.getEnvironment(), root.path("merchant_id").asText(null), objectId);
        } catch (Exception malformed) {
            throw new IllegalArgumentException("Square webhook payload is invalid.");
        }
    }
    private String required(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException();
        return value;
    }
    String persisted(SquareWebhookPayload payload) {
        var root = mapper.createObjectNode();
        root.put("event_id", payload.eventId());
        root.put("type", payload.eventType());
        root.put("merchant_id", payload.merchantId());
        root.putObject("data").put("id", payload.objectId());
        return root.toString();
    }
}
