package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SquareRefundReplayPaymentProofTest {
    private final ObjectMapper mapper=new ObjectMapper();
    private final SquareRefundPaymentProof proof=new SquareRefundPaymentProof();
    @Test void replayRequiresTheExactOriginalBaseline() throws Exception {
        var intent=SquareRefundFixtures.intent(); var refund=SquareRefundFixtures.refund(
            "SUBMITTING",null,"lease",1,1,0,5L);
        assertThatCode(() -> proof.requireReplay(intent,refund,payment(0))).doesNotThrowAnyException();
        assertThatThrownBy(() -> proof.requireReplay(intent,refund,payment(250)))
            .isInstanceOf(SquareRefundEvidenceException.class);
        assertThatThrownBy(() -> proof.requireReplay(intent,refund,payment(100)))
            .isInstanceOf(SquareRefundEvidenceException.class);
    }
    @Test void firstSubmissionStillRequiresTheExactOriginalBaseline() throws Exception {
        assertThatThrownBy(() -> proof.require(SquareRefundFixtures.intent(),
            SquareRefundFixtures.refund("WAITING",null,null),payment(250)))
            .isInstanceOf(SquareRefundEvidenceException.class);
    }
    private com.fasterxml.jackson.databind.JsonNode payment(long refunded) throws Exception {
        return mapper.readTree("""
            {"id":"payment-1","status":"COMPLETED","location_id":"loc-1",
             "terminal_checkout_id":"checkout-1","amount_money":{"amount":1050,"currency":"CAD"},
             "refunded_money":{"amount":%d,"currency":"CAD"}}
            """.formatted(refunded));
    }
}
