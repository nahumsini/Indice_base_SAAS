package com.indice.erp.configcenter.profile;

public final class ProfileInputException extends IllegalArgumentException {
    private final String code;
    public ProfileInputException(String code, String message) { super(message); this.code = code; }
    public String code() { return code; }
}
