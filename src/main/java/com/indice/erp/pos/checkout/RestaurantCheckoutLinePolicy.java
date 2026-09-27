package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.RestaurantCheckoutOrder;
import java.util.Objects;
import java.util.stream.IntStream;
import org.springframework.stereotype.Component;

@Component
class RestaurantCheckoutLinePolicy {
    void validate(PosCheckoutRequest request, RestaurantCheckoutOrder order) {
        if (!CheckoutCalculator.normalizeCurrency(order.currencyCode()).equals(CheckoutCalculator.normalizeCurrency(request.currencyCode())))
            throw PosApiException.badRequest("Restaurant order currency does not match checkout currency.");
        if (request.items().size() != order.items().size())
            throw PosApiException.badRequest("Restaurant order items cannot be added or removed before checkout.");
        var matched = new boolean[request.items().size()];
        for (var source : order.items()) {
            var match = IntStream.range(0, request.items().size()).filter(index -> !matched[index])
                .filter(index -> Objects.equals(request.items().get(index).productId(), source.productId()))
                .filter(index -> CheckoutText.sameMoney(request.items().get(index).quantity(), source.quantity()))
                .filter(index -> CheckoutText.sameMoney(request.items().get(index).unitPrice(), source.unitPrice())).findFirst();
            if (match.isEmpty()) throw PosApiException.badRequest("Restaurant order quantities and prices cannot be changed before checkout.");
            matched[match.getAsInt()] = true;
        }
    }
}
