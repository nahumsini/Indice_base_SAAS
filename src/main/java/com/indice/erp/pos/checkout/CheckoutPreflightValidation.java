package com.indice.erp.pos.checkout;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

@Service
class CheckoutPreflightValidation {
    private final CheckoutDependencies d;
    private final CheckoutPreparation preparation;
    private final CheckoutTerminalSourceOrders orders;
    private final CheckoutDiscountPolicy discounts;
    private final CheckoutTerminalPayments terminalPayments;
    CheckoutPreflightValidation(CheckoutDependencies d, CheckoutPreparation preparation, CheckoutTerminalSourceOrders orders,
            CheckoutDiscountPolicy discounts, CheckoutTerminalPayments terminalPayments) {
        this.d = d;
        this.preparation = preparation;
        this.orders = orders;
        this.discounts = discounts;
        this.terminalPayments = terminalPayments;
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void terminal(PosContext context, PosCheckoutRequest request) {
        try {
            finish(context, terminalPayments.prepare(context, request, base(context, request)));
        } catch (FinanceApiException invalidAccount) {
            throw PosApiException.conflict("The terminal settlement destination account is not eligible.");
        }
    }
    private CheckoutDraft base(PosContext context, PosCheckoutRequest request) {
        var draft = preparation.prepare(context, request);
        discounts.validate(context, request, draft, orders.validate(context, request, draft));
        return draft;
    }
    private void finish(PosContext context, CheckoutDraft draft) {
        preparation.validate(draft);
        d.inventory().requireAvailable(context, draft.shift(), draft.lines());
    }
}
