package com.indice.erp.hr.payroll.reporting.co;

import java.util.List;

public record ColombiaPayrollReportingBundle(
    ColombiaPilaPayload pilaPayload,
    ColombiaDianPayrollPayload dianPayload,
    List<ColombiaReportingValidationIssue> pilaIssues,
    List<ColombiaReportingValidationIssue> dianIssues,
    ColombiaGovernmentReportingResponse pilaResponse,
    ColombiaGovernmentReportingResponse dianResponse
) {
    public ColombiaPayrollReportingBundle {
        pilaIssues = pilaIssues == null ? List.of() : List.copyOf(pilaIssues);
        dianIssues = dianIssues == null ? List.of() : List.copyOf(dianIssues);
    }
}
