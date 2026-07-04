package com.indice.erp.exchange;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record BusinessExchangeRatesResponse(
    String baseCurrency,
    Map<String, BigDecimal> ratesPerUsd,
    BusinessExchangeRateMetadataResponse metadata,
    List<BusinessExchangeRateSourceResponse> sources,
    List<String> warnings
) {
}
