package com.indice.erp.pos.mercadopago;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpRefundReviewLockOrderTest {
    @Test void financialAndIntentLocksPrecedeRefundLeaseRevalidation() {
        var evidence=mock(MpEvidenceApplication.class); var requests=mock(MpRefundRequestStore.class);
        var leases=mock(MpRefundReviewLease.class); var statuses=mock(MpRefundWorkStatus.class);
        var audit=mock(MpPaymentAudit.class); var locks=mock(MpFinancialEvidenceLock.class);
        var intents=mock(MpIntentStore.class); var intent=MpPaymentTestFixtures.intent();
        var refund=MpRefundTestFixtures.record("UNCERTAIN");
        var claimed=MpRefundTestFixtures.change(MpRefundTestFixtures.change(refund,
            "workLeaseId","lease"),"version",1L);
        var confirmed=MpRefundTestFixtures.change(MpRefundTestFixtures.change(claimed,
            "status","CONFIRMED"),"version",2L);
        when(locks.apply(eq(intent),any())).thenAnswer(c->((java.util.function.Supplier<?>)c.getArgument(1)).get());
        when(intents.lock(42,17)).thenReturn(intent);
        when(leases.lockOwned(refund,"lease",MpTestFixtures.NOW)).thenReturn(Optional.of(claimed));
        when(requests.find(42,19)).thenReturn(Optional.of(confirmed));
        new MpRefundReviewCompletion(evidence,requests,leases,statuses,audit,locks,intents,
            new MpProperties(),MpTestFixtures.CLOCK).complete(intent.context(),intent,refund,"lease",
                new MpRefundReviewRequest("provider review evidence",0L),null);
        var order=inOrder(locks,intents,leases); order.verify(locks).apply(eq(intent),any());
        order.verify(intents).lock(42,17); order.verify(leases).lockOwned(refund,"lease",MpTestFixtures.NOW);
    }
}
