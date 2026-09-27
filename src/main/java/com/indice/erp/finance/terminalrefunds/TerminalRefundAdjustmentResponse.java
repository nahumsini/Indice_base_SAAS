package com.indice.erp.finance.terminalrefunds;

import java.math.BigDecimal;
import java.time.Instant;

public record TerminalRefundAdjustmentResponse(long id, String providerCode,
        String providerPaymentId, String providerRefundId, long ticketId, String ticketNumber,
        long shiftId, long closingId, Long paymentAccountId, String paymentAccountName,
        BigDecimal amount, String currencyCode, String state, String approvalReason,
        String postingBalance, String failureCode, String failureMessage,
        Instant createdAt, Instant approvedAt, Instant postedAt, long version) {
    static TerminalRefundAdjustmentResponse from(TerminalRefundAdjustment value) {
        return new TerminalRefundAdjustmentResponse(value.id(), value.providerCode(), value.providerPaymentId(),
            value.providerRefundId(), value.ticketId(), value.ticketNumber(), value.shiftId(), value.closingId(),
            value.paymentAccountId(), value.paymentAccountName(), value.amount(), value.currencyCode(), value.state(),
            value.approvalReason(), value.postingBalance(), value.failureCode(), value.failureMessage(),
            value.createdAt(), value.approvedAt(), value.postedAt(), value.version());
    }
}
