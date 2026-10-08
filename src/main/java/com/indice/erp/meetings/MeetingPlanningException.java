package com.indice.erp.meetings;

/** Stable, non-disclosing planning reasons. Never carry request content in diagnostics. */
public final class MeetingPlanningException extends IllegalArgumentException {
    private final String code;
    public MeetingPlanningException(String code){super(code);this.code=code;}
    public String code(){return code;}
}
