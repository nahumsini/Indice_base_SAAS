package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentDraftInputs {
    private final ObjectMapper mapper;
    SquarePaymentDraftInputs(ObjectMapper mapper) {
        this.mapper = mapper;
    }
    String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (Exception ex) { throw PosApiException.badRequest("Square checkout payload is invalid."); }
    }
    String key(String value) {
        return SquarePaymentRequestKey.require(value);
    }
    String currency(String value) {
        var code = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (code.length() != 3) throw PosApiException.badRequest("currencyCode must be a 3-letter code.");
        return code;
    }
}
