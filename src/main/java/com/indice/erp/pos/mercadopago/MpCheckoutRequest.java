package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.checkout.dto.PosCheckoutPaymentRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import java.math.BigDecimal;
import java.util.List;

public final class MpCheckoutRequest {
    private MpCheckoutRequest() {
    }

    public static PosCheckoutRequest from(MpCreatePayment request,
            BigDecimal amount, String reference) {
        return new PosCheckoutRequest(request.cashRegisterId(), request.customerId(),
            request.preticketId(), request.restaurantOrderId(), "MXN", request.items(),
            List.of(new PosCheckoutPaymentRequest("CARD", null, amount, reference)), request.notes());
    }
}
