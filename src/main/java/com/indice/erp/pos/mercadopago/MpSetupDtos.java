package com.indice.erp.pos.mercadopago;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class MpSetupDtos {
    private MpSetupDtos() {}
    public record Status(boolean enabled, String environment, boolean connected, String merchantId,
        String connectionState, String countryCode, String activationState, boolean liveChargeAllowed) {}
    public record OAuthStart(String authorizationUrl) {}
    public record OAuthComplete(@NotBlank @Size(max = 512) String code,
        @NotBlank @Size(min = 43, max = 43) String state) {
        @Override public String toString() { return "MercadoPagoOAuthComplete[redacted]"; }
    }
    public record Assignment(@Positive long terminalId) {}
    public record Terminal(long terminalId, String name, String providerTerminalId, String storeId,
        String posId, String status, String operatingMode, Long assignedRegisterId,
        String verificationStatus, Instant providerLastSeenAt, Instant providerVerifiedAt,
        String verificationFailureCode, long version) {}
}
