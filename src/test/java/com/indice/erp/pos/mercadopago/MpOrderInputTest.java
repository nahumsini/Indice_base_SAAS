package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class MpOrderInputTest {
    private final MpOrderInput input = new MpOrderInput(new ObjectMapper());
    private String json(String amount, String expiry) {
        return "{\"type\":\"point\",\"external_reference\":\"synthetic_ref\",\"expiration_time\":\"" + expiry
            + "\",\"transactions\":{\"payments\":[{\"amount\":\"" + amount
            + "\"}]},\"config\":{\"point\":{\"terminal_id\":\"NEWLAND_N950__TEST001\"}}}";
    }
    @Test void acceptsFrozenDecimalAmountAndPointDuration() {
        assertDoesNotThrow(() -> input.require(json("123.45", "PT10M")));
        assertDoesNotThrow(() -> input.require(json("0.01", "PT30S")));
    }
    @ParameterizedTest @ValueSource(strings={"0.00", "-1.00", "1", "1.2", "1.234", "NaN"})
    void rejectsInvalidMonetaryInputs(String amount) {
        assertThrows(PosApiException.class, () -> input.require(json(amount, "PT10M")));
    }
    @ParameterizedTest @ValueSource(strings={"PT29S", "PT3H1S", "invalid"})
    void rejectsUnsupportedExpiration(String expiry) {
        assertThrows(PosApiException.class, () -> input.require(json("1.00", expiry)));
    }
}
