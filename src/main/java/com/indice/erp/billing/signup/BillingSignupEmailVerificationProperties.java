package com.indice.erp.billing.signup;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.billing.signup.email-verification")
public class BillingSignupEmailVerificationProperties {

    private boolean enabled = true;
    private int otpTtlSeconds = 600;
    private int verifiedTtlSeconds = 86_400;
    private int maxAttempts = 5;
    private int resendCooldownSeconds = 30;
    private int sendWindowMinutes = 30;
    private int sendMaxRequests = 5;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getOtpTtlSeconds() {
        return Math.max(60, otpTtlSeconds);
    }

    public void setOtpTtlSeconds(int otpTtlSeconds) {
        this.otpTtlSeconds = otpTtlSeconds;
    }

    public int getVerifiedTtlSeconds() {
        return Math.max(getOtpTtlSeconds(), verifiedTtlSeconds);
    }

    public void setVerifiedTtlSeconds(int verifiedTtlSeconds) {
        this.verifiedTtlSeconds = verifiedTtlSeconds;
    }

    public int getMaxAttempts() {
        return Math.max(1, maxAttempts);
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public int getResendCooldownSeconds() {
        return Math.max(0, resendCooldownSeconds);
    }

    public void setResendCooldownSeconds(int resendCooldownSeconds) {
        this.resendCooldownSeconds = resendCooldownSeconds;
    }

    public int getSendWindowMinutes() {
        return Math.max(1, sendWindowMinutes);
    }

    public void setSendWindowMinutes(int sendWindowMinutes) {
        this.sendWindowMinutes = sendWindowMinutes;
    }

    public int getSendMaxRequests() {
        return Math.max(1, sendMaxRequests);
    }

    public void setSendMaxRequests(int sendMaxRequests) {
        this.sendMaxRequests = sendMaxRequests;
    }
}
