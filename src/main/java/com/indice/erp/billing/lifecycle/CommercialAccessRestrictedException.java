package com.indice.erp.billing.lifecycle;

public class CommercialAccessRestrictedException extends RuntimeException {

    private final CommercialLifecycleState state;
    private final boolean writeOnly;
    private final boolean paymentRequest;

    public CommercialAccessRestrictedException(CommercialLifecycleState state, boolean writeOnly) {
        this(state, writeOnly, false);
    }

    public CommercialAccessRestrictedException(CommercialLifecycleState state, boolean writeOnly, boolean paymentRequest) {
        super(writeOnly
            ? "The account is currently limited to read-only access."
            : "The account is suspended and requires billing recovery.");
        this.state = state;
        this.writeOnly = writeOnly;
        this.paymentRequest = paymentRequest;
    }

    public CommercialLifecycleState state() { return state; }
    public boolean writeOnly() { return writeOnly; }
    public boolean paymentRequest() { return paymentRequest; }
}
