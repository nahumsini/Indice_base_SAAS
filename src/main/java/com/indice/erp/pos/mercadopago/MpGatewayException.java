package com.indice.erp.pos.mercadopago;

public class MpGatewayException extends RuntimeException {
    private final int status;
    private final boolean uncertain;

    public MpGatewayException(int status, boolean uncertain) {
        super("Mercado Pago request could not be verified.");
        this.status = status;
        this.uncertain = uncertain;
    }

    public int status() { return status; }
    public boolean uncertain() { return uncertain; }
    public boolean unauthorized() { return status == 401; }
    public String code() { return unauthorized() ? "MERCHANT_RECONNECT_REQUIRED" : "PROVIDER_REQUEST_UNVERIFIED"; }
}
