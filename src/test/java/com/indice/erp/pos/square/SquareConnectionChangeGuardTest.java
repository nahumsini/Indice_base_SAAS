package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareConnectionChangeGuardTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final SquareConnectionChangeGuard guard = new SquareConnectionChangeGuard(jdbc);
    @Test
    void rejectsReplacingMerchantWithAnyUnresolvedCompanyCharge() {
        when(jdbc.queryForList(anyString(), eq(Long.class), eq(1L))).thenReturn(List.of(99L));
        assertThatThrownBy(() -> guard.requireReplacementAllowed(1L, "merchant-old", "merchant-new"))
            .isInstanceOf(PosApiException.class).hasMessageContaining("unresolved Square");
    }
    @Test
    void sameMerchantRefreshDoesNotDiscardExistingFinancialAttempts() {
        assertThatCode(() -> guard.requireReplacementAllowed(1L, "merchant-old", "merchant-old")).doesNotThrowAnyException();
        verifyNoInteractions(jdbc);
    }
    @Test void completedRefundableSaleBlocksMerchantReplacement() {
        when(jdbc.queryForList(anyString(),eq(Long.class),eq(1L)))
            .thenReturn(List.of(),List.of(),List.of(99L));
        assertThatThrownBy(() -> guard.requireReplacementAllowed(1L,"merchant-old","merchant-new"))
            .isInstanceOf(PosApiException.class).hasMessageContaining("original merchant");
    }
    @Test
    void requiresTransactionForSharedConnectionLock() {
        assertThatThrownBy(() -> guard.lock(1L, "sandbox")).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(jdbc);
    }
}
