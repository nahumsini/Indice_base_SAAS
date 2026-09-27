package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.discount.DiscountDtos.EvaluationRequest;
import java.math.BigDecimal;

record CheckoutDiscountEvaluation(PosContext context, CheckoutDraft draft, String channel) {
    EvaluationRequest request(CheckoutDependencies dependencies, CheckoutLine line, BigDecimal baseAmount) {
        var product = line.productId() == null ? null : dependencies.lookup().findProduct(context, line.productId()).orElse(null);
        var register = draft.register();
        return new EvaluationRequest(channel, baseAmount, line.productId(), product == null ? null : product.category(),
            draft.customer() == null ? null : draft.customer().customerType(), "ORDER", draft.currency(),
            register.warehouseId(), register.unitId(), register.businessId());
    }
    BigDecimal orderAmount() {
        return draft.lines().stream().map(line -> line.quantity().multiply(line.unitPrice()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
