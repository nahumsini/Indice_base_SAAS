package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Pure preparation uses the existing calculators, stock and source order contracts. */
@Service
public class CheckoutAssistantPreparation {
    private final CheckoutDependencies d;
    private final CheckoutPreparation preparation;
    private final CheckoutTerminalSourceOrders orders;
    private final CheckoutDiscountPolicy discounts;
    private final CheckoutTerminalPayments terminal;
    public CheckoutAssistantPreparation(CheckoutDependencies d,CheckoutPreparation preparation,
            CheckoutTerminalSourceOrders orders,CheckoutDiscountPolicy discounts,CheckoutTerminalPayments terminal) {
        this.d=d;this.preparation=preparation;this.orders=orders;this.discounts=discounts;this.terminal=terminal;
    }
    @Transactional(readOnly=true)
    public Draft prepare(PosContext context,PosCheckoutRequest request,boolean providerCard) {
        var base=preparation.prepare(context,request,false);
        String channel=orders.validate(context,request,base);
        var rules=discounts.validate(context,request,base,channel);
        CheckoutDraft draft;
        if(providerCard)draft=terminal.prepare(context,request,base);
        else {
            var payments=d.settlement().previewCheckoutPayments(context,base.register(),base.currency(),
                d.calculator().payments(request.payments(),base.currency()));
            draft=new CheckoutDraft(base.register(),base.shift(),base.currency(),base.customer(),base.lines(),payments,d.calculator().totals(base.lines(),payments));
        }
        preparation.validate(draft);d.inventory().requireAvailable(context,draft.shift(),draft.lines());
        return new Draft(draft.register().id(),draft.shift().id(),draft.shift().warehouseId(),draft.currency(),
            channel,draft.lines(),draft.payments(),draft.totals(),rules.stream().filter(java.util.Objects::nonNull).map(r->r.id()+":"+r.version()).toList());
    }
    public record Draft(long cashRegisterId,long shiftId,Long warehouseId,String currency,String channel,
        List<CheckoutLine> items,List<CheckoutPayment> payments,CheckoutTotals totals,List<String> discountVersions) {}
}
