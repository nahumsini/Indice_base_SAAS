package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.PosApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpHttpPointGateway implements MpPointGateway {
    private final MpHttpClient client;
    private final MpOrderInput input;

    public JsonNode createOrder(String token, String json, String key) {
        input.require(json);
        return client.request("POST", "/v1/orders", token, json, requireKey(key));
    }
    public JsonNode getOrder(String token, String id) {
        return client.request("GET", path(id), token, null, null);
    }
    public JsonNode getPayment(String token, String id) {
        if (id == null || !id.matches("[0-9]{1,32}")) throw PosApiException.badRequest("Invalid provider payment ID.");
        return client.request("GET", "/v1/payments/" + id, token, null, null);
    }
    public JsonNode cancelOrder(String token, String id, String key) {
        return client.request("POST", path(id) + "/cancel", token, null, requireKey(key));
    }
    public JsonNode refundOrder(String token, String id, String json, String key) {
        return client.request("POST", path(id) + "/refund", token, json, requireKey(key));
    }
    private String path(String id) {
        if (id == null || !id.matches("ORD[A-Za-z0-9_-]{1,125}")) throw PosApiException.badRequest("Invalid provider order ID.");
        return "/v1/orders/" + id;
    }
    private String requireKey(String key) {
        if (key == null || !key.matches("[A-Za-z0-9_-]{1,64}")) throw PosApiException.badRequest("Invalid provider retry key.");
        return key;
    }
}
