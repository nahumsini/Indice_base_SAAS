package com.indice.erp.pos.mercadopago;

import java.time.Instant;

public record MpConnection(long id, long companyId, String sellerId, String environment, String state,
    String countryCode, String siteId, boolean liveMode, String accessTokenCiphertext,
    String refreshTokenCiphertext, Instant expiresAt, String scopes, MpCompanyActivation activation, long version,
    String refreshLeaseId, Instant refreshLeaseUntil) {
    String purpose(String kind) { return environment + ":" + sellerId + ":" + kind; }
    @Override public String toString() { return "MercadoPagoConnection[id=" + id + ",company=" + companyId + "]"; }
}
