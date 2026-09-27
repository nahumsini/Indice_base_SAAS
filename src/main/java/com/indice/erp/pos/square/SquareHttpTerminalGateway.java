package com.indice.erp.pos.square;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
class SquareHttpTerminalGateway implements SquareTerminalGateway {
    private final SquareOAuthHttpClient oauth;
    private final SquareDeviceHttpClient devices;
    private final SquareCheckoutHttpClient checkouts;
    private final SquareRestClient refunds;
    @Autowired
    SquareHttpTerminalGateway(SquareOAuthHttpClient oauth, SquareDeviceHttpClient devices,
            SquareCheckoutHttpClient checkouts, SquareRestClient refunds) {
        this.oauth = oauth; this.devices = devices; this.checkouts = checkouts; this.refunds = refunds;
    }
    SquareHttpTerminalGateway(SquareOAuthHttpClient oauth, SquareDeviceHttpClient devices,
            SquareCheckoutHttpClient checkouts) {
        this(oauth, devices, checkouts, null);
    }
    public OAuthToken exchangeCode(String code) { return oauth.exchange(code); }
    public OAuthToken refreshToken(String token) { return oauth.refresh(token); }
    public List<SquareTerminalDtos.SquareLocation> listLocations(String token) {
        return devices.locations(token);
    }
    public DeviceCode createDeviceCode(String token, String key, String location, String name) {
        return devices.create(token, key, location, name);
    }
    public Checkout createCheckout(String token, String requestJson) {
        return checkouts.create(token, requestJson);
    }
    public Checkout getCheckout(String token, String id) { return checkouts.get(token, id); }
    public List<Checkout> searchCheckouts(String token, CheckoutSearch search) {
        return checkouts.search(token, search);
    }
    public Checkout cancelCheckout(String token, String id) { return checkouts.cancel(token, id); }
    public Refund refundPayment(String token, String key, String paymentId, BigDecimal amount, String currency) {
        var root = refunds.post("/v2/refunds", token, Map.of("idempotency_key", key,
            "payment_id", paymentId, "amount_money", Map.of("amount",
                amount.setScale(2, java.math.RoundingMode.UNNECESSARY).movePointRight(2).longValueExact(),
                "currency", currency), "reason", "Full POS ticket return"));
        return refund(root.path("refund"));
    }
    public Refund getRefund(String token, String id) {
        if (!SquareProviderIdentifiers.refund(id))
            throw new IllegalArgumentException("Square refund identifier is invalid.");
        return refund(refunds.get("/v2/refunds/{id}", token, id).path("refund"));
    }
    private Refund refund(com.fasterxml.jackson.databind.JsonNode node) {
        var money = node.path("amount_money");
        if (!money.path("amount").isIntegralNumber())
            throw new SquareGatewayException("Square refund amount is missing.", true, null);
        return new Refund(SquareProviderIdentifiers.text(node.path("id"), 255),
            SquareProviderIdentifiers.text(node.path("payment_id"), 255),
            SquareProviderIdentifiers.text(node.path("status"), 64),
            money.path("amount").decimalValue().movePointLeft(2),
            SquareProviderIdentifiers.text(money.path("currency"), 3));
    }
}
