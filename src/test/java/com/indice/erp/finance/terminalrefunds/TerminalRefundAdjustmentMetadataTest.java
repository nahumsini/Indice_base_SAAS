package com.indice.erp.finance.terminalrefunds;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.treasury.*;
import com.indice.erp.pos.settlement.*;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TerminalRefundAdjustmentMetadataTest {
    @Test void opaqueProviderIdIsSerializedAsJsonData() throws Exception {
        var query=mock(TerminalRefundAdjustmentQuery.class); var transitions=mock(TerminalRefundAdjustmentTransitions.class);
        var outcomes=mock(TerminalRefundAdjustmentPostingOutcome.class); var balances=mock(TerminalRefundAdjustmentBalance.class);
        var settlements=mock(TerminalRefundSettlementLock.class); var treasury=mock(TreasuryService.class);
        var value=TerminalRefundAdjustmentFixtures.adjustment("APPROVED","PENDING",1,"refund\"\\part");
        when(query.lock(7,41)).thenReturn(value); when(query.get(7,41)).thenReturn(value);
        when(settlements.lock(7,25)).thenReturn(Optional.of(
            new TerminalRefundSettlement(new BigDecimal("100"),"PENDING")));
        when(balances.postedPending(7,25)).thenReturn(BigDecimal.ZERO);
        when(treasury.post(any())).thenReturn(new TreasuryMovementResult(80,26,BigDecimal.ZERO,BigDecimal.ZERO,false));
        when(transitions.posted(value,80,"PENDING")).thenReturn(true);
        new TerminalRefundAdjustmentPostingAttempt(query,transitions,outcomes,balances,settlements,treasury)
            .post(TerminalRefundAdjustmentFixtures.OWNER,41,1);
        var command=ArgumentCaptor.forClass(TreasuryMovementCommand.class); verify(treasury).post(command.capture());
        assertThat(new ObjectMapper().readTree(command.getValue().metadataJson())
            .path("providerRefundId").asText()).isEqualTo("refund\"\\part");
    }
}
