package com.indice.erp.finance.terminalrefunds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryMovementResult;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.settlement.TerminalRefundAdjustmentBalance;
import com.indice.erp.pos.settlement.TerminalRefundSettlement;
import com.indice.erp.pos.settlement.TerminalRefundSettlementLock;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class TerminalRefundAdjustmentPostingTest {
    @Test void approvedPendingAdjustmentPostsOneIdempotentPendingDebit() {
        var query = mock(TerminalRefundAdjustmentQuery.class);
        var transitions = mock(TerminalRefundAdjustmentTransitions.class);
        var outcomes = mock(TerminalRefundAdjustmentPostingOutcome.class);
        var balances = mock(TerminalRefundAdjustmentBalance.class);
        var settlements = mock(TerminalRefundSettlementLock.class);
        var treasury = mock(TreasuryService.class);
        var service = new TerminalRefundAdjustmentPostingAttempt(query, transitions, outcomes, balances, settlements, treasury);
        var approved = TerminalRefundAdjustmentFixtures.adjustment("APPROVED", "PENDING", 1);
        when(query.lock(7, 41)).thenReturn(approved);
        when(settlements.lock(7, 25)).thenReturn(Optional.of(
            new TerminalRefundSettlement(new BigDecimal("100"), "PENDING")));
        when(balances.postedPending(7, 25)).thenReturn(BigDecimal.ZERO);
        when(treasury.post(any())).thenReturn(new TreasuryMovementResult(80, 26,
            BigDecimal.ZERO, new BigDecimal("80"), false));
        when(transitions.posted(approved, 80, "PENDING")).thenReturn(true);
        when(query.get(7, 41)).thenReturn(TerminalRefundAdjustmentFixtures.adjustment("POSTED", "PENDING", 2));

        service.post(TerminalRefundAdjustmentFixtures.OWNER, 41, 1);

        var command = ArgumentCaptor.forClass(TreasuryMovementCommand.class);
        verify(treasury).post(command.capture());
        assertThat(command.getValue().eventKey()).isEqualTo("POS_REFUND_ADJUSTMENT:41");
        assertThat(command.getValue().availableDelta()).isEqualByComparingTo("0.0000");
        assertThat(command.getValue().pendingDelta()).isEqualByComparingTo("-20.0000");
        verify(outcomes).posted(approved, 80, 5, "PENDING");
        var order = inOrder(query, settlements, balances, treasury);
        order.verify(query).lock(7, 41); order.verify(settlements).lock(7, 25);
        order.verify(balances).postedPending(7, 25); order.verify(treasury).post(any());
    }
}
