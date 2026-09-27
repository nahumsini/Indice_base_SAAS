package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.checkout.CheckoutCalculator;
import com.indice.erp.pos.checkout.CheckoutLookupRepository;
import com.indice.erp.pos.checkout.CheckoutService;
import com.indice.erp.pos.shift.ShiftRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

@Component
public record MpPaymentPreflight(CashRegisterService registers, ShiftRepository shifts,
        CheckoutCalculator calculator, CheckoutLookupRepository lookup,
        CheckoutService checkout, MpJson json) {
    public MpPaymentDraft prepare(PosContext context, MpCreatePayment request) {
        var register = registers.requireOperationalRegister(context, request.cashRegisterId());
        var shift = shifts.findOpenByUserAndRegister(context, register.id())
            .orElseThrow(() -> PosApiException.conflict("An open shift is required."));
        var lines = calculator.lines(request.items(), "MXN", id -> id == null ? null
            : lookup.findProduct(context, id).orElseThrow(() -> PosApiException.badRequest(
                "Product does not belong to this company.")));
        var total = lines.stream().map(line -> line.lineTotalAmount())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal amount;
        try {
            amount = total.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw PosApiException.badRequest("MXN payment total must have at most two decimal places.");
        }
        if (amount.signum() <= 0) throw PosApiException.badRequest("Payment amount must be positive.");
        checkout.validateTerminalForCheckout(context, MpCheckoutRequest.from(request, amount, "Point preflight"));
        return new MpPaymentDraft(shift, amount, json.write(request));
    }
}
