package com.indice.erp.auth;

import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public class AuthSecurityProperties {

    private boolean mfaEnabled = true;
    private boolean mfaRequired = true;
    private int mfaOtpTtlSeconds = 300;
    private String mfaOtpHashSecret = "";
    private int mfaMaxAttempts = 5;
    private int mfaResendCooldownSeconds = 30;
    private int mfaSendWindowMinutes = 30;
    private int mfaSendMaxRequests = 5;
    private int loginLockoutAttempts = 5;
    private int loginLockoutMinutes = 30;
    private int sessionIdleTimeoutSeconds = 18_000;
    private int sessionIdleTimeoutRootSeconds = 1_800;
    private int sessionIdleTimeoutSuperadminSeconds = 3_600;
    private int sessionIdleTimeoutAdminSeconds = 7_200;
    private int sessionIdleTimeoutUserSeconds = 7_200;
    private int sessionAbsoluteTimeoutSeconds = 43_200;

    public boolean isMfaEnabled() {
        return mfaEnabled;
    }

    public void setMfaEnabled(boolean mfaEnabled) {
        this.mfaEnabled = mfaEnabled;
    }

    public boolean isMfaRequired() {
        return mfaRequired;
    }

    public void setMfaRequired(boolean mfaRequired) {
        this.mfaRequired = mfaRequired;
    }

    public int getMfaOtpTtlSeconds() {
        return Math.max(60, mfaOtpTtlSeconds);
    }

    public void setMfaOtpTtlSeconds(int mfaOtpTtlSeconds) {
        this.mfaOtpTtlSeconds = mfaOtpTtlSeconds;
    }

    public String getMfaOtpHashSecret() {
        return mfaOtpHashSecret == null ? "" : mfaOtpHashSecret.trim();
    }

    public void setMfaOtpHashSecret(String mfaOtpHashSecret) {
        this.mfaOtpHashSecret = mfaOtpHashSecret;
    }

    public int getMfaMaxAttempts() {
        return Math.max(1, mfaMaxAttempts);
    }

    public void setMfaMaxAttempts(int mfaMaxAttempts) {
        this.mfaMaxAttempts = mfaMaxAttempts;
    }

    public int getMfaResendCooldownSeconds() {
        return Math.max(0, mfaResendCooldownSeconds);
    }

    public void setMfaResendCooldownSeconds(int mfaResendCooldownSeconds) {
        this.mfaResendCooldownSeconds = mfaResendCooldownSeconds;
    }

    public int getMfaSendWindowMinutes() {
        return Math.max(1, mfaSendWindowMinutes);
    }

    public void setMfaSendWindowMinutes(int mfaSendWindowMinutes) {
        this.mfaSendWindowMinutes = mfaSendWindowMinutes;
    }

    public int getMfaSendMaxRequests() {
        return Math.max(1, mfaSendMaxRequests);
    }

    public void setMfaSendMaxRequests(int mfaSendMaxRequests) {
        this.mfaSendMaxRequests = mfaSendMaxRequests;
    }

    public int getLoginLockoutAttempts() {
        return Math.max(1, loginLockoutAttempts);
    }

    public void setLoginLockoutAttempts(int loginLockoutAttempts) {
        this.loginLockoutAttempts = loginLockoutAttempts;
    }

    public int getLoginLockoutMinutes() {
        return Math.max(1, loginLockoutMinutes);
    }

    public void setLoginLockoutMinutes(int loginLockoutMinutes) {
        this.loginLockoutMinutes = loginLockoutMinutes;
    }

    public int getSessionIdleTimeoutSeconds() {
        return Math.max(60, sessionIdleTimeoutSeconds);
    }

    public void setSessionIdleTimeoutSeconds(int sessionIdleTimeoutSeconds) {
        this.sessionIdleTimeoutSeconds = sessionIdleTimeoutSeconds;
    }

    public int getSessionIdleTimeoutRootSeconds() {
        return Math.max(60, sessionIdleTimeoutRootSeconds);
    }

    public void setSessionIdleTimeoutRootSeconds(int sessionIdleTimeoutRootSeconds) {
        this.sessionIdleTimeoutRootSeconds = sessionIdleTimeoutRootSeconds;
    }

    public int getSessionIdleTimeoutSuperadminSeconds() {
        return Math.max(60, sessionIdleTimeoutSuperadminSeconds);
    }

    public void setSessionIdleTimeoutSuperadminSeconds(int sessionIdleTimeoutSuperadminSeconds) {
        this.sessionIdleTimeoutSuperadminSeconds = sessionIdleTimeoutSuperadminSeconds;
    }

    public int getSessionIdleTimeoutAdminSeconds() {
        return Math.max(60, sessionIdleTimeoutAdminSeconds);
    }

    public void setSessionIdleTimeoutAdminSeconds(int sessionIdleTimeoutAdminSeconds) {
        this.sessionIdleTimeoutAdminSeconds = sessionIdleTimeoutAdminSeconds;
    }

    public int getSessionIdleTimeoutUserSeconds() {
        return Math.max(60, sessionIdleTimeoutUserSeconds);
    }

    public void setSessionIdleTimeoutUserSeconds(int sessionIdleTimeoutUserSeconds) {
        this.sessionIdleTimeoutUserSeconds = sessionIdleTimeoutUserSeconds;
    }

    public int getSessionIdleTimeoutSecondsForRole(String role) {
        return switch (normalizeRole(role)) {
            case "root" -> getSessionIdleTimeoutRootSeconds();
            case "super_admin", "superadmin", "owner", "dueno" -> getSessionIdleTimeoutSuperadminSeconds();
            case "admin", "manager", "approver" -> getSessionIdleTimeoutAdminSeconds();
            case "contributor", "viewer", "user" -> getSessionIdleTimeoutUserSeconds();
            default -> getSessionIdleTimeoutRootSeconds();
        };
    }

    public int getSessionAbsoluteTimeoutSeconds() {
        return Math.max(maxRoleIdleTimeoutSeconds(), sessionAbsoluteTimeoutSeconds);
    }

    public void setSessionAbsoluteTimeoutSeconds(int sessionAbsoluteTimeoutSeconds) {
        this.sessionAbsoluteTimeoutSeconds = sessionAbsoluteTimeoutSeconds;
    }

    private int maxRoleIdleTimeoutSeconds() {
        return Math.max(
            Math.max(getSessionIdleTimeoutRootSeconds(), getSessionIdleTimeoutSuperadminSeconds()),
            Math.max(getSessionIdleTimeoutAdminSeconds(), getSessionIdleTimeoutUserSeconds())
        );
    }

    private String normalizeRole(String role) {
        return role == null ? "" : role.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }
}
