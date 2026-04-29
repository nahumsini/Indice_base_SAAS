package com.indice.erp.location;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class GoogleMapsCoordinateExtractorTest {

    private final GoogleMapsCoordinateExtractor extractor = new GoogleMapsCoordinateExtractor();

    @Test
    void extractsCoordinatesFromGoogleMapsViewportLink() {
        var result = extractor.extractCoordinatesFromMapLink(Map.of(
            "map_url", "https://www.google.com/maps/@19.432608,-99.133209,17z"
        ));

        assertEquals(new BigDecimal("19.432608"), result.get("latitude"));
        assertEquals(new BigDecimal("-99.133209"), result.get("longitude"));
        assertEquals("https://www.google.com/maps/@19.432608,-99.133209,17z", result.get("resolved_url"));
    }

    @Test
    void rejectsNonGoogleLinks() {
        var error = assertThrows(IllegalArgumentException.class, () ->
            extractor.extractCoordinatesFromMapLink(Map.of("map_url", "https://example.com/@19.1,-99.1"))
        );

        assertEquals("Only Google Maps links are supported for coordinate extraction.", error.getMessage());
    }
}
