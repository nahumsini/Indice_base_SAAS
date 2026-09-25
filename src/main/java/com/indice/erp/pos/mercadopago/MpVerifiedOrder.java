package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;

public record MpVerifiedOrder(JsonNode order, MpEvidence evidence) {
}
