package com.indice.erp.pos.mercadopago;

import java.time.Instant;

public record MpPaymentPrepared(MpTerminal terminal, MpConnection connection, MpPaymentDraft draft,
        String reference, String providerJson, Instant expiresAt) {
}
