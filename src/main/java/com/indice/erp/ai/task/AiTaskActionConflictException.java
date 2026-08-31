package com.indice.erp.ai.task;

public class AiTaskActionConflictException extends RuntimeException {

    private final String code;

    public AiTaskActionConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
