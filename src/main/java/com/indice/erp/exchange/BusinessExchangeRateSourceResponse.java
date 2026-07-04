package com.indice.erp.exchange;

import java.math.BigDecimal;

public record BusinessExchangeRateSourceResponse(
    String currencyCode,
    BigDecimal ratePerUsd,
    String observedDate,
    String institution,
    String dataset,
    String sourceUrl,
    String licenseUrl,
    String status,
    String note
) {
}
