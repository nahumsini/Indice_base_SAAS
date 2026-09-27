package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SquareWebhookProjectionTest {
    @Test
    void retainsOnlyIdentifiersNeededForAuthenticatedRecovery() {
        var properties = new SquareTerminalProperties();
        properties.setEnvironment("production");
        var parser = new SquareWebhookPayloadParser(new ObjectMapper(), properties);
        var raw = """
            {"event_id":"evt1","type":"terminal.checkout.updated","merchant_id":"merchant1",
             "data":{"object":{"checkout":{"id":"checkout1","status":"COMPLETED","customer_id":"private",
             "card_details":{"last_4":"1234"},"amount_money":{"amount":100,"currency":"CAD"}}}}}
            """;
        var parsed = parser.parse(raw, "sandbox");
        var stored = parser.persisted(parsed);
        assertThat(stored).contains("evt1", "merchant1", "checkout1").doesNotContain("private", "1234", "COMPLETED", "amount_money");
        assertThat(parser.parse(stored, null)).isEqualTo(parsed);
        assertThat(parsed.environment()).isEqualTo("production");
    }
}
