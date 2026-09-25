package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.PersistedCheckoutReader;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public record MpPaymentResult(MpIntentReader reader, PersistedCheckoutReader checkout) {
    public MpPaymentResponse read(PosContext context, long id) {
        return response(reader.find(context, id)
            .orElseThrow(() -> PosApiException.notFound("Payment attempt was not found.")));
    }

    public MpPaymentResponse response(MpIntent intent) {
        var completed = intent.posTicketId() != null;
        var recovery = intent.status().equals("APPROVED") || intent.status().equals("PARTIALLY_REFUNDED");
        var review = intent.status().equals("RECONCILIATION_REQUIRED");
        return new MpPaymentResponse(intent.id(), intent.status().toLowerCase(Locale.ROOT),
            intent.amount(), intent.currencyCode(), intent.orderId(), intent.paymentId(),
            intent.message(), intent.posTicketId(), completed
                ? checkout.read(intent.context(), intent.posTicketId()) : null,
            completed ? "completed" : review ? "review_required" : recovery ? "recovery_required" : "pending",
            intent.orderId() != null && intent.status().equals("WAITING") && "created".equals(intent.providerState()),
            !completed && Set.of("DECLINED", "CANCELLED", "EXPIRED", "REFUNDED").contains(intent.status()),
            intent.version());
    }
}
