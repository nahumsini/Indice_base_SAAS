package com.indice.erp.pos.mercadopago;

import java.math.BigDecimal;
import java.time.Instant;

public record MpRefundRecord(long id, long companyId, long intentId,
        String key, BigDecimal amount, BigDecimal baselineAmount,
        String requestJson, String payloadHash, String status,
        Long requestedByUserId, String requestedByRole, String requestedScopeType,
        Long requestedScopeUnitId, Long requestedScopeBusinessId,
        String workLeaseId, Instant workLeaseUntil, int submissionAttempts,
        int recoveryAttempts, Instant nextAttemptAt, String lastErrorCode,
        Instant lastProviderCheckAt, long version) {
}
