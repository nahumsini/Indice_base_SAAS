package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.springframework.http.HttpStatus;

public final class MpPaymentNotSubmittedException extends PosApiException {
    private final String requestKey;
    public MpPaymentNotSubmittedException(HttpStatus status, String requestKey, String message) {
        super(status, message);
        this.requestKey = requestKey;
    }
    public String requestKey() { return requestKey; }
}
