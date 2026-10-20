package com.indice.erp.configcenter.company;
public final class CompanySettingsException extends IllegalArgumentException {
    private final String code;
    public CompanySettingsException(String code, String message) { super(message); this.code = code; }
    public String code() { return code; }
}
