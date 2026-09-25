package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

final class SquareJsonValues {
    private SquareJsonValues() {}
    static String text(JsonNode node, String field) {
        var value = node.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }
    static Instant instant(String value) {
        try { return value == null ? null : Instant.parse(value); }
        catch (RuntimeException ignored) { return null; }
    }
}
