package com.indice.erp.billing.lifecycle;

public class CommercialAccessRestrictedException extends RuntimeException {

    private final CommercialLifecycleState state;
    private final boolean writeOnly;

    public CommercialAccessRestrictedException(CommercialLifecycleState state, boolean writeOnly) {
        super(writeOnly
            ? "The account is currently limited to read-only access."
            : "The account is suspended and requires billing recovery.");
        this.state = state;
        this.writeOnly = writeOnly;
    }

    public CommercialLifecycleState state() { return state; }
    public boolean writeOnly() { return writeOnly; }
}
