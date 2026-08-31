package com.indice.erp.pos.square;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.pos.square")
public class SquareTerminalProperties {

    private boolean enabled;
    private String environment = "sandbox";
    private String applicationId = "";
    private String applicationSecret = "";
    private String applicationSecretFile = "";
    private String webhookSignatureKey = "";
    private String webhookSignatureKeyFile = "";
    private String webhookNotificationUrl = "";
    private String redirectUrl = "";
    private String apiVersion = "2026-08-20";
    private String tokenProtectionSecret = "";
    private long paymentTimeoutSeconds = 300;
    private long oauthStateTtlSeconds = 600;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getEnvironment() { return clean(environment); }
    public void setEnvironment(String environment) { this.environment = clean(environment); }
    public String getApplicationId() { return clean(applicationId); }
    public void setApplicationId(String applicationId) { this.applicationId = clean(applicationId); }
    public String getApplicationSecret() { return clean(applicationSecret); }
    public void setApplicationSecret(String applicationSecret) { this.applicationSecret = clean(applicationSecret); }
    public String getApplicationSecretFile() { return clean(applicationSecretFile); }
    public void setApplicationSecretFile(String applicationSecretFile) { this.applicationSecretFile = clean(applicationSecretFile); }
    public String getWebhookSignatureKey() { return clean(webhookSignatureKey); }
    public void setWebhookSignatureKey(String webhookSignatureKey) { this.webhookSignatureKey = clean(webhookSignatureKey); }
    public String getWebhookSignatureKeyFile() { return clean(webhookSignatureKeyFile); }
    public void setWebhookSignatureKeyFile(String webhookSignatureKeyFile) { this.webhookSignatureKeyFile = clean(webhookSignatureKeyFile); }
    public String getWebhookNotificationUrl() { return clean(webhookNotificationUrl); }
    public void setWebhookNotificationUrl(String webhookNotificationUrl) { this.webhookNotificationUrl = clean(webhookNotificationUrl); }
    public String getRedirectUrl() { return clean(redirectUrl); }
    public void setRedirectUrl(String redirectUrl) { this.redirectUrl = clean(redirectUrl); }
    public String getApiVersion() { return clean(apiVersion); }
    public void setApiVersion(String apiVersion) { this.apiVersion = clean(apiVersion); }
    public String getTokenProtectionSecret() { return clean(tokenProtectionSecret); }
    public void setTokenProtectionSecret(String tokenProtectionSecret) { this.tokenProtectionSecret = clean(tokenProtectionSecret); }
    public long getPaymentTimeoutSeconds() { return paymentTimeoutSeconds; }
    public void setPaymentTimeoutSeconds(long paymentTimeoutSeconds) { this.paymentTimeoutSeconds = paymentTimeoutSeconds; }
    public long getOauthStateTtlSeconds() { return oauthStateTtlSeconds; }
    public void setOauthStateTtlSeconds(long oauthStateTtlSeconds) { this.oauthStateTtlSeconds = oauthStateTtlSeconds; }

    public String apiBaseUrl() {
        return isProduction() ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
    }

    public boolean isProduction() {
        return "production".equalsIgnoreCase(getEnvironment());
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
