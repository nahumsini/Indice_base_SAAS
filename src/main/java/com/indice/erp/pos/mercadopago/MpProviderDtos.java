package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public final class MpProviderDtos {
    private MpProviderDtos() {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Tokens(@JsonProperty("access_token") String accessToken,
        @JsonProperty("refresh_token") String refreshToken, @JsonProperty("user_id") String userId,
        @JsonProperty("expires_in") long expiresIn, String scope, @JsonProperty("live_mode") Boolean liveMode) {
        @Override public String toString() { return "MercadoPagoTokens[redacted]"; }
    }
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(String id, @JsonProperty("country_id") String countryId,
        @JsonProperty("site_id") String siteId) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Terminal(String id, @JsonProperty("store_id") String storeId,
        @JsonProperty("pos_id") String posId, @JsonProperty("operating_mode") String operatingMode) {}
}
