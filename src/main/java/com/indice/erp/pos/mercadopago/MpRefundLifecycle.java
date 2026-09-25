package com.indice.erp.pos.mercadopago;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpRefundLifecycle {
    private final MpRefundSubmission submission;
    private final MpPaymentRecovery recovery;
    private final MpRefundRequestStore requests;
    MpRefundRecord progress(MpIntent intent, MpRefundRecord refund, MpAuditActor actor) {
        var current = submission.submit(intent, refund, actor);
        if (java.util.Set.of("PENDING", "UNCERTAIN").contains(current.status())) {
            recovery.recoverEvidence(intent, actor);
        }
        return requests.byKey(refund.companyId(), refund.key()).orElseThrow();
    }
}
