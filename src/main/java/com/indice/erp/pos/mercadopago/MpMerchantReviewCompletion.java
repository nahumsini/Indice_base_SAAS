package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpMerchantReviewCompletion {
    private final MpPaymentRecovery recovery;
    private final MpPaymentResult result;
    MpPaymentResponse complete(PosContext context, MpIntent intent, MpAuditActor actor) {
        recovery.recover(intent, actor);
        return result.read(context, intent.id());
    }
}
