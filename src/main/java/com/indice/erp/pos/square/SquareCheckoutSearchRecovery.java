package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class SquareCheckoutSearchRecovery {
    private final SquarePaymentDependencies d;
    private final SquareCheckoutIdentityPolicy identity;
    private final ObjectMapper mapper;
    SquareCheckoutSearchRecovery(SquarePaymentDependencies d, SquareCheckoutIdentityPolicy identity, ObjectMapper mapper) {
        this.d = d; this.identity = identity; this.mapper = mapper;
    }
    SquareTerminalGateway.Checkout find(PosContext context, SquareRecords.PaymentIntent intent) {
        var start = intent.createdAt() == null ? d.clock().instant().minusSeconds(86_400)
            : intent.createdAt().minusSeconds(120);
        var end = d.clock().instant().plusSeconds(60);
        if (start.isBefore(end.minusSeconds(2_592_000))) return null;
        var found = d.tokens().withToken(context, token -> d.gateway().searchCheckouts(token,
            new SquareTerminalGateway.CheckoutSearch(intent.squareDeviceId(), start, end))).stream()
            .filter(checkout -> matches(intent, checkout)).toList();
        if (found.size() > 1) throw PosApiException.conflict("Square returned ambiguous checkout recovery evidence.");
        return found.isEmpty() ? null : found.getFirst();
    }
    private boolean matches(SquareRecords.PaymentIntent intent, SquareTerminalGateway.Checkout checkout) {
        try {
            identity.require(intent, checkout, mapper.readTree(checkout.rawJson()).path("checkout"));
            return true;
        } catch (Exception invalid) {
            return false;
        }
    }
}
