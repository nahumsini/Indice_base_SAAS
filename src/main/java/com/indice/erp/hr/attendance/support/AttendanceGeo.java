package com.indice.erp.hr.attendance.support;

import java.math.BigDecimal;

import static com.indice.erp.hr.attendance.support.AttendanceGeo.distanceMeters;


public final class AttendanceGeo {

    private static final double EARTH_RADIUS_METERS = 6_371_000d;

    private AttendanceGeo() {
    }

    public static double distanceMeters(
        BigDecimal latitudeA,
        BigDecimal longitudeA,
        BigDecimal latitudeB,
        BigDecimal longitudeB
    ) {
        var lat1 = Math.toRadians(latitudeA.doubleValue());
        var lon1 = Math.toRadians(longitudeA.doubleValue());
        var lat2 = Math.toRadians(latitudeB.doubleValue());
        var lon2 = Math.toRadians(longitudeB.doubleValue());

        var deltaLat = lat2 - lat1;
        var deltaLon = lon2 - lon1;
        var haversine = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
            + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        var centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
        return EARTH_RADIUS_METERS * centralAngle;
    }
}
