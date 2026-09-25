package com.indice.erp.pos.mercadopago;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MpRefundTransitionTest {
    private final MpRefundWorkStatus statuses=mock(MpRefundWorkStatus.class);
    private final MpRefundRequestStore requests=mock(MpRefundRequestStore.class);
    private final MpPaymentAudit audit=mock(MpPaymentAudit.class);
    private final MpRefundTransition transition=new MpRefundTransition(statuses, requests, audit);
    @Test void staleLeaseAndVersionNeverCreateAuditEvents() {
        var refund=MpRefundTestFixtures.record("UNCERTAIN"); var next=MpTestFixtures.NOW;
        assertThat(transition.complete(refund,"lost",MpAuditActor.user(11),
            "UNCERTAIN","HTTP_429",next)).isEmpty();
        assertThat(transition.checked(refund,"lost","DEAD_LETTER","RECOVERY_FAILED",next,true)).isEmpty();
        assertThat(transition.unresolved(refund,"RECONCILIATION_REQUIRED","EXHAUSTED")).isEmpty();
        verifyNoInteractions(requests,audit);
    }
    @Test void successfulCasAuditsTheResultingVersion() {
        var refund=MpRefundTestFixtures.record("WAITING");
        var current=MpRefundTestFixtures.change(refund,"version",1L);
        when(statuses.complete(any(),any(),any(),any(),any())).thenReturn(true);
        when(requests.find(42,19)).thenReturn(Optional.of(current));
        assertThat(transition.complete(refund,"lease",MpAuditActor.user(11),
            "UNCERTAIN","HTTP_429",MpTestFixtures.NOW)).contains(current);
        verify(audit).refund(current,MpAuditActor.user(11),"REFUND_UNCERTAIN","UNCERTAIN");
    }
}
