package com.indice.erp.hr.payroll.reporting.co;

public record ColombiaReportingValidationIssue(
    String code,
    String severity,
    String field,
    String message,
    boolean blocking
) {
    public ColombiaReportingValidationIssue {
        code = text(code);
        severity = text(severity).isBlank() ? "warning" : text(severity).toLowerCase();
        field = text(field);
        message = text(message);
    }

    private static String text(String value) {
        return value == null ? "" : value.trim();
    }
}
