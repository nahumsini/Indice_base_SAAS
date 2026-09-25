package com.indice.erp.pos.square;

import com.indice.erp.pos.settlement.TerminalRefundStore;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SquareRefundConfirmationLockOrderTest {
    @Test void locksTenantIntentBeforeRefundAndRevalidatesClaimVersion() {
        var refunds=mock(SquareRefundQueries.class); var intents=mock(SquarePaymentIntentRepository.class);
        var observed=SquareRefundFixtures.refund("PENDING","refund-1",null);
        var claimed=SquareRefundFixtures.refund("PENDING","refund-1","lease",0,0,1,5L);
        when(intents.lockById(7L,91L)).thenReturn(java.util.Optional.of(SquareRefundFixtures.intent()));
        when(refunds.find(7L,71L,true)).thenReturn(java.util.Optional.of(claimed));
        var subject=new SquareRefundConfirmation(refunds,intents,mock(TerminalRefundStore.class),
            mock(SquareRefundConfirmationStore.class),mock(SquareRefundIntentStatus.class),mock(SquareRefundAudit.class));
        var evidence=new SquareRefundEvidence("refund-1","payment-1","PENDING",new BigDecimal("2.50"),"CAD","{}");
        assertThatThrownBy(()->subject.confirm(observed,"lease",evidence,SquareRefundActor.system(),null))
            .isInstanceOf(SquareRefundEvidenceException.class);
        var order=inOrder(intents,refunds); order.verify(intents).lockById(7L,91L);
        order.verify(refunds).find(7L,71L,true);
    }
}
