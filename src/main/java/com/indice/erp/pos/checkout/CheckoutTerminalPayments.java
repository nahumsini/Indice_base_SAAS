package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.settlement.TerminalSettlementPaymentPolicy;
import org.springframework.stereotype.Component;

@Component
class CheckoutTerminalPayments {
    private final CheckoutDependencies d;
    private final TerminalSettlementPaymentPolicy policy;
    CheckoutTerminalPayments(CheckoutDependencies dependencies, TerminalSettlementPaymentPolicy policy) {
        this.d = dependencies;
        this.policy = policy;
    }
    CheckoutDraft prepare(PosContext context, PosCheckoutRequest request, CheckoutDraft draft) {
        var payments = policy.resolve(context, draft.register(), draft.currency(), d.calculator().payments(request.payments(), draft.currency()));
        return new CheckoutDraft(draft.register(), draft.shift(), draft.currency(), draft.customer(), draft.lines(),
            payments, d.calculator().totals(draft.lines(), payments));
    }
}
