package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

class SquareWebhookBodyReaderTest {
    @Test void readsBoundedRawUtf8AndRejectsOversizedBodies() {
        var properties = new SquareWebhookProperties();
        properties.setMaxWebhookBytes(1_024);
        var reader = new SquareWebhookBodyReader(properties);
        var valid = new MockHttpServletRequest();
        valid.setContent("{\"event_id\":\"á\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(reader.read(valid)).isEqualTo("{\"event_id\":\"á\"}");
        var oversized = new MockHttpServletRequest();
        oversized.setContent(new byte[1_025]);
        assertThatThrownBy(() -> reader.read(oversized)).isInstanceOf(ResponseStatusException.class)
            .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(413));
    }
}
