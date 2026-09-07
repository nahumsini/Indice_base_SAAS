package com.indice.erp.exchange;

import static org.assertj.core.api.Assertions.assertThat;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class BusinessExchangeRateEvidenceTest {
    @Test
    void illustrativeFutureAndExpiredRatesAreNotFinancialEvidence() {
        var snapshot = new BusinessExchangeRatesResponse("USD", Map.of(
            "MXN", new BigDecimal("18"), "CAD", new BigDecimal("1.3"), "BRL", new BigDecimal("5")), null,
            List.of(rate("MXN", "18", "2026-09-06", "fallback"), rate("CAD", "1.3", "2026-09-07", "official"),
                rate("BRL", "5", "2026-08-01", "official")), List.of());
        assertThat(BusinessExchangeRateEvidence.verifiedRates(snapshot, LocalDate.of(2026, 9, 6), true))
            .containsOnlyKeys("USD");
    }
    @Test
    void recentStaleEvidenceIsExplicitlyLimitedToAnalytics() {
        var snapshot = new BusinessExchangeRatesResponse("USD", Map.of("MXN", new BigDecimal("18")), null,
            List.of(rate("MXN", "18", "2026-09-04", "stale")), List.of());
        assertThat(BusinessExchangeRateEvidence.verifiedRates(snapshot, LocalDate.of(2026, 9, 6), true)).containsKey("MXN");
        assertThat(BusinessExchangeRateEvidence.verifiedRates(snapshot, LocalDate.of(2026, 9, 6), false)).doesNotContainKey("MXN");
    }
    private BusinessExchangeRateSourceResponse rate(String currency, String value, String date, String status) {
        return new BusinessExchangeRateSourceResponse(currency, new BigDecimal(value), date, "Test", "Test", "", "", status, "");
    }
}
