package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public record MpPaymentIdentity(MpJson json) {
    public String hash(MpCreatePayment request) {
        if (request.idempotencyKey() == null
                || !request.idempotencyKey().matches("[A-Za-z0-9_-]{1,64}")) {
            throw PosApiException.badRequest("Payment idempotency key is invalid.");
        }
        var currency = request.currencyCode() == null ? ""
            : request.currencyCode().trim().toUpperCase(Locale.ROOT);
        if (!"MXN".equals(currency)) {
            throw PosApiException.badRequest("Mercado Pago Point requires MXN.");
        }
        return json.hash(json.write(new MpCreatePayment(null, request.cashRegisterId(),
            request.customerId(), request.preticketId(), request.restaurantOrderId(),
            currency, request.items(), request.notes())));
    }
}
