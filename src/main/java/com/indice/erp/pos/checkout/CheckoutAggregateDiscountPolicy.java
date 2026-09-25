package com.indice.erp.pos.checkout;

import com.indice.erp.pos.discount.DiscountDtos.RuleResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.stream.IntStream;
import org.springframework.stereotype.Component;

@Component
class CheckoutAggregateDiscountPolicy {
    private final CheckoutDependencies dependencies;
    CheckoutAggregateDiscountPolicy(CheckoutDependencies dependencies) {
        this.dependencies = dependencies;
    }
    void validate(CheckoutDiscountEvaluation evaluation, List<RuleResponse> rules) {
        for (var id : rules.stream().filter(Objects::nonNull).map(RuleResponse::id).distinct().toList()) {
            var indexes = IntStream.range(0, rules.size())
                .filter(index -> rules.get(index) != null && rules.get(index).id() == id).boxed().toList();
            var lines = evaluation.draft().lines();
            var base = indexes.stream().map(lines::get).map(line -> line.quantity().multiply(line.unitPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            var discount = indexes.stream().map(lines::get).map(CheckoutLine::discountAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            dependencies.discounts().requireApplicable(evaluation.context(), id,
                evaluation.request(dependencies, lines.get(indexes.getFirst()), base), discount, evaluation.orderAmount());
        }
    }
}
