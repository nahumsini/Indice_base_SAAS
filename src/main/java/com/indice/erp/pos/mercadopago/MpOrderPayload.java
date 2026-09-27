package com.indice.erp.pos.mercadopago;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public record MpOrderPayload(MpJson json, MpProperties properties) {
    public String create(String reference, String terminal, BigDecimal amount) {
        return json.write(new MpOrderCommand("point", reference,
            java.time.Duration.ofSeconds(timeoutSeconds()).toString(),
            new MpOrderCommand.Transactions(List.of(new MpOrderCommand.Payment(amount.toPlainString()))),
            new MpOrderCommand.Configuration(new MpOrderCommand.Point(terminal, "no_ticket"))));
    }

    public long timeoutSeconds() {
        var seconds = properties.getPaymentTimeoutSeconds();
        if (seconds < 30 || seconds > 10800) {
            throw com.indice.erp.pos.PosApiException.serviceUnavailable("Point expiration must be 30 seconds to 3 hours.");
        }
        return seconds;
    }
}
