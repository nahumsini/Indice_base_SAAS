package com.indice.erp.finance.terminalrefunds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.settlement.TerminalRefundAdjustmentBalance;
import com.indice.erp.pos.settlement.TerminalRefundSettlementLock;
import org.junit.jupiter.api.Test;

class TerminalRefundAdjustmentReplayTest {
    @Test void postedAdjustmentReplayDoesNotCreateAnotherTreasuryMovement() {
        var query = mock(TerminalRefundAdjustmentQuery.class);
        var transitions = mock(TerminalRefundAdjustmentTransitions.class);
        var outcomes = mock(TerminalRefundAdjustmentPostingOutcome.class);
        var balances = mock(TerminalRefundAdjustmentBalance.class);
        var settlements = mock(TerminalRefundSettlementLock.class);
        var treasury = mock(TreasuryService.class);
        var service = new TerminalRefundAdjustmentPostingAttempt(query, transitions, outcomes, balances, settlements, treasury);
        var posted = TerminalRefundAdjustmentFixtures.adjustment("POSTED", "SETTLED", 2);
        when(query.lock(7, 41)).thenReturn(posted);

        assertThat(service.post(TerminalRefundAdjustmentFixtures.OWNER, 41, 1)).isSameAs(posted);

        verifyNoInteractions(treasury, transitions, outcomes, balances, settlements);
    }
}
