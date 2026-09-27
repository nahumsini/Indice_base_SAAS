package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class SquareRefundGatewayTest {
    @Test void refundIsLinkedToOriginalPaymentWithExactMinorUnitsAndNoAlternativeDestination() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var properties = new SquareTerminalProperties();
        var gateway = new SquareHttpTerminalGateway(properties, mock(SquareTerminalSecretProvider.class), builder, new ObjectMapper());
        server.expect(requestTo(properties.apiBaseUrl() + "/v2/refunds")).andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.idempotency_key").value("same-key"))
            .andExpect(jsonPath("$.payment_id").value("original-payment"))
            .andExpect(jsonPath("$.amount_money.amount").value(1234))
            .andExpect(jsonPath("$.amount_money.currency").value("MXN"))
            .andExpect(jsonPath("$.destination_id").doesNotExist())
            .andRespond(withSuccess("""
                {"refund":{"id":"refund-test","payment_id":"original-payment","status":"PENDING",
                  "amount_money":{"amount":1234,"currency":"MXN"}}}
                """, MediaType.APPLICATION_JSON));
        var response = gateway.refundPayment("synthetic-test-token", "same-key", "original-payment", new BigDecimal("12.34"), "MXN");
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.amount()).isEqualByComparingTo("12.34");
        server.verify();
        assertThatThrownBy(() -> gateway.refundPayment("synthetic-test-token", "other", "original-payment", new BigDecimal("12.345"), "MXN"))
                .isInstanceOf(ArithmeticException.class);
    }
}
