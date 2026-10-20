package com.indice.erp.configcenter.users;
/** Stable errors for the existing user/access owner. */
public final class UserAccessException extends IllegalArgumentException {
    private final String code;
    public UserAccessException(String code,String message){super(message);this.code=code;}
    public String code(){return code;}
}
