package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.util.regex.Pattern;

final class SquarePaymentRequestKey {
    private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9_-]{7,63}");
    private SquarePaymentRequestKey() {}
    static String require(String value) {
        var key = value == null ? "" : value.trim();
        if (!SAFE.matcher(key).matches())
            throw PosApiException.badRequest("Square idempotency key is invalid.");
        return key;
    }
}
