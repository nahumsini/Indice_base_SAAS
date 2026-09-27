package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.time.Clock;
import java.time.Duration;
import org.springframework.stereotype.Component;

@Component
public record MpRefundEligibility(MpMerchantTokens tokens, Clock clock) {
    public void require(MpIntent intent) {
        var connection = tokens.connection(intent.companyId());
        if (connection.id() != intent.connectionId() || !connection.sellerId().equals(intent.sellerId())
                || !connection.environment().equals(intent.environment())) {
            throw PosApiException.conflict("The original merchant connection is required for this refund.");
        }
        if (intent.refundPending() && !intent.status().equals("PARTIALLY_REFUNDED")) {
            throw PosApiException.conflict("Verify the outstanding provider refund before continuing.");
        }
        if (!clock.instant().isBefore(intent.createdAt().plus(Duration.ofDays(90)))) {
            throw PosApiException.conflict("This payment is outside the supported refund period.");
        }
    }
}
