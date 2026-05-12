package com.indice.erp.hr.attendance.models;

public record AccessMethodRow(
    long id,
    long companyId,
    long accessProfileId,
    String methodType,
    String credentialRef,
    String secretHash,
    String status,
    int priority,
    String metadataJson,
    long userCompanyId,
    String userCode,
    String userName
) {
}
