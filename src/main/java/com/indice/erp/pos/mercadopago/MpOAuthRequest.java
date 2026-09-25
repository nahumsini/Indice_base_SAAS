package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
record MpOAuthRequest(@JsonProperty("client_id") String clientId,
    @JsonProperty("client_secret") String clientSecret, @JsonProperty("grant_type") String grantType,
    String code, @JsonProperty("code_verifier") String codeVerifier,
    @JsonProperty("redirect_uri") String redirectUri, @JsonProperty("refresh_token") String refreshToken,
    @JsonProperty("test_token") Boolean testToken) {
    @Override public String toString() { return "MercadoPagoOAuthRequest[redacted]"; }
}
