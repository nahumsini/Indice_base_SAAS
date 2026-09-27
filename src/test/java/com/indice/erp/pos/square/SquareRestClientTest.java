package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class SquareRestClientTest {
    @Test void treatsRateLimitAndConflictAsAmbiguousMutations() {
        assertThat(SquareRestClient.ambiguous(408)).isTrue();
        assertThat(SquareRestClient.ambiguous(409)).isTrue();
        assertThat(SquareRestClient.ambiguous(425)).isTrue();
        assertThat(SquareRestClient.ambiguous(429)).isTrue();
        assertThat(SquareRestClient.ambiguous(500)).isTrue();
        assertThat(SquareRestClient.ambiguous(400)).isFalse();
    }
    @Test void rejectsOversizedProviderResponse() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var client = new SquareRestClient(builder.baseUrl("https://square.invalid").build(), new ObjectMapper(), 8);
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://square.invalid/test"))
            .andRespond(withSuccess("{\"long\":true}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.get("/test", "token")).isInstanceOf(SquareGatewayException.class)
            .satisfies(error -> assertThat(((SquareGatewayException) error).uncertain()).isTrue());
    }
    @Test void encodesOpaqueIdentifiersAsOnePathSegment() {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var client=new SquareRestClient(builder.baseUrl("https://square.invalid").build(),new ObjectMapper(),128);
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers
            .requestTo("https://square.invalid/v2/refunds/refund%2Fpart%3Fx%23y"))
            .andRespond(withSuccess("{}",MediaType.APPLICATION_JSON));
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers
            .requestTo("https://square.invalid/v2/checkouts/refund%2Fpart%3Fx%23y/cancel"))
            .andRespond(withSuccess("{}",MediaType.APPLICATION_JSON));
        client.get("/v2/refunds/{id}","token","refund/part?x#y");
        client.post("/v2/checkouts/{id}/cancel","token",java.util.Map.of(),"refund/part?x#y"); server.verify();
    }
}
