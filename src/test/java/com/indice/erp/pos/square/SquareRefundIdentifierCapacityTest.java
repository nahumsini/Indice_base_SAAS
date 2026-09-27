package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SquareRefundIdentifierCapacityTest {
    @Test void acceptsDocumentedMaximumLengthRefundId() throws Exception {
        var id="r".repeat(255); var mapper=new ObjectMapper();
        var node=mapper.readTree("""
            {"payment_id":"payment-1","status":"COMPLETED","location_id":"loc-1",
             "amount_money":{"amount":250,"currency":"CAD"}}
            """);
        ((com.fasterxml.jackson.databind.node.ObjectNode)node).put("id",id);
        var refund=SquareRefundFixtures.refund("PENDING",id,null);
        assertThat(new SquareRefundEvidencePolicy(mapper).verify(
            SquareRefundFixtures.intent(),refund,node).id()).hasSize(255);
    }
}
