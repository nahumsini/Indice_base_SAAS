package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;

public interface MpPointGateway {
    JsonNode createOrder(String token, String immutableJson, String idempotencyKey);
    JsonNode getOrder(String token, String orderId);
    JsonNode getPayment(String token, String numericPaymentId);
    JsonNode cancelOrder(String token, String orderId, String idempotencyKey);
    JsonNode refundOrder(String token, String orderId, String immutableJson, String idempotencyKey);
}
