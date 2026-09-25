package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import org.springframework.stereotype.Component;

@Component
class CheckoutPreparation {
    private final CheckoutDependencies dependencies;
    CheckoutPreparation(CheckoutDependencies dependencies) {
        this.dependencies = dependencies;
    }
    CheckoutDraft prepare(PosContext context, PosCheckoutRequest request) {
        var d = dependencies;
        d.validator().validateRequest(request);
        var register = d.cashRegisters().requireOperationalRegister(context, request.cashRegisterId());
        var shift = d.shifts().findOpenByUserAndRegister(context, register.id()).orElse(null);
        d.validator().requireOpenShift(context, shift, register);
        var currency = CheckoutCalculator.normalizeCurrency(request.currencyCode());
        if (!CheckoutCalculator.normalizeCurrency(shift.currencyCode()).equals(currency)) {
            throw PosApiException.badRequest("Checkout currency must match the open shift currency.");
        }
        var customer = request.customerId() == null ? null : d.lookup().findCustomer(context, request.customerId())
            .orElseThrow(() -> PosApiException.badRequest("Customer does not belong to this company."));
        var lines = d.calculator().lines(request.items(), currency, id -> id == null ? null
            : d.lookup().findProduct(context, id)
                .orElseThrow(() -> PosApiException.badRequest("Product does not belong to this company.")));
        return new CheckoutDraft(register, shift, currency, customer, lines, null, null);
    }
    CheckoutDraft payments(PosContext context, PosCheckoutRequest request, CheckoutDraft draft) {
        var payments = dependencies.calculator().payments(request.payments(), draft.currency());
        if (dependencies.settlement() != null) {
            payments = dependencies.settlement().resolveCheckoutPayments(context, draft.register(), draft.currency(), payments);
        }
        return new CheckoutDraft(draft.register(), draft.shift(), draft.currency(), draft.customer(), draft.lines(),
            payments, dependencies.calculator().totals(draft.lines(), payments));
    }
    void validate(CheckoutDraft draft) {
        dependencies.validator().validateLines(draft.lines());
        dependencies.validator().validatePayments(draft.payments());
        dependencies.validator().validateTotals(draft.totals());
    }
}
