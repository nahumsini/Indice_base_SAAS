package com.indice.erp.configcenter.support;

import java.math.BigDecimal;

public record ExistingBusiness(
    Long id,
    Long unitId,
    String name,
    BigDecimal latitude,
    BigDecimal longitude,
    Integer radiusMeters,
    String coordinateSource,
    String googleMapsUrl
) {
}
