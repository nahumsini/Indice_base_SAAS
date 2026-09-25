package com.indice.erp.pos.settlement;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class TerminalRefundStoreSquareTest {
    @Test void squareReversalUsesItsOwnIntentNamespaceAndSharedAccountingOwner() {
        var jdbc = mock(JdbcTemplate.class); var adjustments = mock(TerminalRefundAdjustmentAdmission.class);
        var value = new TerminalRefundRecord(7L, "SQUARE", 91L, 501L, "payment-1", 41L,
            new BigDecimal("2.50"), new BigDecimal("2.50"), "CAD", "refund-1");
        new TerminalRefundStore(jdbc, adjustments).record(value);
        var sql = ArgumentCaptor.forClass(String.class); var args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(sql.capture(), args.capture());
        assertThat(sql.getValue()).contains("square_intent_id");
        assertThat(args.getValue()[2]).isNull();
        assertThat(args.getValue()[3]).isEqualTo(91L);
        verify(adjustments).admit(7L, "SQUARE", "refund-1");
    }
    @Test void confirmedTotalsUseProviderSpecificIndexedIntentColumn() {
        var jdbc=mock(JdbcTemplate.class); when(jdbc.queryForObject(anyString(),eq(BigDecimal.class),
            any(Object[].class))).thenReturn(BigDecimal.ZERO);
        var store=new TerminalRefundStore(jdbc,mock(TerminalRefundAdjustmentAdmission.class));
        store.confirmed(7L,"SQUARE",91L);
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(),eq(BigDecimal.class),eq(7L),eq("SQUARE"),eq(91L));
        assertThat(sql.getValue()).contains("square_intent_id=?").doesNotContain("COALESCE(square_intent_id");
        assertThatThrownBy(()->store.confirmed(7L,"OTHER",91L))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
