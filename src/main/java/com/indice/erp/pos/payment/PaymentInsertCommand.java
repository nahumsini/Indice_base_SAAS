package com.indice.erp.pos.payment;

import com.indice.erp.pos.status.PaymentMethod;
import com.indice.erp.pos.status.PaymentStatus;
import java.math.BigDecimal;

public record PaymentInsertCommand(
        Long shiftId,
        Long cashRegisterId,
        PaymentMethod paymentMethod,
        Long paymentAccountId,
        BigDecimal amount,
        String currencyCode,
        String reference,
        PaymentStatus status,
        Long createdByUserId,
        String metadataJson) {
}
