package com.indice.erp.pos.mercadopago;

import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MpRefundSubmission {
    private final MpRefundWorkClaims claims;
    private final MpRefundTransition transitions;
    private final MpRefundRequestStore requests;
    private final MpRefundProviderSubmission provider;
    private final MpProperties properties;
    private final Clock clock;
    public MpRefundRecord submit(MpIntent intent, MpRefundRecord refund, MpAuditActor actor) {
        if (!java.util.Set.of("WAITING", "SUBMITTING").contains(refund.status())) return refund;
        var lease = UUID.randomUUID().toString();
        var until = clock.instant().plusSeconds(90);
        if (!claims.submission(refund, lease, until, properties.refundSubmissionAttempts())) return reload(refund);
        var outcome = provider.submit(intent, refund);
        return transitions.complete(refund, lease, actor, outcome.status(), outcome.error(),
            clock.instant().plusSeconds(properties.refundRecoveryDelaySeconds())).orElseGet(() -> reload(refund));
    }
    private MpRefundRecord reload(MpRefundRecord refund) {
        return requests.byKey(refund.companyId(), refund.key()).orElseThrow();
    }
}
