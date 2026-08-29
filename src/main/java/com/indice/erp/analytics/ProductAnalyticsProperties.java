package com.indice.erp.analytics;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.product-analytics")
public class ProductAnalyticsProperties {

    private String webIngestToken = "";

    public String getWebIngestToken() {
        return webIngestToken;
    }

    public void setWebIngestToken(String webIngestToken) {
        this.webIngestToken = webIngestToken == null ? "" : webIngestToken.trim();
    }

    public boolean webIngestConfigured() {
        return !webIngestToken.isBlank();
    }
}
