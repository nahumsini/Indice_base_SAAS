package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
class SquareHttpTerminalGateway implements SquareTerminalGateway {

    private final SquareTerminalProperties properties;
    private final SquareTerminalSecretProvider secrets;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    SquareHttpTerminalGateway(
        SquareTerminalProperties properties,
        SquareTerminalSecretProvider secrets,
        RestClient.Builder builder,
        ObjectMapper objectMapper) {
        this.properties = properties;
        this.secrets = secrets;
        this.restClient = builder.baseUrl(properties.apiBaseUrl())
            .defaultHeader("Square-Version", properties.getApiVersion()).build();
        this.objectMapper = objectMapper;
    }

    public OAuthToken exchangeCode(String code) {
        var body = Map.of("client_id", secrets.applicationId(), "client_secret", secrets.applicationSecret(),
            "code", code, "grant_type", "authorization_code");
        var root = post("/oauth2/token", null, body);
        return new OAuthToken(text(root, "merchant_id"), text(root, "access_token"),
            text(root, "refresh_token"), instant(text(root, "expires_at")));
    }

    public OAuthToken refreshToken(String refreshToken) {
        var body = Map.of("client_id", secrets.applicationId(), "client_secret", secrets.applicationSecret(),
            "refresh_token", refreshToken, "grant_type", "refresh_token");
        var root = post("/oauth2/token", null, body);
        return new OAuthToken(text(root, "merchant_id"), text(root, "access_token"),
            text(root, "refresh_token"), instant(text(root, "expires_at")));
    }

    public List<SquareTerminalDtos.SquareLocation> listLocations(String accessToken) {
        var root = get("/v2/locations", accessToken);
        var results = new ArrayList<SquareTerminalDtos.SquareLocation>();
        root.path("locations").forEach(node -> results.add(new SquareTerminalDtos.SquareLocation(
            text(node, "id"), text(node, "name"), text(node, "currency"), text(node, "country"))));
        return results;
    }

    public DeviceCode createDeviceCode(String token, String idempotencyKey, String locationId, String name) {
        var deviceCode = new LinkedHashMap<String, Object>();
        deviceCode.put("name", name);
        deviceCode.put("product_type", "TERMINAL_API");
        deviceCode.put("location_id", locationId);
        var root = post("/v2/devices/codes", token,
            Map.of("idempotency_key", idempotencyKey, "device_code", deviceCode));
        var node = root.path("device_code");
        return new DeviceCode(text(node, "id"), text(node, "code"), text(node, "status"),
            text(node, "device_id"), instant(text(node, "pair_by")));
    }

    public Checkout createCheckout(String token, CheckoutCommand command) {
        var checkout = new LinkedHashMap<String, Object>();
        checkout.put("amount_money", Map.of("amount", cents(command.amount()), "currency", command.currencyCode()));
        checkout.put("device_options", Map.of("device_id", command.deviceId(), "skip_receipt_screen", false));
        checkout.put("reference_id", command.checkoutId());
        if (command.note() != null && !command.note().isBlank()) checkout.put("note", command.note());
        var body = Map.of("idempotency_key", command.idempotencyKey(), "checkout", checkout);
        var root = post("/v2/terminals/checkouts", token, body);
        return checkout(root, json(body));
    }

    public Checkout getCheckout(String token, String checkoutId) {
        return checkout(get("/v2/terminals/checkouts/" + checkoutId, token), null);
    }

    public Checkout cancelCheckout(String token, String checkoutId) {
        return checkout(post("/v2/terminals/checkouts/" + checkoutId + "/cancel", token, Map.of()), null);
    }

    public Refund refundPayment(String token, String key, String paymentId, BigDecimal amount, String currency) {
        return refund(post("/v2/refunds", token, Map.of("idempotency_key", key, "payment_id", paymentId,
                "amount_money", Map.of("amount", amount.setScale(2, java.math.RoundingMode.UNNECESSARY).movePointRight(2).longValueExact(), "currency", currency),
                "reason", "Full POS ticket return")));
    }

    public Refund getRefund(String token, String refundId) {
        if (!refundId.matches("[A-Za-z0-9_-]+")) throw new IllegalArgumentException("Invalid Square refund identity.");
        return refund(get("/v2/refunds/" + refundId, token));
    }

    private Refund refund(JsonNode root) {
        var node = root.path("refund");
        var amount = node.path("amount_money");
        if (!amount.path("amount").isIntegralNumber()) throw new SquareGatewayException("Square refund amount is missing.", true, null);
        return new Refund(text(node, "id"), text(node, "payment_id"), text(node, "status"),
                amount.path("amount").decimalValue().movePointLeft(2), text(amount, "currency"));
    }

    private JsonNode get(String uri, String token) {
        try {
            return json(restClient.get().uri(uri).headers(h -> bearer(h, token)).retrieve().body(String.class));
        } catch (RestClientResponseException ex) {
            throw gatewayFailure(ex);
        } catch (ResourceAccessException ex) {
            throw new SquareGatewayException("Square is unavailable.", true, ex);
        }
    }

    private JsonNode post(String uri, String token, Object body) {
        try {
            return json(restClient.post().uri(uri).headers(h -> bearer(h, token))
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class));
        } catch (RestClientResponseException ex) {
            throw gatewayFailure(ex);
        } catch (ResourceAccessException ex) {
            throw new SquareGatewayException("Square is unavailable.", true, ex);
        }
    }

    private SquareGatewayException gatewayFailure(RestClientResponseException ex) {
        return new SquareGatewayException("Square request failed.",
            ex.getStatusCode().is5xxServerError(), ex.getStatusCode().value(), ex);
    }

    private Checkout checkout(JsonNode root, String requestJson) {
        var node = root.path("checkout");
        var payment = node.path("payment_ids").isArray() && !node.path("payment_ids").isEmpty()
            ? node.path("payment_ids").get(0).asText() : null;
        return new Checkout(text(node, "id"), text(node, "status"), payment,
            text(node, "cancel_reason"), root.toString(), requestJson);
    }

    private void bearer(org.springframework.http.HttpHeaders headers, String token) {
        if (token != null && !token.isBlank()) headers.setBearerAuth(token);
    }

    private JsonNode json(String value) {
        try {
            return objectMapper.readTree(value == null ? "{}" : value);
        } catch (Exception exception) {
            throw new SquareGatewayException("Square returned invalid JSON.", true, exception);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Square request could not be serialized.", exception);
        }
    }

    private long cents(BigDecimal amount) {
        return amount.setScale(2, java.math.RoundingMode.HALF_UP).movePointRight(2).longValueExact();
    }

    private String text(JsonNode node, String field) {
        var value = node.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }

    private Instant instant(String value) {
        try { return value == null ? null : Instant.parse(value); }
        catch (RuntimeException ignored) { return null; }
    }
}
