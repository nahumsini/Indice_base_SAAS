package com.indice.erp.billing.stripe;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.billing.stripe")
public class StripePhaseTwoProperties {

    private boolean enabled;
    private String mode = "test";
    private String secretKey = "";
    private String secretKeyFile = "";
    private String webhookSecret = "";
    private String webhookSecretFile = "";
    private String successUrl = "";
    private String cancelUrl = "";
    private boolean automaticTaxEnabled = true;
    private boolean taxIdCollectionEnabled = true;
    private String priceBasic1Monthly = "";
    private String priceBasic1Annual = "";
    private String priceBasic2Monthly = "";
    private String priceBasic2Annual = "";
    private String priceBasic3Monthly = "";
    private String priceBasic3Annual = "";
    private String priceBasicAllMonthly = "";
    private String priceBasicAllAnnual = "";
    private String priceExtraSeatMonthly = "";
    private String priceExtraSeatAnnual = "";
    private boolean processorEnabled;
    private long processorDelayMs = 5_000;
    private int batchSize = 25;
    private int maxAttempts = 12;
    private int leaseSeconds = 120;
    private int payloadRetentionDays = 90;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = normalized(mode);
    }

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = normalized(secretKey);
    }

    public String getSecretKeyFile() {
        return secretKeyFile;
    }

    public void setSecretKeyFile(String secretKeyFile) {
        this.secretKeyFile = normalized(secretKeyFile);
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
        this.webhookSecret = normalized(webhookSecret);
    }

    public String getWebhookSecretFile() {
        return webhookSecretFile;
    }

    public void setWebhookSecretFile(String webhookSecretFile) {
        this.webhookSecretFile = normalized(webhookSecretFile);
    }

    public String getSuccessUrl() {
        return successUrl;
    }

    public void setSuccessUrl(String successUrl) {
        this.successUrl = normalized(successUrl);
    }

    public String getCancelUrl() {
        return cancelUrl;
    }

    public void setCancelUrl(String cancelUrl) {
        this.cancelUrl = normalized(cancelUrl);
    }

    public boolean isAutomaticTaxEnabled() {
        return automaticTaxEnabled;
    }

    public void setAutomaticTaxEnabled(boolean automaticTaxEnabled) {
        this.automaticTaxEnabled = automaticTaxEnabled;
    }

    public boolean isTaxIdCollectionEnabled() {
        return taxIdCollectionEnabled;
    }

    public void setTaxIdCollectionEnabled(boolean taxIdCollectionEnabled) {
        this.taxIdCollectionEnabled = taxIdCollectionEnabled;
    }

    public String getPriceBasic1Monthly() {
        return priceBasic1Monthly;
    }

    public void setPriceBasic1Monthly(String value) {
        this.priceBasic1Monthly = normalized(value);
    }

    public String getPriceBasic1Annual() {
        return priceBasic1Annual;
    }

    public void setPriceBasic1Annual(String value) {
        this.priceBasic1Annual = normalized(value);
    }

    public String getPriceBasic2Monthly() {
        return priceBasic2Monthly;
    }

    public void setPriceBasic2Monthly(String value) {
        this.priceBasic2Monthly = normalized(value);
    }

    public String getPriceBasic2Annual() {
        return priceBasic2Annual;
    }

    public void setPriceBasic2Annual(String value) {
        this.priceBasic2Annual = normalized(value);
    }

    public String getPriceBasic3Monthly() {
        return priceBasic3Monthly;
    }

    public void setPriceBasic3Monthly(String value) {
        this.priceBasic3Monthly = normalized(value);
    }

    public String getPriceBasic3Annual() {
        return priceBasic3Annual;
    }

    public void setPriceBasic3Annual(String value) {
        this.priceBasic3Annual = normalized(value);
    }

    public String getPriceBasicAllMonthly() {
        return priceBasicAllMonthly;
    }

    public void setPriceBasicAllMonthly(String value) {
        this.priceBasicAllMonthly = normalized(value);
    }

    public String getPriceBasicAllAnnual() {
        return priceBasicAllAnnual;
    }

    public void setPriceBasicAllAnnual(String value) {
        this.priceBasicAllAnnual = normalized(value);
    }

    public String getPriceExtraSeatMonthly() {
        return priceExtraSeatMonthly;
    }

    public void setPriceExtraSeatMonthly(String value) {
        this.priceExtraSeatMonthly = normalized(value);
    }

    public String getPriceExtraSeatAnnual() {
        return priceExtraSeatAnnual;
    }

    public void setPriceExtraSeatAnnual(String value) {
        this.priceExtraSeatAnnual = normalized(value);
    }

    public boolean isProcessorEnabled() {
        return processorEnabled;
    }

    public void setProcessorEnabled(boolean processorEnabled) {
        this.processorEnabled = processorEnabled;
    }

    public long getProcessorDelayMs() {
        return processorDelayMs;
    }

    public void setProcessorDelayMs(long processorDelayMs) {
        this.processorDelayMs = Math.max(1_000, processorDelayMs);
    }

    public int getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(int batchSize) {
        this.batchSize = Math.max(1, Math.min(100, batchSize));
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = Math.max(1, maxAttempts);
    }

    public int getLeaseSeconds() {
        return leaseSeconds;
    }

    public void setLeaseSeconds(int leaseSeconds) {
        this.leaseSeconds = Math.max(30, leaseSeconds);
    }

    public int getPayloadRetentionDays() {
        return payloadRetentionDays;
    }

    public void setPayloadRetentionDays(int payloadRetentionDays) {
        this.payloadRetentionDays = Math.max(1, payloadRetentionDays);
    }

    public String priceId(String offerCode, String billingInterval) {
        var annual = "YEAR".equalsIgnoreCase(billingInterval);
        return switch (offerCode) {
            case "basic_1" -> annual ? priceBasic1Annual : priceBasic1Monthly;
            case "basic_2" -> annual ? priceBasic2Annual : priceBasic2Monthly;
            case "basic_3" -> annual ? priceBasic3Annual : priceBasic3Monthly;
            case "basic_all" -> annual ? priceBasicAllAnnual : priceBasicAllMonthly;
            case "extra_seat" -> annual ? priceExtraSeatAnnual : priceExtraSeatMonthly;
            default -> "";
        };
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim();
    }
}
