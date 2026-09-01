package com.indice.erp.ai.finance;

public class AiFinanceActionConflictException extends RuntimeException {

    private final String code;

    public AiFinanceActionConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
