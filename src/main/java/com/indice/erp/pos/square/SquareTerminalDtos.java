package com.indice.erp.pos.square;

import com.indice.erp.pos.checkout.dto.PosCheckoutItemRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class SquareTerminalDtos {

    private SquareTerminalDtos() {
    }

    public record OAuthStartResponse(String authorizationUrl) {
    }

    public record OAuthCallbackResponse(boolean connected, String merchantId) {
    }

    public record SquareLocation(String id, String name, String currencyCode, String countryCode) {
    }

    public record LinkLocationRequest(@NotBlank String squareLocationId) {
    }

    public record PairTerminalRequest(@NotBlank String squareLocationId, String name) {
    }

    public record PairTerminalResponse(
        long terminalId,
        String deviceCodeId,
        String pairingCode,
        Instant pairBy
    ) {
    }

    public record AssignTerminalRequest(@NotNull Long terminalId) {
    }

    public record TerminalResponse(
        long terminalId,
        String name,
        String squareDeviceId,
        String squareLocationId,
        String status,
        Long assignedRegisterId
    ) {
    }

    public record CreatePaymentRequest(
        @NotBlank String idempotencyKey,
        @NotNull Long cashRegisterId,
        Long customerId,
        Long preticketId,
        Long restaurantOrderId,
        @NotBlank String currencyCode,
        @NotEmpty List<@Valid PosCheckoutItemRequest> items,
        String notes
    ) {
    }

    public record PaymentIntentResponse(
        long intentId,
        String status,
        BigDecimal amount,
        String currencyCode,
        String squareCheckoutId,
        String squarePaymentId,
        String message,
        Long posTicketId,
        PosCheckoutResponse checkout
    ) {
    }

    public record PaymentIntentListResponse(List<PaymentIntentResponse> items) {
    }
}
