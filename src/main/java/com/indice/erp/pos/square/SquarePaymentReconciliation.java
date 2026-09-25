package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentReconciliation {
    private final SquarePaymentDependencies dependencies;
    private final SquarePaymentRecovery recovery;
    SquarePaymentReconciliation(SquarePaymentDependencies dependencies, SquarePaymentRecovery recovery) {
        this.dependencies = dependencies;
        this.recovery = recovery;
    }
    int reconcile(int limit) {
        if (!dependencies.properties().isEnabled()) return 0;
        var candidates = dependencies.intents().findRecoveryBatch(dependencies.clock().instant().minusSeconds(30), limit);
        for (var intent : candidates) {
            try {
                var context = new PosContext(intent.createdByUserId(), intent.companyId(), "Reconciliation",
                    "system", true, PosScope.corporateOffice());
                recovery.recover(context, intent.id());
            } catch (RuntimeException failed) {
                dependencies.intents().markGatewayStatus(intent.id(), new SquareRecords.GatewayStatus(intent.squareCheckoutId(), null,
                    SquareTerminalPaymentStatus.UNCERTAIN, null, "SQUARE_RECONCILE", "Square reconciliation failed."));
                dependencies.audit().recordIntent(intent, "PAYMENT_RECONCILE_FAILED", "UNCERTAIN", "Square reconciliation failed.");
            }
        }
        return candidates.size();
    }
}
