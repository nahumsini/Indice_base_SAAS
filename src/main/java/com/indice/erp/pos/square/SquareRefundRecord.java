package com.indice.erp.pos.square;

import java.math.BigDecimal;
import java.time.Instant;

public record SquareRefundRecord(long id, long companyId, long intentId, String key,
        BigDecimal amount, BigDecimal baselineAmount, String currencyCode,
        String requestJson, String payloadHash, String reason, String environment,
        String merchantId, String providerRefundId, String evidenceJson, String status,
        Long requestedByUserId, String requestedByRole, String requestedScopeType,
        Long requestedScopeUnitId, Long requestedScopeBusinessId, String workLeaseId,
        Instant workLeaseUntil, int submissionAttempts, int manualReplayAttempts, int recoveryAttempts,
        Instant nextAttemptAt, String lastErrorCode, Instant lastProviderCheckAt, long version) {
}
