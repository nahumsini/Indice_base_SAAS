package com.indice.erp.hr.payroll;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.incentives.HrIncentivePayrollSupplyService;
import com.indice.erp.hr.payroll.engine.PayrollAttendanceInputService;
import com.indice.erp.hr.payroll.engine.PayrollCalculationEngine;
import com.indice.erp.hr.payroll.engine.PayrollFiscalAccumulatorService;
import com.indice.erp.hr.payroll.engine.PayrollManualAdjustmentService;
import com.indice.erp.hr.payroll.engine.PayrollRuleResolver;
import com.indice.erp.hr.payroll.engine.PayrollSnapshotService;
import com.indice.erp.hr.payroll.provider.generic.GenericPayrollProvider;
import com.indice.erp.hr.payroll.reporting.co.ColombiaPayrollReportingService;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

/** Exercises the same owner calculation used by run creation, without a database or writes. */
class HrPayrollWeeklyWorkdaysTest {
    private static final LocalDate SUNDAY = LocalDate.of(2026, 10, 18);
    private static final AuthSessionUser ACTOR = new AuthSessionUser(10L, 20L, "Payroll test", "root");

    @ParameterizedTest
    @ValueSource(ints = {3, 5, 6, 7})
    void configuredWorkdaysDetermineWeeklyAttendanceAndAbsenceDeduction(int workdays) throws Exception {
        var presentDates = new ArrayList<LocalDate>();
        for (int day = 1; day < workdays; day++) {
            presentDates.add(SUNDAY.plusDays(day));
        }
        var line = prepare(workdays, presentDates);

        assertEquals(BigDecimal.valueOf(workdays - 1).setScale(2), line.daysPayable());
        assertEquals(new BigDecimal("1.00"), line.missingAttendanceDays());
        assertEquals(BigDecimal.valueOf(workdays * 1000L).setScale(2), line.grossAmount());
        assertEquals(new BigDecimal("1000.00"), line.deductionsAmount());
        assertEquals(BigDecimal.valueOf((workdays - 1) * 1000L).setScale(2), line.netAmount());
    }

    @Test
    void sixRecordedDaysFromSundayToFridayCoverTheSixDayWeekWithoutAnAssignedSchedule() throws Exception {
        var line = prepare(6, SUNDAY.datesUntil(SUNDAY.plusDays(6)).toList());

        assertEquals(new BigDecimal("6.00"), line.daysPayable());
        assertEquals(new BigDecimal("48.00"), line.regularHours());
        assertEquals(new BigDecimal("0.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("0.00"), line.deductionsAmount());
        assertEquals(new BigDecimal("6000.00"), line.netAmount());
        assertEquals(List.of(), line.attendanceWarnings());
    }

    @ParameterizedTest
    @ValueSource(ints = {3, 5, 6, 7})
    void fullConfiguredWeekCanStartOnSundayWithoutInventingAnAbsence(int workdays) throws Exception {
        var line = prepare(workdays, SUNDAY.datesUntil(SUNDAY.plusDays(workdays)).toList());

        assertEquals(BigDecimal.valueOf(workdays).setScale(2), line.daysPayable());
        assertEquals(new BigDecimal("0.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("0.00"), line.deductionsAmount());
    }

    @Test
    void shiftedWeekStillDeductsAnActuallyMissingDay() throws Exception {
        var line = prepare(6, SUNDAY.datesUntil(SUNDAY.plusDays(5)).toList());

        assertEquals(new BigDecimal("5.00"), line.daysPayable());
        assertEquals(new BigDecimal("1.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("1000.00"), line.deductionsAmount());
    }

    @Test
    void extraSundayAttendanceCannotReplaceARecordedSaturdayAbsence() throws Exception {
        var records = presentRecords(SUNDAY.datesUntil(SUNDAY.plusDays(6)).toList());
        records.put(SUNDAY.plusDays(6), "absence");
        var line = prepare(6, records, false);

        assertEquals(new BigDecimal("6.00"), line.daysPayable());
        assertEquals(new BigDecimal("1.00"), line.absenceDays());
        assertEquals(new BigDecimal("0.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("857.14"), line.deductionsAmount());
    }

    @Test
    void recordedSundayAbsenceCountsAsAbsenceInsteadOfInventingMissingSaturdayAttendance() throws Exception {
        var records = presentRecords(SUNDAY.plusDays(1).datesUntil(SUNDAY.plusDays(6)).toList());
        records.put(SUNDAY, "absence");
        var line = prepare(6, records, false);

        assertEquals(new BigDecimal("1.00"), line.absenceDays());
        assertEquals(new BigDecimal("0.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("1000.00"), line.deductionsAmount());
    }

    @Test
    void recordedRestDoesNotBecomeAWorkedDay() throws Exception {
        var records = presentRecords(SUNDAY.plusDays(1).datesUntil(SUNDAY.plusDays(6)).toList());
        records.put(SUNDAY, "rest");
        var line = prepare(6, records, false);

        assertEquals(new BigDecimal("5.00"), line.daysPayable());
        assertEquals(new BigDecimal("1.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("1000.00"), line.deductionsAmount());
    }

    @Test
    void sixActualRecordsCoverTheWeekWhenTheUnusedDayHasANotScheduledProjection() throws Exception {
        var records = presentRecords(SUNDAY.datesUntil(SUNDAY.plusDays(6)).toList());
        records.put(SUNDAY.plusDays(6), "not_scheduled");
        var line = prepare(6, records, false);

        assertEquals(new BigDecimal("6.00"), line.daysPayable());
        assertEquals(new BigDecimal("0.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("0.00"), line.deductionsAmount());
    }

    @Test
    void explicitMondayToSaturdayScheduleOverridesTheSevenDayQuantityAndRequiresSaturdayAttendance() throws Exception {
        var line = prepare(7, presentRecords(SUNDAY.plusDays(1).datesUntil(SUNDAY.plusDays(6)).toList()), true);

        assertEquals(new BigDecimal("5.00"), line.daysPayable());
        assertEquals(new BigDecimal("1.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("1166.67"), line.deductionsAmount());
    }

    @Test
    void restAssignedInControlMovesTheUncoveredWorkdayWithoutDeductingThatRest() throws Exception {
        var records = presentRecords(SUNDAY.plusDays(2).datesUntil(SUNDAY.plusDays(7)).toList());
        records.put(SUNDAY.plusDays(1), "rest");
        var line = prepare(6, records, false);

        assertEquals(new BigDecimal("5.00"), line.daysPayable());
        assertEquals(new BigDecimal("0.00"), line.absenceDays());
        assertEquals(new BigDecimal("1.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("1000.00"), line.deductionsAmount());
    }

    @Test
    void sixWorkedDaysAndAMidweekRestHaveNoMissingDay() throws Exception {
        var records = presentRecords(SUNDAY.datesUntil(SUNDAY.plusDays(7)).toList());
        records.put(SUNDAY.plusDays(3), "rest");
        var line = prepare(6, records, false);

        assertEquals(new BigDecimal("6.00"), line.daysPayable());
        assertEquals(new BigDecimal("0.00"), line.missingAttendanceDays());
        assertEquals(new BigDecimal("0.00"), line.deductionsAmount());
    }

    private HrPayrollAssistantContracts.Line prepare(int workdays, List<LocalDate> presentDates) throws Exception {
        return prepare(workdays, presentRecords(presentDates), false);
    }

    private Map<LocalDate, String> presentRecords(List<LocalDate> dates) {
        var records = new LinkedHashMap<LocalDate, String>();
        dates.forEach(date -> records.put(date, "on_time"));
        return records;
    }

    private HrPayrollAssistantContracts.Line prepare(int workdays, Map<LocalDate, String> records, boolean assignedSchedule) throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        var scope = mock(HrPayrollScopeAccess.class);
        when(scope.resolve(ACTOR)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenAnswer(call -> {
            String sql = call.getArgument(0);
            RowMapper<?> mapper = call.getArgument(1);
            var rows = new ArrayList<Map<String, Object>>();
            if (sql.contains("FROM hr_users e")) {
                assertEquals(ACTOR.companyId(), call.getArgument(2));
                rows.add(Map.ofEntries(
                    Map.entry("id", 30L), Map.entry("user_id", 40L),
                    Map.entry("full_name", "Weekly employee"), Map.entry("status", "active"),
                    Map.entry("salary", BigDecimal.valueOf(workdays * 1000L)),
                    Map.entry("hourly_rate", BigDecimal.ZERO), Map.entry("salary_type", "daily"),
                    Map.entry("pay_period", "weekly"), Map.entry("workday_hours", new BigDecimal("8")),
                    Map.entry("workdays_per_week", BigDecimal.valueOf(workdays)),
                    Map.entry("payroll_treatment", "operational_payroll"),
                    Map.entry("registration_country", "MX")
                ));
            } else if (sql.contains("FROM user_attendance_daily_records")) {
                assertEquals(ACTOR.companyId(), call.getArgument(2));
                assertEquals(30L, (long) call.getArgument(3));
                records.forEach((date, status) -> rows.add(Map.of(
                    "attendance_date", date, "system_status", "not_scheduled", "corrected_status", status
                )));
            } else if (sql.contains("FROM user_schedule_assignments a") && assignedSchedule) {
                assertEquals(ACTOR.companyId(), call.getArgument(2));
                assertEquals(30L, (long) call.getArgument(3));
                for (int day = 1; day <= 7; day++) {
                    rows.add(Map.of("template_id", 90L, "effective_start_date", SUNDAY,
                        "day_of_week", day, "is_rest_day", day == 7,
                        "start_time", LocalTime.of(9, 0), "end_time", LocalTime.of(17, 0)));
                }
            }
            var mapped = new ArrayList<Object>();
            for (var row : rows) {
                var rs = mock(ResultSet.class, invocation -> {
                    var value = invocation.getArguments().length == 0 ? null : row.get(invocation.getArgument(0));
                    return switch (invocation.getMethod().getName()) {
                        case "getString" -> value == null ? "" : value.toString();
                        case "getLong" -> value == null ? 0L : ((Number) value).longValue();
                        case "getInt" -> value == null ? 0 : ((Number) value).intValue();
                        case "wasNull" -> true;
                        default -> value;
                    };
                });
                mapped.add(mapper.mapRow(rs, mapped.size()));
            }
            return mapped;
        });
        var resolver = new PayrollRuleResolver(jdbc);
        var adjustments = new PayrollManualAdjustmentService();
        var owner = new HrPayrollService(
            jdbc, scope,
            new PayrollCalculationEngine(List.of(new GenericPayrollProvider()), adjustments, resolver),
            new PayrollAttendanceInputService(), new PayrollFiscalAccumulatorService(jdbc), adjustments,
            new PayrollSnapshotService(jdbc, new ObjectMapper()), resolver,
            new ColombiaPayrollReportingService(jdbc, new ObjectMapper()),
            new HrIncentivePayrollSupplyService(jdbc), mock(ExpenseService.class), new HrPayrollAuthorizationService(),
            mock(com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService.class)
        );
        return owner.prepareAssistantPayroll(ACTOR, "prepare_hr_payroll", null,
            new HrPayrollAssistantContracts.Change("weekly", SUNDAY, SUNDAY.plusDays(6), "single", null, null, null, null)
        ).after().runs().getFirst().lines().getFirst();
    }
}
