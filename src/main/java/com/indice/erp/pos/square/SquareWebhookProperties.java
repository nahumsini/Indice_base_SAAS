package com.indice.erp.pos.square;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.pos.square")
class SquareWebhookProperties {
    private int maxWebhookBytes = 262_144;
    private int webhookRateLimitPerMinute = 120;
    int getMaxWebhookBytes() { return maxWebhookBytes; }
    void setMaxWebhookBytes(int value) { maxWebhookBytes = value; }
    int getWebhookRateLimitPerMinute() { return webhookRateLimitPerMinute; }
    void setWebhookRateLimitPerMinute(int value) { webhookRateLimitPerMinute = value; }
}
