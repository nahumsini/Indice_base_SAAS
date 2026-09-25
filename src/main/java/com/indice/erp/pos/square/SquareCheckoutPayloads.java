package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class SquareCheckoutPayloads {
    private final ObjectMapper mapper;
    SquareCheckoutPayloads(ObjectMapper mapper) { this.mapper = mapper; }
    Request create(SquareTerminalGateway.CheckoutCommand command) {
        var checkout = new LinkedHashMap<String, Object>();
        checkout.put("amount_money", Map.of("amount", command.amount().setScale(2, RoundingMode.HALF_UP)
            .movePointRight(2).longValueExact(), "currency", command.currencyCode()));
        checkout.put("device_options", Map.of("device_id", command.deviceId(), "skip_receipt_screen", false));
        checkout.put("reference_id", command.checkoutId());
        if (command.note() != null && !command.note().isBlank()) checkout.put("note", command.note());
        var body = Map.of("idempotency_key", command.idempotencyKey(), "checkout", checkout);
        return new Request(body, json(body));
    }
    Object search(SquareTerminalGateway.CheckoutSearch search) {
        var filter = new LinkedHashMap<String, Object>();
        filter.put("device_id", search.deviceId());
        filter.put("created_at", Map.of("start_at", search.startAt().toString(),
            "end_at", search.endAt().toString()));
        return Map.of("limit", 100, "query", Map.of("filter", filter));
    }
    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (Exception failure) {
            throw new IllegalArgumentException("Square request could not be serialized.", failure);
        }
    }
    record Request(Object body, String json) {}
}
