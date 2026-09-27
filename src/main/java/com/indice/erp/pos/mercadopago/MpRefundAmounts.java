package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

@Component
public class MpRefundAmounts {
    public BigDecimal requested(MpRefundRequest request, BigDecimal remaining) {
        try {
            var amount = (request.amount() == null ? remaining : request.amount())
                .setScale(2, RoundingMode.UNNECESSARY);
            if (amount.signum() <= 0 || amount.compareTo(remaining) > 0) {
                throw PosApiException.badRequest("Refund amount exceeds the remaining payment.");
            }
            return amount;
        } catch (ArithmeticException exception) {
            throw PosApiException.badRequest("MXN refund amounts require at most two decimal places.");
        }
    }
}
