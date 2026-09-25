package com.indice.erp.pos.mercadopago;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@lombok.ToString(onlyExplicitlyIncluded = true)
@Component
@ConfigurationProperties(prefix = "app.pos.mercado-pago")
public class MpProperties {
    private boolean enabled;
    private String environment = "sandbox";
    private String applicationId = "";
    private String applicationSecret = "";
    private String applicationSecretFile = "";
    private String webhookSecret = "";
    private String webhookSecretFile = "";
    private String redirectUrl = "";
    private String tokenProtectionSecret = "";
    private String tokenProtectionSecretFile = "";
    private long paymentTimeoutSeconds = 600;
    private long oauthStateTtlSeconds = 600;
    private long webhookToleranceSeconds = 300;
    private long requestTimeoutSeconds = 15;
    private long reconciliationDelayMs = 30000;
    private long terminalVerificationMaxAgeSeconds = 60;
    private int refundSubmissionMaxAttempts = 3;
    private int refundRecoveryMaxAttempts = 20;
    private long refundRecoveryDelaySeconds = 300;

    public String environment() {
        if ("sandbox".equals(environment) || "production".equals(environment)) return environment;
        throw com.indice.erp.pos.PosApiException.serviceUnavailable("Mercado Pago environment is invalid.");
    }

    public boolean isProduction() { return "production".equals(environment()); }
    public long verificationMaxAgeSeconds() {
        if (terminalVerificationMaxAgeSeconds < 10 || terminalVerificationMaxAgeSeconds > 3600)
            throw com.indice.erp.pos.PosApiException.serviceUnavailable("Point terminal verification age is invalid.");
        return terminalVerificationMaxAgeSeconds;
    }
    public int refundSubmissionAttempts() { return Math.clamp(refundSubmissionMaxAttempts, 1, 10); }
    public int refundRecoveryAttempts() { return Math.clamp(refundRecoveryMaxAttempts, 1, 100); }
    public long refundRecoveryDelaySeconds() { return Math.clamp(refundRecoveryDelaySeconds, 30, 3600); }
}
