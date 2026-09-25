package com.indice.erp.pos.square;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.pos.square")
class SquareTransportProperties {
    private long connectTimeoutSeconds = 5;
    private long requestTimeoutSeconds = 20;
    private int maxResponseBytes = 262_144;
    long getConnectTimeoutSeconds() { return connectTimeoutSeconds; }
    void setConnectTimeoutSeconds(long value) { connectTimeoutSeconds = value; }
    long getRequestTimeoutSeconds() { return requestTimeoutSeconds; }
    void setRequestTimeoutSeconds(long value) { requestTimeoutSeconds = value; }
    int getMaxResponseBytes() { return maxResponseBytes; }
    void setMaxResponseBytes(int value) { maxResponseBytes = value; }
}
