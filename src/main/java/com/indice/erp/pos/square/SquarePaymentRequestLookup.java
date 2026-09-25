package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Service;

@Service
class SquarePaymentRequestLookup {
    private final SquarePaymentIntentRepository intents;
    private final SquarePaymentAccess access;
    private final SquarePaymentFinalizer finalizer;
    SquarePaymentRequestLookup(SquarePaymentIntentRepository intents,
            SquarePaymentAccess access, SquarePaymentFinalizer finalizer) {
        this.intents = intents;
        this.access = access;
        this.finalizer = finalizer;
    }
    SquareTerminalDtos.PaymentIntentResponse find(PosContext context, String rawKey) {
        var intent = intents.findByIdempotency(context, SquarePaymentRequestKey.require(rawKey))
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        access.require(context, intent);
        return finalizer.response(intent, null);
    }
}
