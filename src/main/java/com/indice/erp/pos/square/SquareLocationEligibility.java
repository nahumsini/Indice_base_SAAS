package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.util.Map;

final class SquareLocationEligibility {
    private static final Map<String, String> CURRENCIES = Map.of("US", "USD", "CA", "CAD", "AU", "AUD", "JP", "JPY",
        "GB", "GBP", "IE", "EUR", "FR", "EUR", "ES", "EUR");
    private SquareLocationEligibility() {}
    static void require(String country, String locationCurrency, String checkoutCurrency) {
        var expected = CURRENCIES.get(country == null ? "" : country);
        if (expected == null || !expected.equals(locationCurrency) || !expected.equals(checkoutCurrency))
            throw PosApiException.conflict("Square location country and currency are not eligible for this payment.");
    }
}
