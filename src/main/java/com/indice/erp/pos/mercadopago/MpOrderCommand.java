package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record MpOrderCommand(String type,
        @JsonProperty("external_reference") String externalReference,
        @JsonProperty("expiration_time") String expirationTime,
        Transactions transactions, Configuration config) {
    public record Transactions(List<Payment> payments) {
    }

    public record Payment(String amount) {
    }

    public record Configuration(Point point) {
    }

    public record Point(@JsonProperty("terminal_id") String terminalId,
            @JsonProperty("print_on_terminal") String printOnTerminal) {
    }
}
