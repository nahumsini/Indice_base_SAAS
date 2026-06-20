package com.indice.erp.pos.payment;

import com.indice.erp.pos.status.PaymentMethod;
import com.indice.erp.pos.status.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentRecord(
        Long id,
        Long companyId,
        Long ticketId,
        Long shiftId,
        Long cashRegisterId,
        PaymentMethod paymentMethod,
        Long paymentAccountId,
        BigDecimal amount,
        String currencyCode,
        String reference,
        PaymentStatus status,
        Instant paidAt,
        Long createdByUserId,
        String metadataJson) {
}
