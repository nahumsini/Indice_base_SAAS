package com.indice.erp.finance.terminalrefunds;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.pos.settlement.TerminalRefundAdjustmentBalance;
import com.indice.erp.pos.settlement.TerminalRefundSettlement;
import com.indice.erp.pos.settlement.TerminalRefundSettlementLock;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
class TerminalRefundAdjustmentResolutionTest {
    private final TerminalRefundAdjustmentQuery query = mock(TerminalRefundAdjustmentQuery.class);
    private final TerminalRefundAdjustmentEvidence evidence = mock(TerminalRefundAdjustmentEvidence.class);
    private final TerminalRefundAdjustmentTransitions transitions = mock(TerminalRefundAdjustmentTransitions.class);
    private final TerminalRefundAdjustmentEvents events = mock(TerminalRefundAdjustmentEvents.class);
    private final TerminalRefundAdjustmentBalance balances = mock(TerminalRefundAdjustmentBalance.class);
    private final TerminalRefundSettlementLock settlements = mock(TerminalRefundSettlementLock.class);
    private final TerminalRefundAdjustmentResolution service =
        new TerminalRefundAdjustmentResolution(query, evidence, transitions, events, balances, settlements);
    @Test void revalidatesAuthoritativeLinksBeforeReturningToReview() {
        var value = TerminalRefundAdjustmentFixtures.adjustment("RECONCILIATION_REQUIRED", "PENDING", 3);
        var proof = new TerminalRefundResolutionEvidence(22L, 25L, 26L, 26L, "PENDING");
        var resolved = TerminalRefundAdjustmentFixtures.adjustment("PENDING_REVIEW", "PENDING", 4);
        when(query.lock(7, 41)).thenReturn(value);
        when(evidence.load(7, 41)).thenReturn(proof);
        when(settlements.lock(7, 25)).thenReturn(Optional.of(
            new TerminalRefundSettlement(new BigDecimal("100"), "PENDING")));
        when(balances.postedPending(7, 25)).thenReturn(BigDecimal.ZERO);
        when(transitions.resolved(value, proof)).thenReturn(true);
        when(query.get(7, 41)).thenReturn(resolved);
        assertThat(service.resolve(TerminalRefundAdjustmentFixtures.OWNER, 41, "Payment link corrected", 3))
            .isSameAs(resolved);
        verify(events).append(value, "RESOLVED:4", "RECONCILIATION_RESOLVED",
            "RECONCILIATION_REQUIRED", "PENDING_REVIEW", 5, "Payment link corrected");
    }
    @Test void refusesResolutionWhileAccountsStillMismatch() {
        var value = TerminalRefundAdjustmentFixtures.adjustment("RECONCILIATION_REQUIRED", "PENDING", 3);
        when(query.lock(7, 41)).thenReturn(value);
        when(evidence.load(7, 41)).thenReturn(new TerminalRefundResolutionEvidence(22L, 25L, 26L, 99L, "PENDING"));
        assertThatThrownBy(() -> service.resolve(TerminalRefundAdjustmentFixtures.OWNER,
            41, "Payment link corrected", 3)).isInstanceOf(FinanceApiException.class)
            .hasMessageContaining("still do not match");
        verifyNoInteractions(transitions, events, balances, settlements);
    }
}
