package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Service;

@Service
public record MpPaymentService(MpPaymentReservation reservation, MpIntentReader reader,
        MpPaymentRecovery recovery, MpPaymentCancellation cancellation, MpPaymentResult result) {
    public MpPaymentResponse create(PosContext context, MpCreatePayment request) {
        var intent = reservation.reserve(context, request);
        if (intent.pending()) recovery.recover(intent, MpAuditActor.user(context.userId()));
        return result.read(context, intent.id());
    }

    public MpPaymentResponse recover(PosContext context, long id) {
        recovery.recover(require(context, id), MpAuditActor.user(context.userId()));
        return result.read(context, id);
    }

    public MpPaymentResponse cancel(PosContext context, long id) {
        cancellation.cancel(require(context, id), MpAuditActor.user(context.userId()));
        return result.read(context, id);
    }

    private MpIntent require(PosContext context, long id) {
        return reader.find(context, id)
            .orElseThrow(() -> PosApiException.notFound("Payment attempt was not found."));
    }
}
