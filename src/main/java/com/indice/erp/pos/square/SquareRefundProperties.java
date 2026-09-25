package com.indice.erp.pos.square;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.pos.square.refunds")
class SquareRefundProperties {
    private boolean enabled;
    private int submissionMaxAttempts = 3;
    private int recoveryMaxAttempts = 20;
    private long recoveryDelaySeconds = 300;
    private long recoveryJobDelayMs = 30_000;
    int submissionAttempts() { return Math.clamp(submissionMaxAttempts, 1, 10); }
    int recoveryAttempts() { return Math.clamp(recoveryMaxAttempts, 1, 100); }
    long recoveryDelay() { return Math.clamp(recoveryDelaySeconds, 30, 3600); }
    public long recoveryJobDelay() { return Math.clamp(recoveryJobDelayMs, 5_000, 300_000); }
}
