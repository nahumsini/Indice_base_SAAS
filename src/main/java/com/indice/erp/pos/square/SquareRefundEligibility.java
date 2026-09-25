package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.time.*;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
record SquareRefundEligibility(Clock clock) {
    void require(SquareRecords.PaymentIntent intent) {
        if (!Set.of(SquareTerminalPaymentStatus.APPROVED,
                SquareTerminalPaymentStatus.PARTIALLY_REFUNDED).contains(intent.status())
                || intent.squarePaymentId() == null || intent.squarePaymentId().isBlank()) {
            throw PosApiException.conflict("A verified completed Square payment is required.");
        }
        if (intent.createdAt() == null || !clock.instant().isBefore(intent.createdAt().plus(Duration.ofDays(90))))
            throw PosApiException.conflict("This Square payment is outside the supported refund period.");
        if ("JPY".equals(intent.currencyCode()))
            throw PosApiException.conflict("Square JPY refunds require certified currency exponent support.");
        SquareCheckoutIdentityPolicy.requireMinorUnits(intent.amount());
    }
}
