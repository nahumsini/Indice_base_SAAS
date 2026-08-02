package com.indice.erp.billing.storage;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.billing.storage")
public class StorageQuotaProperties {

    public static final long FIVE_GIB = 5L * 1024L * 1024L * 1024L;
    public static final long ONE_GIB = 1024L * 1024L * 1024L;

    private boolean enforcementEnabled;
    private long includedBytes = FIVE_GIB;
    private long blockBytes = ONE_GIB;
    private int reservationTtlMinutes = 30;
    private int cleanupBatchSize = 200;
    private long cleanupDelayMs = 300_000;

    public boolean isEnforcementEnabled() { return enforcementEnabled; }
    public void setEnforcementEnabled(boolean value) { this.enforcementEnabled = value; }
    public long getIncludedBytes() { return includedBytes; }
    public void setIncludedBytes(long value) { this.includedBytes = Math.max(0, value); }
    public long getBlockBytes() { return blockBytes; }
    public void setBlockBytes(long value) { this.blockBytes = Math.max(1, value); }
    public int getReservationTtlMinutes() { return reservationTtlMinutes; }
    public void setReservationTtlMinutes(int value) { this.reservationTtlMinutes = Math.max(5, value); }
    public int getCleanupBatchSize() { return cleanupBatchSize; }
    public void setCleanupBatchSize(int value) { this.cleanupBatchSize = Math.max(1, Math.min(1000, value)); }
    public long getCleanupDelayMs() { return cleanupDelayMs; }
    public void setCleanupDelayMs(long value) { this.cleanupDelayMs = Math.max(60_000, value); }
    public Duration reservationTtl() { return Duration.ofMinutes(reservationTtlMinutes); }
}
