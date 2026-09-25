package com.indice.erp.sales;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import static com.indice.erp.sales.SalesAssistantContracts.*;

/** Whitelist and projection at the existing dynamic Sales owner boundary. */
final class SalesAssistantFields {
    private SalesAssistantFields() { }
    private static final Set<String> COMMON = Set.of("id", "name", "status", "ownerUserCompanyId", "notes", "clearFields");
    private static final Map<String, Set<String>> FIELDS = Map.of(
        "customer", Set.of("contactPerson", "phone", "email", "source"),
        "opportunity", Set.of("customerId", "source", "currency", "estimatedValue", "flowId", "stage", "expectedCloseDate", "nextAction"),
        "quote", Set.of("customerId", "opportunityId", "currency", "expirationDate", "terms", "items"));
    private static final Set<String> CLEARABLE = Set.of("contactPerson", "phone", "email", "source", "notes", "expectedCloseDate", "nextAction", "expirationDate", "terms", "opportunityId");
    static Map<String, Object> payload(ObjectMapper mapper, String kind, Change change) {
        if (change == null || !FIELDS.containsKey(kind)) throw new IllegalArgumentException("Commercial input is required.");
        Map<String, Object> raw = mapper.convertValue(change, new TypeReference<>() { });
        var result = new LinkedHashMap<String, Object>();
        raw.forEach((key, value) -> {
            if (value == null || key.equals("id") || key.equals("clearFields")) return;
            if (!COMMON.contains(key) && !FIELDS.get(kind).contains(key)) throw new IllegalArgumentException("Unsupported field: " + key);
            if (value instanceof String text) value = text(text, key, limit(key));
            if (key.endsWith("Id")) positive(value, key);
            result.put(apiName(kind, key), value);
        });
        if (change.clearFields() != null) for (String field : change.clearFields()) {
            if (!CLEARABLE.contains(field) || (!COMMON.contains(field) && !FIELDS.get(kind).contains(field))) throw new IllegalArgumentException("Field cannot be cleared: " + field);
            String target = apiName(kind, field);
            if (result.containsKey(target)) throw new IllegalArgumentException("Cannot set and clear the same field.");
            result.put(target, null);
        }
        if (change.id() != null) positive(change.id(), "id");
        if (result.isEmpty()) throw new IllegalArgumentException("At least one change is required.");
        if (result.containsKey("currency")) {
            String currency = String.valueOf(result.get("currency")).toUpperCase(Locale.ROOT);
            try { Currency.getInstance(currency); } catch (RuntimeException e) { throw new IllegalArgumentException("Use an ISO currency code."); }
            result.put("currency", currency);
        }
        if (change.email() != null && !change.email().trim().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw new IllegalArgumentException("Invalid email.");
        if (change.estimatedValue() != null) result.put("estimatedValue", decimal(change.estimatedValue(), "estimatedValue", false, new BigDecimal("9999999999999.99")));
        if (change.status() != null) {
            var statuses = kind.equals("quote") ? Set.of("draft", "sent", "viewed", "negotiation", "approved", "rejected", "expired") : Set.of("active", "inactive");
            if (!statuses.contains(change.status())) throw new IllegalArgumentException("Invalid status; use opportunity stages for won/lost. Closing a sale uses the Sales workflow.");
        }
        return result;
    }
    static String apiName(String kind, String key) {
        return switch (key) {
            case "name" -> switch (kind) { case "customer" -> "companyName"; case "opportunity" -> "opportunityName"; default -> "clientName"; };
            case "customerId" -> "contactId";
            case "ownerUserCompanyId" -> kind.equals("quote") ? "assignedSellerUserCompanyId" : key;
            default -> key;
        };
    }
    static int limit(String key) { return switch (key) {
        case "phone", "source", "stage" -> 80; case "contactPerson" -> 180; case "nextAction" -> 120;
        case "notes", "terms" -> 4000; default -> 220;
    }; }
    static String text(String value, String field, int limit) {
        if (value == null || value.trim().isEmpty() || value.trim().length() > limit) throw new IllegalArgumentException("Invalid " + field + ".");
        return value.trim();
    }
    static long positive(Object value, String field) {
        try { long id = new BigDecimal(String.valueOf(value)).longValueExact(); if (id > 0) return id; }
        catch (RuntimeException ignored) { }
        throw new IllegalArgumentException(field + " must be a positive identifier.");
    }
    static BigDecimal decimal(BigDecimal value, String field, boolean positive, BigDecimal maximum) {
        if (value == null || value.signum() < (positive ? 1 : 0) || value.compareTo(maximum) > 0 || value.stripTrailingZeros().scale() > 2)
            throw new IllegalArgumentException(field + " must be within range with at most two decimal places.");
        return value.setScale(2, RoundingMode.UNNECESSARY);
    }
    static Map<String, Object> line(LineInput item, int index) {
        if (item == null) throw new IllegalArgumentException("Invalid quote line.");
        var quantity = decimal(item.quantity(), "quantity", true, new BigDecimal("9999999999.99"));
        var price = decimal(item.unitPrice(), "unitPrice", false, new BigDecimal("9999999999999.99"));
        var discount = decimal(item.discountPercent() == null ? BigDecimal.ZERO : item.discountPercent(), "discountPercent", false, new BigDecimal("100"));
        var tax = decimal(item.taxPercent(), "taxPercent", false, new BigDecimal("100"));
        var total = SalesRepository.calculateLineTotal(quantity, price, discount, tax).setScale(2, RoundingMode.HALF_UP);
        decimal(total, "lineTotal", false, new BigDecimal("9999999999999.99"));
        var result = new LinkedHashMap<String, Object>();
        if (item.productId() != null) result.put("productId", positive(item.productId(), "productId"));
        if (item.productName() != null) result.put("productName", text(item.productName(), "productName", 220));
        result.put("quantity", quantity); result.put("unitPrice", price); result.put("discountPercent", discount);
        result.put("taxPercent", tax); result.put("lineTotal", total); result.put("sortOrder", index);
        return result;
    }
    static RecordView view(String kind, Map<String, Object> row) {
        var quote = kind.equals("quote");
        return new RecordView(kind, id(row, "id"), str(row, switch(kind) { case "customer" -> "contactCode"; case "opportunity" -> "opportunityCode"; default -> "quoteNumber"; }),
            str(row, apiName(kind, "name")), id(row, "contactId"), id(row, "opportunityId"), str(row, "contactPerson"),
            str(row, "phone"), str(row, "email"), str(row, "source"), str(row, "status"), str(row, "lifecycleStatus"),
            id(row, apiName(kind, "ownerUserCompanyId")), str(row, quote ? "assignedSellerName" : "ownerName"), str(row, "notes"),
            str(row, "currency"), money(row, quote ? "amount" : "estimatedValue"), str(row, "stage"), id(row, "flowId"), str(row, "flowName"), row.get("probabilityPercent") == null ? null : new BigDecimal(String.valueOf(row.get("probabilityPercent"))).intValueExact(), date(row, "expectedCloseDate"),
            str(row, "nextAction"), date(row, "expirationDate"), str(row, "terms"), quote ? lines(row) : List.of());
    }
    static List<Line> lines(Map<String, Object> row) {
        if (!(row.get("items") instanceof List<?> list)) return List.of();
        return list.stream().map(item -> {
            @SuppressWarnings("unchecked") var line = (Map<String, Object>) item;
            return new Line(id(line, "productId"), str(line, "productName"), money(line, "quantity"), money(line, "unitPrice"),
                money(line, "discountPercent"), money(line, "taxPercent"), money(line, "lineTotal"));
        }).toList();
    }
    static String str(Map<String, Object> row, String field) { return row.get(field) == null ? null : String.valueOf(row.get(field)); }
    static Long id(Map<String, Object> row, String field) { return row.get(field) == null ? null : positive(row.get(field), field); }
    static BigDecimal money(Map<String, Object> row, String field) { return row.get(field) == null ? null : new BigDecimal(String.valueOf(row.get(field))); }
    static LocalDate date(Map<String, Object> row, String field) { return row.get(field) == null ? null : LocalDate.parse(String.valueOf(row.get(field))); }
}
