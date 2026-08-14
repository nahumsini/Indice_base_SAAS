package com.indice.erp.hr.payroll.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PayrollAttendanceInputServiceTest {

    private final PayrollAttendanceInputService service = new PayrollAttendanceInputService();

    @Test
    void paidLeaveTreatmentOverridesGlobalPreference() {
        var date = LocalDate.of(2026, 6, 1);
        var attendance = service.build(
            date,
            date,
            Map.of(date, new PayrollAttendanceInputService.AttendanceRecord(date, "leave", null, null, "paid")),
            Map.of(date, new PayrollAttendanceInputService.ScheduleDay(date, true, false, new BigDecimal("8"))),
            new BigDecimal("8"),
            "hourly",
            false
        );

        assertEquals(new BigDecimal("1.00"), attendance.leaveDays());
        assertEquals(new BigDecimal("1.00"), attendance.paidLeaveDays());
        assertEquals(new BigDecimal("1.00"), attendance.paidDays());
        assertEquals(new BigDecimal("0.00"), attendance.unpaidAbsenceDays());
        assertEquals(new BigDecimal("8.00"), attendance.regularHours());
        assertEquals("paid", attendance.records().getFirst().get("leavePayrollTreatment"));
    }

    @Test
    void unpaidLeaveTreatmentOverridesGlobalPreference() {
        var date = LocalDate.of(2026, 6, 1);
        var attendance = service.build(
            date,
            date,
            Map.of(date, new PayrollAttendanceInputService.AttendanceRecord(date, "leave", null, null, "unpaid")),
            Map.of(date, new PayrollAttendanceInputService.ScheduleDay(date, true, false, new BigDecimal("8"))),
            new BigDecimal("8"),
            "daily",
            true
        );

        assertEquals(new BigDecimal("1.00"), attendance.leaveDays());
        assertEquals(new BigDecimal("0.00"), attendance.paidLeaveDays());
        assertEquals(new BigDecimal("0.00"), attendance.paidDays());
        assertEquals(new BigDecimal("1.00"), attendance.unpaidAbsenceDays());
        assertEquals("unpaid", attendance.records().getFirst().get("leavePayrollTreatment"));
    }

    @Test
    void lateArrivalDeductsMissingFractionForDailySalary() {
        var date = LocalDate.of(2026, 6, 1);
        var attendance = service.build(
            date,
            date,
            Map.of(date, new PayrollAttendanceInputService.AttendanceRecord(
                date,
                "late",
                LocalDateTime.of(2026, 6, 1, 10, 0),
                LocalDateTime.of(2026, 6, 1, 16, 0),
                null
            )),
            Map.of(date, new PayrollAttendanceInputService.ScheduleDay(date, true, false, new BigDecimal("8"))),
            new BigDecimal("8"),
            "daily",
            true
        );

        assertEquals(new BigDecimal("1.00"), attendance.paidDays());
        assertEquals(new BigDecimal("0.25"), attendance.unpaidAbsenceDays());
        assertEquals(new BigDecimal("6.00"), attendance.regularHours());
        assertEquals(1, attendance.lateCount());
        assertEquals(new BigDecimal("0.2500"), attendance.records().getFirst().get("lateDeductionDayFraction"));
    }
}
