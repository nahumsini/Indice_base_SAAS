package com.indice.erp.finance.terminalrefunds;

import java.math.BigDecimal;
import java.time.Instant;

public record TerminalRefundAdjustment(long id, long companyId, long reversalId,
        String providerCode, long intentId, String providerPaymentId, String providerRefundId,
        long ticketId, String ticketNumber, Long paymentId, long shiftId, long closingId,
        Long settlementId, String settlementState, Long paymentAccountId, String paymentAccountName,
        Long unitId, Long businessId, BigDecimal amount, String currencyCode, String state,
        String approvalReason, String postingBalance, Long treasuryMovementId,
        String failureCode, String failureMessage, Instant createdAt, Instant approvedAt,
        Instant postedAt, long version) {
}
