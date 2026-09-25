package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Service;

@Service
public record MpRefundService(MpRefundPolicy policy, MpIntentReader reader,
        MpRefundReservation reservation, MpPaymentRecovery recovery,
        MpRefundEligibility eligibility, MpRefundReplay replay, MpRefundLifecycle lifecycle) {
    public MpRefundRecord refund(PosContext context, long id, MpRefundRequest request) {
        policy.requireEnabled();
        var intent = reader.find(context, id)
            .orElseThrow(() -> PosApiException.notFound("Payment attempt was not found."));
        var existing = replay.existing(intent, request);
        var actor = MpAuditActor.user(context.userId());
        if (existing != null) return lifecycle.progress(intent, existing, actor);
        if (!java.util.Set.of("APPROVED", "PARTIALLY_REFUNDED").contains(recovery.recoverEvidence(intent, actor))) {
            throw PosApiException.conflict("Verify the payment before submitting a refund.");
        }
        intent = reader.find(context, id).orElseThrow();
        eligibility.require(intent);
        return lifecycle.progress(intent, reservation.reserve(context, intent, request), actor);
    }
}
