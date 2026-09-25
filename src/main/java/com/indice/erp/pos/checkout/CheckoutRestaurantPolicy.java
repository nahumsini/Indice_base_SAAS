package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import org.springframework.stereotype.Component;

@Component
class CheckoutRestaurantPolicy {
    private final CheckoutDependencies dependencies;
    private final RestaurantCheckoutLinePolicy lines;
    CheckoutRestaurantPolicy(CheckoutDependencies dependencies, RestaurantCheckoutLinePolicy lines) {
        this.dependencies = dependencies;
        this.lines = lines;
    }
    boolean validate(PosContext context, PosCheckoutRequest request, CheckoutDraft draft) {
        if (request.restaurantOrderId() == null) return false;
        if (dependencies.restaurants() == null) throw PosApiException.conflict("Restaurant checkout is unavailable.");
        var order = dependencies.restaurants().requireClaimedForCheckout(context, request.restaurantOrderId(), draft.register().id());
        lines.validate(request, order);
        return true;
    }
    void complete(PosContext context, PosCheckoutRequest request, CheckoutDraft draft, long ticketId) {
        if (request.restaurantOrderId() == null) return;
        if (dependencies.restaurants() == null) throw PosApiException.conflict("Restaurant checkout is unavailable.");
        dependencies.restaurants().completeCheckout(context, request.restaurantOrderId(), draft.register().id(), ticketId);
    }
}
