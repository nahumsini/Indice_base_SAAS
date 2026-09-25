package com.indice.erp.ai.access;

/** The owner must choose an existing connection to revoke before granting another one. */
public class AiConnectionLimitException extends IllegalStateException {

    public AiConnectionLimitException() {
        super("Revoke an existing AI connection before creating another one.");
    }
}
