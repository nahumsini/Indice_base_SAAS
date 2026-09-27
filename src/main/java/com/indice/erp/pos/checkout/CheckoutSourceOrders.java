package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import org.springframework.stereotype.Component;

@Component
class CheckoutSourceOrders {
    private final CheckoutPreticketPolicy pretickets;
    private final CheckoutRestaurantPolicy restaurants;
    CheckoutSourceOrders(CheckoutPreticketPolicy pretickets, CheckoutRestaurantPolicy restaurants) {
        this.pretickets = pretickets;
        this.restaurants = restaurants;
    }
    String validate(PosContext context, PosCheckoutRequest request, CheckoutDraft draft) {
        if (request.preticketId() != null && request.restaurantOrderId() != null) {
            throw PosApiException.badRequest("Checkout accepts either preticketId or restaurantOrderId, not both.");
        }
        var preticket = pretickets.validate(context, request, draft);
        return restaurants.validate(context, request, draft) ? "RESTAURANT" : preticket ? "KIOSK" : "POS";
    }
    void complete(PosContext context, PosCheckoutRequest request, CheckoutDraft draft, long ticketId) {
        pretickets.complete(context, request, draft, ticketId);
        restaurants.complete(context, request, draft, ticketId);
    }
}
