package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SquareRefundStoredRequestPolicyTest {
    private final ObjectMapper mapper=new ObjectMapper();
    private final SquareRefundStoredRequestPolicy policy=new SquareRefundStoredRequestPolicy();
    @Test void exactPersistedBodyMatchesItsHashAndImmutableFields() throws Exception {
        var json=json(250); var refund=SquareRefundFixtures.request(
            SquareRefundFixtures.refund("SUBMITTING",null,"lease"),json,SquareHashing.sha256(json));
        assertThatCode(() -> policy.require(SquareRefundFixtures.intent(),refund,mapper.readTree(json)))
            .doesNotThrowAnyException();
    }
    @Test void changedBodyIsRejectedEvenWhenItsJsonStillParses() throws Exception {
        var original=json(250); var changed=json(100); var refund=SquareRefundFixtures.request(
            SquareRefundFixtures.refund("SUBMITTING",null,"lease"),changed,SquareHashing.sha256(original));
        assertThatThrownBy(() -> policy.require(SquareRefundFixtures.intent(),refund,mapper.readTree(changed)))
            .isInstanceOf(SquareRefundEvidenceException.class);
    }
    private String json(long amount) {
        return """
            {"idempotency_key":"refund_key","amount_money":{"amount":%d,"currency":"CAD"},
             "payment_id":"payment-1","reason":"Return"}
            """.formatted(amount);
    }
}
