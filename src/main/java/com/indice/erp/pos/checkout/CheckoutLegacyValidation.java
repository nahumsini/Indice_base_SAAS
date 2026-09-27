package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CheckoutLegacyValidation {
    private final CheckoutDependencies d;
    private final CheckoutPreparation preparation;
    private final CheckoutSourceOrders orders;
    private final CheckoutDiscountPolicy discounts;
    CheckoutLegacyValidation(CheckoutDependencies d, CheckoutPreparation preparation, CheckoutSourceOrders orders, CheckoutDiscountPolicy discounts) {
        this.d = d;
        this.preparation = preparation;
        this.orders = orders;
        this.discounts = discounts;
    }
    @Transactional(readOnly = true)
    public void validate(PosContext context, PosCheckoutRequest request) {
        var draft = preparation.prepare(context, request);
        discounts.validate(context, request, draft, orders.validate(context, request, draft));
        draft = preparation.payments(context, request, draft);
        preparation.validate(draft);
        d.inventory().requireAvailable(context, draft.shift(), draft.lines());
    }
}
