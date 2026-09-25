package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import org.springframework.stereotype.Component;

@Component
class CheckoutSalesSummaryWriter {
    private final CheckoutDependencies dependencies;
    CheckoutSalesSummaryWriter(CheckoutDependencies dependencies) {
        this.dependencies = dependencies;
    }
    long insert(PosContext context, PosCheckoutRequest request, CheckoutDraft draft, String number, boolean inventory) {
        var shift = draft.shift();
        var totals = draft.totals();
        var payments = draft.payments();
        var method = payments.size() == 1 ? payments.getFirst().paymentMethod().name() : "MIXED";
        var reference = payments.stream().map(CheckoutPayment::reference).filter(value -> value != null && !value.isBlank())
            .findFirst().map(value -> CheckoutText.truncate(value, 120)).orElse(null);
        return dependencies.sales().insert(context, new SalesRecordSummaryCommand(
            shift.unitId(), shift.businessId(), number, CheckoutText.customerName(draft.customer()), context.userName(),
            totals.totalAmount(), totals.subtotalAmount(), totals.discountAmount(), totals.taxAmount(),
            draft.lines().getFirst().currencyCode(), method, reference,
            PosJsonSupport.toJson(dependencies.inventory().salesLineSnapshots(context, shift, draft.lines())),
            CheckoutText.trim(request.notes()), CheckoutText.metadata(inventory), inventory));
    }
}
