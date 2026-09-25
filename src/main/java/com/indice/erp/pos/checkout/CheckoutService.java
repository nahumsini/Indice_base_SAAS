package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckoutService {
    private final CheckoutPreparation preparation;
    private final CheckoutSourceOrders orders;
    private final CheckoutDiscountPolicy discounts;
    private final CheckoutPersistence persistence;
    private final CheckoutPreflightValidation preflight;
    private final CheckoutLegacyValidation legacy;
    private final TerminalPaymentGuard guard;
    public CheckoutService(CheckoutPreparation preparation, CheckoutSourceOrders orders, CheckoutDiscountPolicy discounts,
            CheckoutPersistence persistence, CheckoutPreflightValidation preflight, CheckoutLegacyValidation legacy, TerminalPaymentGuard guard) {
        this.preparation = preparation;
        this.orders = orders;
        this.discounts = discounts;
        this.persistence = persistence;
        this.preflight = preflight;
        this.legacy = legacy;
        this.guard = guard;
    }
    @Transactional
    public PosCheckoutResponse checkout(PosContext context, PosCheckoutRequest request) {
        guard.lockRegister(context, request.cashRegisterId());
        guard.assertNoPending(context, request.cashRegisterId());
        return complete(context, request);
    }
    PosCheckoutResponse complete(PosContext context, PosCheckoutRequest request) {
        var draft = preparation.prepare(context, request);
        var channel = orders.validate(context, request, draft);
        var rules = discounts.validate(context, request, draft, channel);
        draft = preparation.payments(context, request, draft);
        preparation.validate(draft);
        return persistence.save(context, request, draft, rules);
    }
    public void validateForCheckout(PosContext context, PosCheckoutRequest request) {
        legacy.validate(context, request);
    }
    public void validateTerminalForCheckout(PosContext context, PosCheckoutRequest request) {
        preflight.terminal(context, request);
    }
}
