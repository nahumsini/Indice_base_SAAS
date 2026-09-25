package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutPaymentRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.shift.ShiftRecord;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentRequestPreparer {
    private final SquarePaymentDraftDependencies d;
    private final SquarePaymentDraftInputs inputs;
    private final SquarePaymentDraftAmount amounts;
    SquarePaymentRequestPreparer(SquarePaymentDraftDependencies d, SquarePaymentDraftInputs inputs, SquarePaymentDraftAmount amounts) {
        this.d = d;
        this.inputs = inputs;
        this.amounts = amounts;
    }
    Draft prepare(PosContext context, SquareTerminalDtos.CreatePaymentRequest request) {
        var register = d.cashRegisters().requireOperationalRegister(context, request.cashRegisterId());
        var shift = d.shifts().findOpenByUserAndRegister(context, register.id()).orElse(null);
        d.validator().requireOpenShift(context, shift, register);
        var json = inputs.json(request);
        var currency = inputs.currency(request.currencyCode());
        var amount = amounts.total(context, request, currency);
        var checkout = new PosCheckoutRequest(request.cashRegisterId(), request.customerId(), request.preticketId(),
            request.restaurantOrderId(), currency, request.items(),
            List.of(new PosCheckoutPaymentRequest("CARD", null, amount, "Square preflight")), request.notes());
        d.checkout().validateTerminalForCheckout(context, checkout);
        return new Draft(shift, json, SquareHashing.sha256(json), amount, currency, inputs.key(request.idempotencyKey()));
    }
    record Draft(ShiftRecord shift, String checkoutJson, String payloadHash,
        BigDecimal amount, String currencyCode, String idempotencyKey) {}
}
