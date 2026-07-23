package com.indice.erp.billing.stripe;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.billing.stripe")
public class StripeSignupProperties {

    private String secretKey = "";
    private String webhookSecret = "";
    private String successUrl = "";
    private String cancelUrl = "";
    private String portalReturnUrl = "";
    private boolean automaticTaxEnabled;
    private boolean taxIdCollectionEnabled = true;
    private String priceOneModule = "";
    private String priceTwoModules = "";
    private String priceAdditionalModule = "";
    private String priceAllBasicModules = "";
    private String priceExtraCollaborator = "";
    private int paymentFailureGraceDays;

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = clean(secretKey);
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
        this.webhookSecret = clean(webhookSecret);
    }

    public String getSuccessUrl() {
        return successUrl;
    }

    public void setSuccessUrl(String successUrl) {
        this.successUrl = clean(successUrl);
    }

    public String getCancelUrl() {
        return cancelUrl;
    }

    public void setCancelUrl(String cancelUrl) {
        this.cancelUrl = clean(cancelUrl);
    }

    public String getPortalReturnUrl() {
        return portalReturnUrl;
    }

    public void setPortalReturnUrl(String portalReturnUrl) {
        this.portalReturnUrl = clean(portalReturnUrl);
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

    public String priceId(String planId) {
        return switch (planId) {
            case "one-module" -> clean(priceOneModule);
            case "two-modules" -> clean(priceTwoModules);
            case "custom-modules" -> clean(priceTwoModules);
            case "all-modules" -> clean(priceAllBasicModules);
            default -> "";
        };
    }

    public String getPriceAdditionalModule() {
        return clean(priceAdditionalModule);
    }

    public String getPriceExtraCollaborator() {
        return clean(priceExtraCollaborator);
    }

    public void setPriceOneModule(String value) {
        this.priceOneModule = clean(value);
    }

    public void setPriceTwoModules(String value) {
        this.priceTwoModules = clean(value);
    }

    public void setPriceAdditionalModule(String value) {
        this.priceAdditionalModule = clean(value);
    }

    public void setPriceAllBasicModules(String value) {
        this.priceAllBasicModules = clean(value);
    }

    public void setPriceExtraCollaborator(String value) {
        this.priceExtraCollaborator = clean(value);
    }

    public int getPaymentFailureGraceDays() {
        return paymentFailureGraceDays;
    }

    public void setPaymentFailureGraceDays(int paymentFailureGraceDays) {
        this.paymentFailureGraceDays = Math.max(0, paymentFailureGraceDays);
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
