package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SquareRefundAmountsTest {
    private final SquareRefundAmounts amounts = new SquareRefundAmounts();
    @Test void computesTheDefaultFromBackendConfirmedRemainingAmount() {
        assertThat(amounts.requested(null, new BigDecimal("8.00")))
            .isEqualByComparingTo("8.00");
    }
    @Test void rejectsExcessAndUnsupportedMinorUnits() {
        assertThatThrownBy(() -> amounts.requested(new BigDecimal("8.01"),
            new BigDecimal("8.00"))).isInstanceOf(PosApiException.class);
        assertThatThrownBy(() -> amounts.requested(new BigDecimal("1.001"),
            new BigDecimal("8.00"))).isInstanceOf(PosApiException.class);
        assertThatThrownBy(() -> amounts.normalize(new BigDecimal("99999999999999999.00")))
            .isInstanceOf(PosApiException.class);
    }
}
