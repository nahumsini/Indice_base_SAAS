package com.indice.erp.hr.incentives;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.junit.jupiter.api.Test;

class HrIncentiveServiceTest {

    @Test
    void exchangeRateBetweenConvertsEnteredCurrencyToNativePayrollCurrency() {
        var mxnToUsd = HrIncentiveService.exchangeRateBetween("MXN", "USD");

        assertEquals(new BigDecimal("0.0542005420"), mxnToUsd);
        assertEquals(
            new BigDecimal("54.20"),
            new BigDecimal("1000.00").multiply(mxnToUsd).setScale(2, RoundingMode.HALF_UP)
        );
    }

    @Test
    void exchangeRateBetweenUsesUsdAsReferenceForCanadianPayrollCurrency() {
        var mxnToCad = HrIncentiveService.exchangeRateBetween("MXN", "CAD");

        assertEquals(new BigDecimal("0.0738007588"), mxnToCad);
        assertEquals(
            new BigDecimal("73.80"),
            new BigDecimal("1000.00").multiply(mxnToCad).setScale(2, RoundingMode.HALF_UP)
        );
    }
}
