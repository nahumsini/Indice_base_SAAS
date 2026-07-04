package com.indice.erp.exchange;

public record BusinessExchangeRateMetadataResponse(
    String mode,
    String source,
    String sourceDate,
    String updatedAt,
    String sourceName,
    String sourceUrl,
    String licenseUrl,
    String sourceSummary
) {
}
