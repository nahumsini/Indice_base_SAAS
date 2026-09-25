package com.indice.erp.pos.square;

import java.math.BigDecimal;
import java.time.Instant;

final class SquareRefundFixtures {
    private SquareRefundFixtures() {}
    static SquareRecords.PaymentIntent intent() {
        var now = Instant.parse("2026-09-01T00:00:00Z");
        return new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1",
            "pay-key", "checkout-1", "payment-1", SquareTerminalPaymentStatus.APPROVED,
            new BigDecimal("10.50"), "CAD", "hash", "{}", null, 501L, 11L, "admin",
            "CORPORATE_OFFICE", null, null, now, now, now.plusSeconds(300));
    }
    static SquareRefundRecord refund(String status, String providerId, String lease) {
        return refund(status, providerId, lease, 0, 0, 0, 4L);
    }
    static SquareRefundRecord refund(String status, String providerId, String lease,
            int submissions, int manual, int recoveries, long version) {
        return new SquareRefundRecord(71L, 7L, 91L, "refund_key", new BigDecimal("2.50"),
            BigDecimal.ZERO, "CAD", "{\"idempotency_key\":\"refund_key\"}", "hash", "Return",
            "sandbox", "merchant-1", providerId, null, status, 11L, "admin",
            "CORPORATE_OFFICE", null, null, lease, null, submissions, manual, recoveries,
            Instant.parse("2026-09-01T00:00:00Z"), null, null, version);
    }
    static SquareRefundRecord request(SquareRefundRecord value,String json,String hash) {
        return new SquareRefundRecord(value.id(),value.companyId(),value.intentId(),value.key(),
            value.amount(),value.baselineAmount(),value.currencyCode(),json,hash,value.reason(),
            value.environment(),value.merchantId(),value.providerRefundId(),value.evidenceJson(),value.status(),
            value.requestedByUserId(),value.requestedByRole(),value.requestedScopeType(),
            value.requestedScopeUnitId(),value.requestedScopeBusinessId(),value.workLeaseId(),
            value.workLeaseUntil(),value.submissionAttempts(),value.manualReplayAttempts(),
            value.recoveryAttempts(),value.nextAttemptAt(),value.lastErrorCode(),
            value.lastProviderCheckAt(),value.version());
    }
}
