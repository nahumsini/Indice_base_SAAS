package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import org.springframework.stereotype.Component;

@Component
class CheckoutPreticketPolicy {
    private final CheckoutDependencies dependencies;
    private final PreticketLinePolicy lines;
    CheckoutPreticketPolicy(CheckoutDependencies dependencies, PreticketLinePolicy lines) {
        this.dependencies = dependencies;
        this.lines = lines;
    }
    boolean validate(PosContext context, PosCheckoutRequest request, CheckoutDraft draft) {
        if (request.preticketId() == null) return false;
        if (dependencies.pretickets() == null) throw PosApiException.conflict("Preticket checkout is unavailable.");
        var source = dependencies.pretickets().lockClaimedForCheckout(context, request.preticketId(), draft.register())
            .orElseThrow(() -> PosApiException.conflict("Preticket is not claimed by this user and cash register."));
        lines.validate(request, source);
        return true;
    }
    void complete(PosContext context, PosCheckoutRequest request, CheckoutDraft draft, long ticketId) {
        if (request.preticketId() != null && (dependencies.pretickets() == null
                || !dependencies.pretickets().completeClaim(context, request.preticketId(), draft.register(), ticketId))) {
            throw PosApiException.conflict("Preticket could not be completed with this sale.");
        }
    }
}
