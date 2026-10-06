package com.indice.erp.pos.square;
import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class SquareRefundOutstandingTest {
    @Test void originalTenderReturnBlocksAnySeparateRefund(){
        var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForObject(contains("pos_returns"),eq(Integer.class),eq(7L),eq(501L))).thenReturn(1);
        assertThatThrownBy(()->new SquareRefundOutstanding(jdbc).requireNone(SquareRefundFixtures.intent())).isInstanceOf(PosApiException.class).hasMessageContaining("already owns this ticket");
        verify(jdbc,never()).queryForList(contains("pos_square_refund_requests"),eq(Long.class),any(),any());
    }
    @Test void unrelatedOrFullyCancelledReturnDoesNotConsumeRefundBudget(){
        var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForObject(contains("pos_returns"),eq(Integer.class),eq(7L),eq(501L))).thenReturn(0);
        assertThatCode(()->new SquareRefundOutstanding(jdbc).requireNone(SquareRefundFixtures.intent())).doesNotThrowAnyException();
    }
}
