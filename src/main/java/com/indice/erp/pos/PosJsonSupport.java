package com.indice.erp.pos;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class PosJsonSupport {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private PosJsonSupport() {
    }

    public static String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw PosApiException.badRequest("Invalid JSON value.");
        }
    }

    public static JsonNode toJsonNode(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readTree(json);
        } catch (JsonProcessingException ex) {
            throw PosApiException.badRequest("Invalid JSON payload.");
        }
    }
}
