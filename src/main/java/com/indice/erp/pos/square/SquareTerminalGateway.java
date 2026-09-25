package com.indice.erp.pos.square;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface SquareTerminalGateway {

    OAuthToken exchangeCode(String code);

    OAuthToken refreshToken(String refreshToken);

    List<SquareTerminalDtos.SquareLocation> listLocations(String accessToken);

    DeviceCode createDeviceCode(String accessToken, String idempotencyKey, String locationId, String name);

    Checkout createCheckout(String accessToken, String persistedRequestJson);

    Checkout getCheckout(String accessToken, String checkoutId);

    List<Checkout> searchCheckouts(String accessToken, CheckoutSearch search);

    Checkout cancelCheckout(String accessToken, String checkoutId);

    record OAuthToken(String merchantId, String accessToken, String refreshToken, Instant expiresAt) {
    }

    record DeviceCode(String id, String code, String status, String deviceId, Instant pairBy) {
    }

    record CheckoutCommand(String idempotencyKey, String checkoutId, String deviceId,
                           BigDecimal amount, String currencyCode, String note) {
    }

    record CheckoutSearch(String deviceId, Instant startAt, Instant endAt) {
    }

    record Checkout(String id, String status, String paymentId, String cancelReason,
                    String rawJson, String requestJson) {
    }
}
