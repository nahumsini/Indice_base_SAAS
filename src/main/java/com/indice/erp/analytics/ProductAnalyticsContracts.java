package com.indice.erp.analytics;

public final class ProductAnalyticsContracts {

    private ProductAnalyticsContracts() {
    }

    public record ObservationRequest(
        String sessionKey,
        String eventType,
        String routeKey,
        String sectionKey,
        Integer activeSeconds,
        String locale,
        String deviceType,
        String visitorKey,
        String source,
        String medium,
        String campaign,
        String referrerHost
    ) {
    }
}
