package com.indice.erp.pos.mercadopago;

record MpOAuthState(long companyId, long actorUserId, String environment, String verifierCiphertext) {
    @Override public String toString() { return "MercadoPagoOAuthState[redacted]"; }
}
