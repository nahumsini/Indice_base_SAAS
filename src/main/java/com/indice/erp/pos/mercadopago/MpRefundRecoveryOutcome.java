package com.indice.erp.pos.mercadopago;

import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpRefundRecoveryOutcome {
    private final MpRefundTransition transitions;
    private final MpProperties properties;
    private final Clock clock;
    void checked(MpRefundRecord refund, String lease, boolean failed) {
        var exhausted = refund.recoveryAttempts() + 1 >= properties.refundRecoveryAttempts();
        var status = exhausted ? failed ? "DEAD_LETTER" : "RECONCILIATION_REQUIRED" : refund.status();
        var code = exhausted ? failed ? "RECOVERY_FAILED" : "RECOVERY_ATTEMPTS_EXHAUSTED"
            : failed ? "RECOVERY_FAILED" : "PROVIDER_CONFIRMATION_PENDING";
        transitions.checked(refund, lease, status, code,
            clock.instant().plusSeconds(properties.refundRecoveryDelaySeconds()), exhausted);
    }
    void unresolved(MpRefundRecord refund, String status, String code) {
        transitions.unresolved(refund, status, code);
    }
}
