package com.indice.erp.configcenter.support;

import java.math.BigDecimal;

public record CoordinateInput(
    BigDecimal latitude,
    BigDecimal longitude,
    Integer radiusMeters,
    String coordinateSource,
    String googleMapsUrl
) {
    public boolean hasCoordinates() {
        return latitude != null && longitude != null;
    }
}
