package com.indice.erp.hr.payroll.reporting.co;

import java.time.LocalDateTime;
import java.util.List;

public record ColombiaGovernmentReportingResponse(
    String status,
    boolean readyForTransmission,
    String externalId,
    String requestHash,
    LocalDateTime responseAt,
    List<ColombiaReportingValidationIssue> issues
) {
    public ColombiaGovernmentReportingResponse {
        status = text(status).isBlank() ? "NOT_TRANSMITTED" : text(status).toUpperCase();
        externalId = text(externalId);
        requestHash = text(requestHash);
        issues = issues == null ? List.of() : List.copyOf(issues);
    }

    public static ColombiaGovernmentReportingResponse draft(String requestHash, List<ColombiaReportingValidationIssue> issues) {
        var resolvedIssues = issues == null ? List.<ColombiaReportingValidationIssue>of() : List.copyOf(issues);
        var hasBlockingIssue = resolvedIssues.stream().anyMatch(ColombiaReportingValidationIssue::blocking);
        return new ColombiaGovernmentReportingResponse(
            "NOT_TRANSMITTED",
            !hasBlockingIssue,
            "",
            requestHash,
            null,
            resolvedIssues
        );
    }

    private static String text(String value) {
        return value == null ? "" : value.trim();
    }
}
