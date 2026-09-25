package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SquareLocationEligibilityTest {
    @Test
    void acceptsCanadianLocationInItsOwnCurrency() {
        assertThatCode(() -> SquareLocationEligibility.require("CA", "CAD", "CAD")).doesNotThrowAnyException();
    }
    @Test
    void rejectsMexicoAndCrossCurrencyBeforeAnyCharge() {
        assertThatThrownBy(() -> SquareLocationEligibility.require("MX", "MXN", "MXN")).isInstanceOf(PosApiException.class);
        assertThatThrownBy(() -> SquareLocationEligibility.require("CA", "CAD", "USD")).isInstanceOf(PosApiException.class);
    }
}
