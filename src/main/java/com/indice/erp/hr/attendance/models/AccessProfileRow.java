package com.indice.erp.hr.attendance.models;

import java.time.LocalDateTime;
import java.util.List;


public record AccessProfileRow(
    long id,
    long companyId,
    long userCompanyId,
    String status,
    String defaultMethod,
    LocalDateTime lastEnrolledAt,
    String metadataJson,
    String userCode,
    String userName,
    List<AccessMethodRow> methods
) {
}
