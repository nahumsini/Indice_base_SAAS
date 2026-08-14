package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class PayrollAttendanceInputService {

    public PayrollCalculationContext.PayrollAttendanceInput build(
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        Map<LocalDate, AttendanceRecord> records,
        Map<LocalDate, ScheduleDay> scheduleDays,
        BigDecimal fallbackDailyHours,
        String salaryType,
        boolean payLeaveDays
    ) {
        BigDecimal paidDays = BigDecimal.ZERO;
        BigDecimal paidLeaveDays = BigDecimal.ZERO;
        BigDecimal leaveDays = BigDecimal.ZERO;
        BigDecimal unpaidAbsenceDays = BigDecimal.ZERO;
        BigDecimal absenceDays = BigDecimal.ZERO;
        BigDecimal restDays = BigDecimal.ZERO;
        BigDecimal missingAttendanceDays = BigDecimal.ZERO;
        BigDecimal controlWorkDays = BigDecimal.ZERO;
        int lateCount = 0;
        BigDecimal regularHours = BigDecimal.ZERO;
        BigDecimal overtimeHours = BigDecimal.ZERO;
        var warnings = new ArrayList<String>();
        var snapshotRecords = new ArrayList<Map<String, Object>>();
        var hourly = "hourly".equalsIgnoreCase(salaryType);

        for (var currentDate = periodStartDate; !currentDate.isAfter(periodEndDate); currentDate = currentDate.plusDays(1)) {
            var scheduleDay = scheduleDays.getOrDefault(
                currentDate,
                new ScheduleDay(currentDate, isWeekday(currentDate), false, fallbackDailyHours)
            );
            var expectedHours = scheduleDay.expectedHours().compareTo(BigDecimal.ZERO) > 0
                ? scheduleDay.expectedHours()
                : fallbackDailyHours;
            var record = records.get(currentDate);
            var status = normalizeStatus(record == null ? "" : record.status());
            var recordSnapshot = new LinkedHashMap<String, Object>();
            recordSnapshot.put("date", currentDate.toString());
            recordSnapshot.put("scheduledWorkday", scheduleDay.workday());
            recordSnapshot.put("expectedHours", expectedHours);
            recordSnapshot.put("status", status.isBlank() ? null : status);
            recordSnapshot.put("leavePayrollTreatment", record == null ? null : normalizeLeavePayrollTreatment(record.leavePayrollTreatment()));

            if (!scheduleDay.workday() || scheduleDay.restDay()) {
                restDays = restDays.add(BigDecimal.ONE);
                snapshotRecords.add(recordSnapshot);
                continue;
            }

            controlWorkDays = controlWorkDays.add(BigDecimal.ONE);

            if (status.isBlank()) {
                missingAttendanceDays = missingAttendanceDays.add(BigDecimal.ONE);
                unpaidAbsenceDays = unpaidAbsenceDays.add(BigDecimal.ONE);
                warnings.add("Falta registro de asistencia para " + currentDate + ".");
                recordSnapshot.put("warning", "missing_attendance");
                snapshotRecords.add(recordSnapshot);
                continue;
            }

            switch (status) {
                case "rest" -> restDays = restDays.add(BigDecimal.ONE);
                case "absence" -> {
                    absenceDays = absenceDays.add(BigDecimal.ONE);
                    unpaidAbsenceDays = unpaidAbsenceDays.add(BigDecimal.ONE);
                }
                case "leave" -> {
                    leaveDays = leaveDays.add(BigDecimal.ONE);
                    if (isPaidLeave(record, payLeaveDays)) {
                        paidLeaveDays = paidLeaveDays.add(BigDecimal.ONE);
                        paidDays = paidDays.add(BigDecimal.ONE);
                        if (hourly) {
                            regularHours = regularHours.add(expectedHours);
                        }
                    } else {
                        unpaidAbsenceDays = unpaidAbsenceDays.add(BigDecimal.ONE);
                    }
                }
                case "late" -> {
                    lateCount++;
                    paidDays = paidDays.add(BigDecimal.ONE);
                    var workedHours = workedHours(record, expectedHours);
                    regularHours = regularHours.add(workedHours.min(expectedHours));
                    overtimeHours = overtimeHours.add(workedHours.subtract(expectedHours).max(BigDecimal.ZERO));
                    if (!hourly && expectedHours.compareTo(BigDecimal.ZERO) > 0) {
                        var missingHours = expectedHours.subtract(workedHours).max(BigDecimal.ZERO);
                        if (missingHours.compareTo(BigDecimal.ZERO) > 0) {
                            var lateDeductionDayFraction = missingHours.divide(expectedHours, 4, RoundingMode.HALF_UP);
                            unpaidAbsenceDays = unpaidAbsenceDays.add(lateDeductionDayFraction);
                            recordSnapshot.put("lateDeductionDayFraction", lateDeductionDayFraction);
                        }
                    }
                }
                case "on_time" -> {
                    paidDays = paidDays.add(BigDecimal.ONE);
                    var workedHours = workedHours(record, expectedHours);
                    regularHours = regularHours.add(workedHours.min(expectedHours));
                    overtimeHours = overtimeHours.add(workedHours.subtract(expectedHours).max(BigDecimal.ZERO));
                }
                default -> warnings.add("Estatus de asistencia no reconocido para " + currentDate + ": " + status + ".");
            }
            snapshotRecords.add(recordSnapshot);
        }

        return new PayrollCalculationContext.PayrollAttendanceInput(
            paidDays,
            paidLeaveDays,
            leaveDays,
            unpaidAbsenceDays,
            absenceDays,
            restDays,
            missingAttendanceDays,
            controlWorkDays,
            lateCount,
            regularHours,
            overtimeHours,
            warnings,
            snapshotRecords
        );
    }

    private BigDecimal workedHours(AttendanceRecord record, BigDecimal fallbackHours) {
        if (record == null || record.firstCheckInAt() == null) {
            return fallbackHours;
        }
        if (record.lastCheckOutAt() == null || !record.lastCheckOutAt().isAfter(record.firstCheckInAt())) {
            return fallbackHours;
        }
        return BigDecimal.valueOf(Duration.between(record.firstCheckInAt(), record.lastCheckOutAt()).toMinutes())
            .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private boolean isWeekday(LocalDate date) {
        var day = date.getDayOfWeek().getValue();
        return day >= 1 && day <= 5;
    }

    private String normalizeStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase().replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "a_tiempo", "presente", "asistencia", "on_time" -> "on_time";
            case "retardo", "late" -> "late";
            case "permiso", "leave" -> "leave";
            case "descanso", "rest" -> "rest";
            case "falta", "absence" -> "absence";
            default -> normalized;
        };
    }

    private boolean isPaidLeave(AttendanceRecord record, boolean payLeaveDaysFallback) {
        var treatment = record == null ? "" : normalizeLeavePayrollTreatment(record.leavePayrollTreatment());
        if ("paid".equals(treatment)) {
            return true;
        }
        if ("unpaid".equals(treatment)) {
            return false;
        }
        return payLeaveDaysFallback;
    }

    private String normalizeLeavePayrollTreatment(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase().replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "paid", "paid_leave", "pagado", "con_goce" -> "paid";
            case "unpaid", "unpaid_leave", "no_pagado", "sin_goce" -> "unpaid";
            default -> "";
        };
    }

    public record AttendanceRecord(
        LocalDate date,
        String status,
        LocalDateTime firstCheckInAt,
        LocalDateTime lastCheckOutAt,
        String leavePayrollTreatment
    ) {
    }

    public record ScheduleDay(
        LocalDate date,
        boolean workday,
        boolean restDay,
        BigDecimal expectedHours
    ) {
    }
}
