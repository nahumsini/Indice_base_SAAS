package com.indice.erp.pos.settlement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class SettlementConfirmationRefundAdjustmentTest {
    @Test void postedPendingRefundReducesConfirmationPendingMovement() {
        var repository = mock(CashClosingSettlementRepository.class);
        var treasury = mock(TreasuryService.class);
        var refunds = mock(TerminalRefundAdjustmentBalance.class);
        var service = new SettlementConfirmation(repository, treasury, refunds);
        var context = new PosContext(5L, 7L, "Owner", "owner", true, PosScope.corporateOffice());
        var settlement = settlement();
        when(repository.lockById(context, 90, 102)).thenReturn(Optional.of(settlement));
        when(refunds.postedPending(7, 102)).thenReturn(new BigDecimal("20.0000"));
        when(repository.confirm(eq(context), eq(settlement), eq(new BigDecimal("80.0000")),
            eq(new BigDecimal("0.0000")), eq("SETTLED"), eq("Refund net deposit"))).thenReturn(true);

        service.confirm(context, 90, 102,
            new ConfirmSettlementRequest(new BigDecimal("80"), "Refund net deposit"));

        var command = ArgumentCaptor.forClass(TreasuryMovementCommand.class);
        verify(treasury).post(command.capture());
        assertThat(command.getValue().availableDelta()).isEqualByComparingTo("80.0000");
        assertThat(command.getValue().pendingDelta()).isEqualByComparingTo("-80.0000");
    }
    private CashClosingSettlement settlement() {
        return new CashClosingSettlement(102, 7, 90, 40, 13, 2L, 3L, "CARD", "MXN",
            new BigDecimal("100"), BigDecimal.ZERO, new BigDecimal("100"), 81,
            "Terminal bank", "DEFERRED", new BigDecimal("100.0000"), BigDecimal.ZERO,
            BigDecimal.ZERO, "PENDING", "{}", null, null, 0);
    }
}
