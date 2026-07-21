package com.indice.erp.billing.ownership;

public class OwnershipForbiddenException extends RuntimeException {
    public OwnershipForbiddenException(String message) {
        super(message);
    }
}
