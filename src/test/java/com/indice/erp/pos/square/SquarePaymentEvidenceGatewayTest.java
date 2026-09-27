package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.assertj.core.api.Assertions.assertThat;

class SquarePaymentEvidenceGatewayTest {
    @Test
    void authenticatesFixedSquarePaymentResourceUsingVersionedExistingClient() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var properties = new SquareTerminalProperties();
        var mapper = new ObjectMapper();
        var rest = builder.baseUrl(properties.apiBaseUrl()).defaultHeader("Square-Version", properties.getApiVersion()).build();
        var gateway = new SquarePaymentEvidenceGateway(new SquareRestClient(rest, mapper, 16_384));
        server.expect(requestTo(properties.apiBaseUrl() + "/v2/payments/pay%2F1%3Fpart%23x"))
            .andExpect(method(HttpMethod.GET)).andExpect(header("Authorization", "Bearer synthetic-token"))
            .andExpect(header("Square-Version", properties.getApiVersion()))
            .andRespond(withSuccess("{\"payment\":{\"id\":\"pay/1?part#x\",\"status\":\"COMPLETED\"}}", MediaType.APPLICATION_JSON));
        assertThat(gateway.payment("synthetic-token", "pay/1?part#x").path("status").asText()).isEqualTo("COMPLETED");
        server.verify();
    }
}
