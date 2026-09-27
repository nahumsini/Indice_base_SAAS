package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.selfservice.SelfServiceTerminalCheckoutReader;
import com.indice.erp.pos.restaurant.RestaurantTerminalCheckoutReader;
import org.springframework.stereotype.Component;

@Component
class CheckoutTerminalSourceOrders {
    private final SelfServiceTerminalCheckoutReader pretickets;
    private final RestaurantTerminalCheckoutReader restaurants;
    private final PreticketLinePolicy preticketLines;
    private final RestaurantCheckoutLinePolicy restaurantLines;
    CheckoutTerminalSourceOrders(SelfServiceTerminalCheckoutReader pretickets, RestaurantTerminalCheckoutReader restaurants,
            PreticketLinePolicy preticketLines, RestaurantCheckoutLinePolicy restaurantLines) {
        this.pretickets = pretickets;
        this.restaurants = restaurants;
        this.preticketLines = preticketLines;
        this.restaurantLines = restaurantLines;
    }
    String validate(PosContext context, PosCheckoutRequest request, CheckoutDraft draft) {
        if (request.preticketId() != null && request.restaurantOrderId() != null)
            throw PosApiException.badRequest("Checkout accepts either preticketId or restaurantOrderId, not both.");
        if (request.preticketId() != null) {
            preticketLines.validate(request, pretickets.requireClaim(context, request.preticketId(), draft.register()));
            return "KIOSK";
        }
        if (request.restaurantOrderId() != null) {
            restaurantLines.validate(request, restaurants.requireClaim(context, request.restaurantOrderId(), draft.register().id(), draft.shift().id()));
            return "RESTAURANT";
        }
        return "POS";
    }
}
