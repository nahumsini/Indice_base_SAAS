package com.indice.erp.hr.attendance.models;

public record AttendanceUser(
    long userId,
    long userCompanyId,
    String email,
    String fullName,
    String role,
    String status,
    String avatarUrl
) {
}
