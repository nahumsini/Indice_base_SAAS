package com.indice.erp.hr.attendance.support;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;

import static com.indice.erp.hr.attendance.support.AttendancePresentation.dateString;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.displayUserRole;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.firstNonBlank;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


public final class AttendancePresentation {

    private AttendancePresentation() {
    }

    public static String firstNonBlank(String... values) {
        for (var value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    public static String toIsoString(LocalDateTime value) {
        return value == null ? null : value.toString();
    }

    public static String dateString(LocalDate value) {
        return value == null ? null : value.toString();
    }

    public static String displayUserRole(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "root" -> "Root user";
            case "superadmin" -> "Super admin";
            case "owner", "dueno" -> "Owner";
            case "admin" -> "Admin";
            case "manager" -> "Manager";
            case "approver" -> "Approver";
            case "contributor" -> "Contributor";
            case "viewer" -> "Viewer";
            default -> "User";
        };
    }
}
