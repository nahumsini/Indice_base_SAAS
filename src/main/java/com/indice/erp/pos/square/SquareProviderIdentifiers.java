package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;

final class SquareProviderIdentifiers {
    private SquareProviderIdentifiers() {}
    static String text(JsonNode value, int max) {
        return value != null && value.isTextual() && valid(value.textValue(), max)
            ? value.textValue() : null;
    }
    static boolean valid(String value, int max) {
        return value != null && !value.isEmpty()
            && value.codePointCount(0, value.length()) <= max;
    }
    static boolean refund(JsonNode value) {
        return text(value, 255) != null;
    }
    static boolean refund(String value) {
        return valid(value, 255);
    }
}
