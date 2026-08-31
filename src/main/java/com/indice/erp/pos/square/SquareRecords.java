package com.indice.erp.pos.square;

import java.math.BigDecimal;
import java.time.Instant;

final class SquareRecords {

    private SquareRecords() {
    }

    record Connection(long id, long companyId, String merchantId, String accessToken,
                      String refreshToken, Instant tokenExpiresAt) {
    }

    record Location(long id, long companyId, String squareLocationId, String name,
                    String currencyCode, String countryCode) {
    }

    record Terminal(long id, long companyId, long locationRowId, String squareLocationId,
                    String deviceCodeId, String deviceId, String name, String status,
                    Long assignedRegisterId) {
    }

    record PaymentIntent(long id, long companyId, long cashRegisterId, long shiftId,
                         long terminalId, String squareLocationId, String squareDeviceId,
                         String idempotencyKey, String squareCheckoutId, String squarePaymentId,
                         SquareTerminalPaymentStatus status, BigDecimal amount, String currencyCode,
                         String checkoutPayloadSha256, String checkoutRequestJson,
                         String failureMessage, Long posTicketId, long createdByUserId,
                         String createdByRole, String scopeType, Long scopeUnitId, Long scopeBusinessId,
                         Instant createdAt, Instant updatedAt, Instant expiresAt) {
    }

    record GatewayStatus(String squareCheckoutId, String squarePaymentId,
                         SquareTerminalPaymentStatus status, String rawJson,
                         String failureCode, String failureMessage) {
    }
}
