package com.indice.erp.finance.terminalrefunds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.indice.erp.finance.FinanceApiException;
import org.junit.jupiter.api.Test;

class TerminalRefundAdjustmentFailureBoundaryTest {
    @Test void recordsFailureOnlyAfterPostingAttemptRollsBack() {
        var attempt = mock(TerminalRefundPostingOperation.class);
        var failures = mock(TerminalRefundAdjustmentFailureRecorder.class);
        var service = new TerminalRefundAdjustmentPosting(attempt, failures);
        var cause = FinanceApiException.conflict("Pending balance changed.");
        var failed = TerminalRefundAdjustmentFixtures.adjustment("FAILED", "PENDING", 2);
        when(attempt.post(TerminalRefundAdjustmentFixtures.OWNER, 41, 1))
            .thenThrow(new TerminalRefundPostingFailure(cause));
        when(failures.record(TerminalRefundAdjustmentFixtures.OWNER, 41, 1, cause)).thenReturn(failed);

        assertThat(service.post(TerminalRefundAdjustmentFixtures.OWNER, 41, 1)).isSameAs(failed);
        verify(failures).record(TerminalRefundAdjustmentFixtures.OWNER, 41, 1, cause);
    }
}
