package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.math.BigDecimal;
import java.time.Instant;

public record MpIntent(long id, long companyId, long cashRegisterId, long shiftId,
        long terminalId, long connectionId, String providerTerminalId,
        String sellerId, String environment, String idempotencyKey,
        String externalReference, String status, BigDecimal amount,
        String currencyCode, String payloadHash, String checkoutJson,
        String providerRequestJson, String orderId, String paymentId,
        String message, Long posTicketId, long createdByUserId,
        String createdByRole, String scopeType, Long scopeUnitId,
        Long scopeBusinessId, Instant createdAt, Instant expiresAt,
        long version, Instant dispatchedAt, String providerState, boolean refundPending) {
    public PosContext context() {
        return new PosContext(createdByUserId, companyId, "", createdByRole, true,
            new PosScope(PosScope.Type.valueOf(scopeType), scopeUnitId, scopeBusinessId));
    }

    public boolean pending() {
        return posTicketId == null && (status.equals("WAITING")
            || status.equals("UNCERTAIN") || status.equals("APPROVED")
            || status.equals("PARTIALLY_REFUNDED") || status.equals("RECONCILIATION_REQUIRED"));
    }
}
