package com.indice.erp.finance.terminalrefunds;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.finance.FinanceApiException;
import java.util.List;
import org.junit.jupiter.api.Test;

class TerminalRefundAdjustmentListingTest {
    private final TerminalRefundAdjustmentAuthorization authorization = mock(TerminalRefundAdjustmentAuthorization.class);
    private final TerminalRefundAdjustmentPageQuery query = mock(TerminalRefundAdjustmentPageQuery.class);
    private final TerminalRefundAdjustmentListing listing = new TerminalRefundAdjustmentListing(authorization, query);

    @Test void returnsBoundedAttentionPageAndCursor() {
        var row = TerminalRefundAdjustmentFixtures.adjustment("PENDING_REVIEW", "PENDING", 1);
        when(query.page(7, "ATTENTION", null, 2)).thenReturn(List.of(row, row, row));
        when(query.count(7, "ATTENTION")).thenReturn(7L);

        var result = listing.page(TerminalRefundAdjustmentFixtures.OWNER, "attention", null, 2);

        assertThat(result.items()).hasSize(2);
        assertThat(result.nextCursor()).isEqualTo(41);
        assertThat(result.totalCount()).isEqualTo(7);
        verify(authorization).requireOwner(TerminalRefundAdjustmentFixtures.OWNER);
    }

    @Test void rejectsUnboundedOrUnknownRequests() {
        assertThatThrownBy(() -> listing.page(TerminalRefundAdjustmentFixtures.OWNER,
            "UNKNOWN", null, 50)).isInstanceOf(FinanceApiException.class);
        assertThatThrownBy(() -> listing.page(TerminalRefundAdjustmentFixtures.OWNER,
            "ATTENTION", null, 101)).isInstanceOf(FinanceApiException.class);
        verifyNoInteractions(query);
    }
}
