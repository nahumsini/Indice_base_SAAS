package com.indice.erp.pos.mercadopago;

import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class MpPointRecoveryRequiresFreshApprovalTest {
    @Test void preservedLocalApprovalCannotFinalizeAfterFreshWrongPaidAmount() {
        var order = MpPaymentTestFixtures.order();
        MpPaymentTestFixtures.transaction(order).put("paid_amount", "69.00");
        var f = new MpRecoveryTestFixtures(order);
        f.recovery.recover(f.approved);
        verifyNoInteractions(f.finalizer);
    }
    @Test void genericRefundedPaymentCannotFinalizePreservedLocalApprovalWithoutConfirmedRefundOrder() {
        var order = MpPaymentTestFixtures.order().put("status", "action_required");
        var f = new MpRecoveryTestFixtures(order);
        var generic = MpPaymentTestFixtures.JSON.mapper().createObjectNode()
            .put("id", "987").put("collector_id", "12345").put("currency_id", "MXN")
            .put("status", "approved").put("status_detail", "accredited")
            .put("transaction_amount", "70.00").put("transaction_amount_refunded", "10.00")
            .put("live_mode", false);
        when(f.gateway.getPayment("synthetic-token", "987")).thenReturn(generic);
        f.recovery.recover(f.approved);
        verifyNoInteractions(f.finalizer);
    }
    @Test void authenticFreshApprovalStillReachesPersistedSaleFinalizer() {
        var f = new MpRecoveryTestFixtures(MpPaymentTestFixtures.order());
        f.recovery.recover(f.approved);
        verify(f.finalizer).finalizeApproved(f.approved, MpAuditActor.system());
    }
}
