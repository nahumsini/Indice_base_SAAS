package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.math.*;
import org.springframework.stereotype.Component;

@Component
class SquareRefundAmounts {
    BigDecimal requested(BigDecimal requested, BigDecimal remaining) {
        var amount = normalize(requested == null ? remaining : requested);
        if (amount.signum() <= 0 || amount.compareTo(remaining) > 0)
            throw PosApiException.badRequest("Square refund amount exceeds the confirmed remaining payment.");
        return amount;
    }
    BigDecimal normalize(BigDecimal amount) {
        try {
            var normalized = amount.setScale(2, RoundingMode.UNNECESSARY);
            normalized.movePointRight(2).longValueExact();
            return normalized;
        }
        catch (RuntimeException invalid) {
            throw PosApiException.badRequest("Square refund amount is outside supported two-decimal minor units.");
        }
    }
}
