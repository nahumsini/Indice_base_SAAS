package com.indice.erp.ai.oauth;

public class AiOAuthException extends RuntimeException {

    private final String code;

    public AiOAuthException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
