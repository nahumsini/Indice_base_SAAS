package com.indice.erp.pos.square;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SquareRefundReservationJsonIntegrationTest extends SquarePaymentDatabaseFixture {
    @Test void mysqlCanonicalBodyIsTheHashReplayAndSubmissionAuthority() {
        var request=new SquareRefundRequest("refund-json-key",new BigDecimal("2.50"),"Return item");
        var first=reservation.reserve(context,intent.id(),request);
        var replay=reservation.reserve(context,intent.id(),request);
        assertThat(first.payloadHash()).isEqualTo(SquareHashing.sha256(first.requestJson()));
        assertThat(replay.id()).isEqualTo(first.id());
        assertThat(replay.requestJson()).isEqualTo(first.requestJson());
        assertThat(replay.payloadHash()).isEqualTo(first.payloadHash());
    }
}
