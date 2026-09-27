package com.indice.erp.pos.square;
import java.math.BigDecimal;
import java.time.Instant;

final class SquareRecords {

    private SquareRecords() {
    }
    record Connection(long id, long companyId, String merchantId, String accessToken,
                      String refreshToken, Instant tokenExpiresAt, long tokenVersion) {
        Connection(long id, long companyId, String merchantId, String accessToken,
                String refreshToken, Instant tokenExpiresAt) {
            this(id, companyId, merchantId, accessToken, refreshToken, tokenExpiresAt, 0);
        }
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
                         String squareRequestJson,
                         String failureMessage, Long posTicketId, long createdByUserId,
                         String createdByRole, String scopeType, Long scopeUnitId, Long scopeBusinessId,
                         Instant createdAt, Instant updatedAt, Instant expiresAt) {
        PaymentIntent(long id,long company,long register,long shift,long terminal,String location,String device,
                String key,String checkout,String payment,SquareTerminalPaymentStatus status,BigDecimal amount,String currency,
                String hash,String checkoutJson,String failure,Long ticket,long user,String role,String scope,Long unit,Long business,
                Instant created,Instant updated,Instant expires) {
            this(id,company,register,shift,terminal,location,device,key,checkout,payment,status,amount,currency,hash,
                checkoutJson,null,failure,ticket,user,role,scope,unit,business,created,updated,expires);
        }
    }

    record GatewayStatus(String squareCheckoutId, String squarePaymentId,
                         SquareTerminalPaymentStatus status, String rawJson,
                         String failureCode, String failureMessage) {
    }
}
