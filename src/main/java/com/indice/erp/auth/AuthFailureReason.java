package com.indice.erp.auth;

public final class AuthFailureReason {

    public static final String MISSING_COMPANY = "MISSING_COMPANY";
    public static final String MISSING_EMAIL_OR_PASSWORD = "MISSING_EMAIL_OR_PASSWORD";
    public static final String USER_NOT_FOUND = "USER_NOT_FOUND";
    public static final String PASSWORD_INVALID = "PASSWORD_INVALID";
    public static final String COMPANY_NOT_FOUND = "COMPANY_NOT_FOUND";
    public static final String MEMBERSHIP_NOT_FOUND = "MEMBERSHIP_NOT_FOUND";
    public static final String MEMBERSHIP_INACTIVE = "MEMBERSHIP_INACTIVE";
    public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";
    public static final String RATE_LIMITED = "RATE_LIMITED";
    public static final String MFA_REQUIRED = "MFA_REQUIRED";
    public static final String MFA_OTP_INVALID = "MFA_OTP_INVALID";
    public static final String MFA_OTP_EXPIRED = "MFA_OTP_EXPIRED";
    public static final String MFA_OTP_LOCKED = "MFA_OTP_LOCKED";
    public static final String MFA_OTP_USED = "MFA_OTP_USED";
    public static final String MFA_CHALLENGE_NOT_FOUND = "MFA_CHALLENGE_NOT_FOUND";
    public static final String MFA_SESSION_MISMATCH = "MFA_SESSION_MISMATCH";
    public static final String MFA_EMAIL_FAILED = "MFA_EMAIL_FAILED";
    public static final String CSRF_INVALID = "CSRF_INVALID";
    public static final String SESSION_IDLE_TIMEOUT = "SESSION_IDLE_TIMEOUT";
    public static final String SESSION_ABSOLUTE_TIMEOUT = "SESSION_ABSOLUTE_TIMEOUT";

    private AuthFailureReason() {
    }
}
