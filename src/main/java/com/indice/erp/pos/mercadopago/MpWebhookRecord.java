package com.indice.erp.pos.mercadopago;

public record MpWebhookRecord(long id, String environment, String orderId, int attempts) {
}
