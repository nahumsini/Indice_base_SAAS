package com.indice.erp.sales;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class SalesPayloadSupport {

    private SalesPayloadSupport() {
    }

    static Object value(Map<String, Object> payload, String apiName) {
        if (payload == null || apiName == null) {
            return null;
        }
        if (payload.containsKey(apiName)) {
            return payload.get(apiName);
        }
        var snakeName = camelToSnake(apiName);
        if (payload.containsKey(snakeName)) {
            return payload.get(snakeName);
        }
        for (var alias : aliases(apiName)) {
            if (payload.containsKey(alias)) {
                return payload.get(alias);
            }
            var snakeAlias = camelToSnake(alias);
            if (payload.containsKey(snakeAlias)) {
                return payload.get(snakeAlias);
            }
        }
        return null;
    }

    static boolean contains(Map<String, Object> payload, String apiName) {
        if (payload == null) {
            return false;
        }
        if (payload.containsKey(apiName) || payload.containsKey(camelToSnake(apiName))) {
            return true;
        }
        for (var alias : aliases(apiName)) {
            if (payload.containsKey(alias) || payload.containsKey(camelToSnake(alias))) {
                return true;
            }
        }
        return false;
    }

    static String stringValue(Map<String, Object> payload, String apiName) {
        var value = value(payload, apiName);
        if (value == null) {
            return null;
        }
        var normalized = String.valueOf(value).trim();
        return normalized.isBlank() ? null : normalized;
    }

    static Long longValue(Map<String, Object> payload, String apiName) {
        return toLong(value(payload, apiName));
    }

    static Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        var raw = String.valueOf(value).trim();
        if (raw.isBlank() || "null".equalsIgnoreCase(raw) || "none".equalsIgnoreCase(raw)) {
            return null;
        }
        return Long.parseLong(raw);
    }

    static Integer integerValue(Map<String, Object> payload, String apiName) {
        var value = value(payload, apiName);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        var raw = String.valueOf(value).trim();
        return raw.isBlank() ? null : Integer.parseInt(raw);
    }

    static BigDecimal decimalValue(Map<String, Object> payload, String apiName) {
        return toBigDecimal(value(payload, apiName));
    }

    static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        var raw = String.valueOf(value).trim().replace("$", "").replace(",", "");
        if (raw.isBlank()) {
            return null;
        }
        if (raw.endsWith("%")) {
            raw = raw.substring(0, raw.length() - 1).trim();
        }
        return new BigDecimal(raw);
    }

    static Boolean booleanValue(Map<String, Object> payload, String apiName) {
        var value = value(payload, apiName);
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        var raw = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
        if (raw.isBlank()) {
            return null;
        }
        return Set.of("1", "true", "yes", "si", "sí", "active", "activo").contains(raw);
    }

    static LocalDate dateValue(Map<String, Object> payload, String apiName) {
        var value = value(payload, apiName);
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        var raw = String.valueOf(value).trim();
        if (raw.isBlank()) {
            return null;
        }
        return LocalDate.parse(raw.length() > 10 ? raw.substring(0, 10) : raw);
    }

    static LocalDateTime dateTimeValue(Map<String, Object> payload, String apiName) {
        return toLocalDateTime(value(payload, apiName));
    }

    static LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        var raw = String.valueOf(value).trim();
        if (raw.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(raw.replace(" ", "T"));
        } catch (DateTimeParseException ignored) {
            return LocalDate.parse(raw.length() > 10 ? raw.substring(0, 10) : raw).atStartOfDay();
        }
    }

    static String jsonValue(ObjectMapper objectMapper, Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String raw) {
            var trimmed = raw.trim();
            return trimmed.isBlank() ? null : trimmed;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Invalid JSON payload.");
        }
    }

    static Object parseJson(ObjectMapper objectMapper, String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(rawJson, Object.class);
        } catch (JsonProcessingException ex) {
            return rawJson;
        }
    }

    static Map<String, Object> customFields(Map<String, Object> payload, Collection<String> knownFields) {
        var customFields = new LinkedHashMap<String, Object>();
        if (payload == null) {
            return customFields;
        }
        var known = new java.util.HashSet<String>();
        knownFields.forEach(field -> {
            known.add(field);
            known.add(camelToSnake(field));
        });
        known.add("id");
        known.add("items");
        known.add("files");

        for (var entry : payload.entrySet()) {
            if (!known.contains(entry.getKey())) {
                customFields.put(entry.getKey(), entry.getValue());
            }
        }
        return customFields;
    }

    static void setValue(
            PreparedStatement statement,
            int index,
            SalesFieldType type,
            Object value,
            ObjectMapper objectMapper) throws SQLException {
        if (value == null) {
            statement.setNull(index, sqlType(type));
            return;
        }

        switch (type) {
            case STRING -> statement.setString(index, String.valueOf(value).trim());
            case LONG -> statement.setObject(index, toLong(value), Types.BIGINT);
            case INTEGER -> statement.setObject(index, value instanceof Number number ? number.intValue() : Integer.parseInt(String.valueOf(value)), Types.INTEGER);
            case DECIMAL -> statement.setBigDecimal(index, toBigDecimal(value));
            case BOOLEAN -> statement.setBoolean(index, Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(String.valueOf(value)) || "1".equals(String.valueOf(value)));
            case DATE -> statement.setObject(index, value instanceof LocalDate localDate ? localDate : LocalDate.parse(String.valueOf(value)));
            case DATETIME -> statement.setObject(index, toLocalDateTime(value));
            case JSON -> statement.setString(index, jsonValue(objectMapper, value));
        }
    }

    static int sqlType(SalesFieldType type) {
        return switch (type) {
            case LONG -> Types.BIGINT;
            case INTEGER -> Types.INTEGER;
            case DECIMAL -> Types.DECIMAL;
            case BOOLEAN -> Types.BOOLEAN;
            case DATE -> Types.DATE;
            case DATETIME -> Types.TIMESTAMP;
            case JSON, STRING -> Types.VARCHAR;
        };
    }

    static String camelToSnake(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }

    private static Collection<String> aliases(String apiName) {
        return switch (apiName) {
            case "nextActionAt" -> java.util.List.of("nextActionDate", "nextActionTime");
            case "lastContactAt" -> java.util.List.of("lastContact", "lastContactDate");
            case "expectedCloseDate" -> java.util.List.of("closeDate");
            case "expirationDate" -> java.util.List.of("expiration", "expiresAt");
            case "createdDate" -> java.util.List.of("quoteDate");
            case "ownerUserCompanyId" -> java.util.List.of("ownerId", "assignedOwnerId");
            case "assignedSellerUserCompanyId" -> java.util.List.of("assignedSellerId", "sellerId", "ownerId");
            case "ownerName" -> java.util.List.of("assignedOwnerName");
            case "assignedSellerName" -> java.util.List.of("sellerName", "ownerName");
            case "companyName" -> java.util.List.of("clientName", "company", "client");
            case "contactPerson" -> java.util.List.of("contactName", "primaryContact");
            case "lifetimeValue" -> java.util.List.of("ltv");
            case "postSaleType" -> java.util.List.of("type");
            case "relationType" -> java.util.List.of("customerRelationType");
            case "dynamicFields" -> java.util.List.of("templateFields");
            case "signatureRequest" -> java.util.List.of("signatureRequestState");
            default -> java.util.List.of();
        };
    }
}
