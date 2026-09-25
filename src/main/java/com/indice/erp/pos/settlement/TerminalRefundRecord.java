package com.indice.erp.pos.settlement;

import java.math.BigDecimal;

public record TerminalRefundRecord(long companyId, String providerCode, long intentId,
        Long ticketId, String providerPaymentId, long shiftId, BigDecimal amount,
        BigDecimal cumulativeAmount, String currencyCode, String providerRefundId) {
}
