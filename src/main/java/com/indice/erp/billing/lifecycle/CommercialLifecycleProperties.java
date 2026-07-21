package com.indice.erp.billing.lifecycle;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.billing.lifecycle")
public class CommercialLifecycleProperties {

    private boolean enabled;
    private boolean schedulerEnabled;
    private int graceDays = 14;
    private int readOnlyDays = 14;
    private int retentionDays = 90;
    private long schedulerDelayMs = 60_000;
    private int schedulerBatchSize = 100;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public boolean isSchedulerEnabled() { return schedulerEnabled; }
    public void setSchedulerEnabled(boolean schedulerEnabled) { this.schedulerEnabled = schedulerEnabled; }
    public int getGraceDays() { return graceDays; }
    public void setGraceDays(int graceDays) { this.graceDays = positive(graceDays, "graceDays"); }
    public int getReadOnlyDays() { return readOnlyDays; }
    public void setReadOnlyDays(int readOnlyDays) { this.readOnlyDays = positive(readOnlyDays, "readOnlyDays"); }
    public int getRetentionDays() { return retentionDays; }
    public void setRetentionDays(int retentionDays) { this.retentionDays = positive(retentionDays, "retentionDays"); }
    public long getSchedulerDelayMs() { return schedulerDelayMs; }
    public void setSchedulerDelayMs(long schedulerDelayMs) { this.schedulerDelayMs = Math.max(5_000, schedulerDelayMs); }
    public int getSchedulerBatchSize() { return schedulerBatchSize; }
    public void setSchedulerBatchSize(int schedulerBatchSize) { this.schedulerBatchSize = Math.max(1, schedulerBatchSize); }

    private int positive(int value, String name) {
        if (value < 1) throw new IllegalArgumentException(name + " must be positive.");
        return value;
    }
}
