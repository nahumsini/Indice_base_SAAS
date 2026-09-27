package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import java.math.BigDecimal;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpOrderInput {
    private final ObjectMapper mapper;

    void require(String json) {
        try {
            if (json == null || json.length() > 65536) throw new IllegalArgumentException();
            var order = mapper.readTree(json);
            var payments = order.path("transactions").path("payments");
            var amount = payments.path(0).path("amount");
            var reference = order.path("external_reference");
            long expiry = Duration.parse(order.path("expiration_time").asText()).getSeconds();
            if (!"point".equals(order.path("type").asText()) || !payments.isArray() || payments.size() != 1
                || !amount.isTextual() || !amount.asText().matches("[0-9]{1,12}\\.[0-9]{2}")
                || new BigDecimal(amount.asText()).signum() <= 0 || !reference.isTextual()
                || !reference.asText().matches("[A-Za-z0-9_-]{1,64}") || expiry < 30 || expiry > 10800
                || !MpTerminalDiscovery.supported(order.path("config").path("point").path("terminal_id").asText())) {
                throw new IllegalArgumentException();
            }
        } catch (Exception exception) { throw PosApiException.badRequest("Point order request is invalid."); }
    }
}
