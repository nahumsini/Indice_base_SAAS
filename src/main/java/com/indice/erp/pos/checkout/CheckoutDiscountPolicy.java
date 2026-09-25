package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.discount.DiscountDtos.RuleResponse;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class CheckoutDiscountPolicy {
    private final CheckoutDependencies dependencies;
    private final CheckoutAggregateDiscountPolicy aggregate;
    CheckoutDiscountPolicy(CheckoutDependencies dependencies, CheckoutAggregateDiscountPolicy aggregate) {
        this.dependencies = dependencies;
        this.aggregate = aggregate;
    }
    List<RuleResponse> validate(PosContext context, PosCheckoutRequest request, CheckoutDraft draft, String channel) {
        var validated = new ArrayList<RuleResponse>(draft.lines().size());
        var evaluation = new CheckoutDiscountEvaluation(context, draft, channel);
        for (var index = 0; index < draft.lines().size(); index++) {
            var line = draft.lines().get(index);
            if (line.discountAmount().compareTo(BigDecimal.ZERO) <= 0) {
                validated.add(null);
                continue;
            }
            var ruleId = request.items().get(index).discountRuleId();
            if (ruleId == null) throw PosApiException.badRequest("A discount rule is required for every discounted item.");
            if (dependencies.discounts() == null) throw PosApiException.badRequest("Discount validation is unavailable.");
            validated.add(dependencies.discounts().requireApplicable(context, ruleId,
                evaluation.request(dependencies, line, line.quantity().multiply(line.unitPrice())),
                line.discountAmount(), evaluation.orderAmount()));
        }
        aggregate.validate(evaluation, validated);
        return validated;
    }
}
