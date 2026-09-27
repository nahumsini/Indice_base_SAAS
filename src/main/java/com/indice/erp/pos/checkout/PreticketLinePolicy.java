package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketResponse;
import java.math.BigDecimal;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class PreticketLinePolicy {
    void validate(PosCheckoutRequest request, PreticketResponse source) {
        if (!CheckoutCalculator.normalizeCurrency(source.currencyCode())
                .equals(CheckoutCalculator.normalizeCurrency(request.currencyCode()))) {
            throw PosApiException.badRequest("Preticket currency does not match checkout currency.");
        }
        if (request.items().size() != source.items().size()) {
            throw PosApiException.badRequest("Preticket items cannot be added or removed before checkout.");
        }
        var submitted = request.items().stream().collect(Collectors.toMap(
            item -> item.productId() == null ? -1L : item.productId(), item -> item,
            (first, second) -> { throw PosApiException.badRequest("Preticket products cannot be duplicated."); }));
        var discount = BigDecimal.ZERO;
        for (var item : source.items()) {
            var candidate = submitted.get(item.productId());
            if (candidate == null || !CheckoutText.sameMoney(candidate.quantity(), item.quantity())
                    || !CheckoutText.sameMoney(candidate.unitPrice(), item.unitPrice())) {
                throw PosApiException.badRequest("Preticket quantities and prices cannot be changed before checkout.");
            }
            discount = discount.add(candidate.discountAmount() == null ? BigDecimal.ZERO : candidate.discountAmount());
            if (source.discountRuleId() == null) {
                if (!CheckoutText.sameMoney(candidate.discountAmount(), item.discountAmount())
                        || !Objects.equals(candidate.discountRuleId(), item.discountRuleId())) {
                    throw PosApiException.badRequest("Preticket discounts cannot be changed before checkout.");
                }
            } else if (!Objects.equals(candidate.discountRuleId(), source.discountRuleId())) {
                throw PosApiException.badRequest("Preticket order discount must remain on every line.");
            }
        }
        if (source.discountRuleId() != null && !CheckoutText.sameMoney(discount, source.discountAmount())) {
            throw PosApiException.badRequest("Preticket order discount total cannot be changed before checkout.");
        }
    }
}
