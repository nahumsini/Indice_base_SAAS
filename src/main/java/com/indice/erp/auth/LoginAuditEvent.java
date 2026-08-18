package com.indice.erp.auth;

import java.time.Instant;

public record LoginAuditEvent(
    String eventType,
    String stage,
    String outcome,
    String emailNormalized,
    String companyNameNormalized,
    Long userId,
    Long companyId,
    Long userCompanyId,
    String role,
    String failureReasonCode,
    String failureMessageSafe,
    String ipAddress,
    String userAgent,
    String requestId,
    String sessionId,
    Instant lockoutUntil,
    Integer attemptsUsed
) {

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String eventType = "LOGIN";
        private String stage = "PASSWORD";
        private String outcome = "FAILURE";
        private String emailNormalized = "";
        private String companyNameNormalized = "";
        private Long userId;
        private Long companyId;
        private Long userCompanyId;
        private String role;
        private String failureReasonCode;
        private String failureMessageSafe;
        private String ipAddress = "";
        private String userAgent = "";
        private String requestId = "";
        private String sessionId = "";
        private Instant lockoutUntil;
        private Integer attemptsUsed;

        public Builder eventType(String eventType) {
            this.eventType = eventType;
            return this;
        }

        public Builder stage(String stage) {
            this.stage = stage;
            return this;
        }

        public Builder outcome(String outcome) {
            this.outcome = outcome;
            return this;
        }

        public Builder emailNormalized(String emailNormalized) {
            this.emailNormalized = emailNormalized;
            return this;
        }

        public Builder companyNameNormalized(String companyNameNormalized) {
            this.companyNameNormalized = companyNameNormalized;
            return this;
        }

        public Builder userId(Long userId) {
            this.userId = userId;
            return this;
        }

        public Builder companyId(Long companyId) {
            this.companyId = companyId;
            return this;
        }

        public Builder userCompanyId(Long userCompanyId) {
            this.userCompanyId = userCompanyId;
            return this;
        }

        public Builder role(String role) {
            this.role = role;
            return this;
        }

        public Builder failureReasonCode(String failureReasonCode) {
            this.failureReasonCode = failureReasonCode;
            return this;
        }

        public Builder failureMessageSafe(String failureMessageSafe) {
            this.failureMessageSafe = failureMessageSafe;
            return this;
        }

        public Builder context(LoginAuditContext context) {
            if (context != null) {
                this.ipAddress = context.ipAddress();
                this.userAgent = context.userAgent();
                this.sessionId = context.sessionId();
            }
            return this;
        }

        public Builder requestId(String requestId) {
            this.requestId = requestId;
            return this;
        }

        public Builder sessionId(String sessionId) {
            this.sessionId = sessionId;
            return this;
        }

        public Builder lockoutUntil(Instant lockoutUntil) {
            this.lockoutUntil = lockoutUntil;
            return this;
        }

        public Builder attemptsUsed(Integer attemptsUsed) {
            this.attemptsUsed = attemptsUsed;
            return this;
        }

        public LoginAuditEvent build() {
            return new LoginAuditEvent(
                eventType,
                stage,
                outcome,
                emailNormalized,
                companyNameNormalized,
                userId,
                companyId,
                userCompanyId,
                role,
                failureReasonCode,
                failureMessageSafe,
                ipAddress,
                userAgent,
                requestId,
                sessionId,
                lockoutUntil,
                attemptsUsed
            );
        }
    }
}
