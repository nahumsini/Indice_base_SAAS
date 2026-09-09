package com.indice.erp.billing.collection;

public class PaymentCollectionException extends IllegalStateException {
    private final String code;
    public PaymentCollectionException(String code, String message) { super(message); this.code = code; }
    public String code() { return code; }
}
