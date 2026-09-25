package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.treasury.*;
import com.indice.erp.pos.settlement.*;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TerminalRefundCurrentSettlementTest {
    @Test void lockedCurrentStatusOverridesAdjustmentJoinSnapshot() {
        var query=mock(TerminalRefundAdjustmentQuery.class); var transitions=mock(TerminalRefundAdjustmentTransitions.class);
        var outcomes=mock(TerminalRefundAdjustmentPostingOutcome.class); var balances=mock(TerminalRefundAdjustmentBalance.class);
        var settlements=mock(TerminalRefundSettlementLock.class); var treasury=mock(TreasuryService.class);
        var value=TerminalRefundAdjustmentFixtures.adjustment("APPROVED","PENDING",1);
        when(query.lock(7,41)).thenReturn(value);
        when(settlements.lock(7,25)).thenReturn(Optional.of(
            new TerminalRefundSettlement(BigDecimal.ZERO,"SETTLED")));
        when(treasury.post(any())).thenReturn(new TreasuryMovementResult(80,26,BigDecimal.ZERO,BigDecimal.ZERO,false));
        when(transitions.posted(value,80,"AVAILABLE")).thenReturn(true);
        when(query.get(7,41)).thenReturn(value);
        new TerminalRefundAdjustmentPostingAttempt(query,transitions,outcomes,balances,settlements,treasury)
            .post(TerminalRefundAdjustmentFixtures.OWNER,41,1);
        var command=org.mockito.ArgumentCaptor.forClass(TreasuryMovementCommand.class);
        verify(treasury).post(command.capture()); verifyNoInteractions(balances);
        assertThat(command.getValue().availableDelta()).isEqualByComparingTo("-20.0000");
        assertThat(command.getValue().pendingDelta()).isEqualByComparingTo("0.0000");
    }
}
