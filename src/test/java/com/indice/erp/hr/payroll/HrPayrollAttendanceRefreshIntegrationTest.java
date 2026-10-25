package com.indice.erp.hr.payroll;

import static org.junit.jupiter.api.Assertions.*;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.attendance.HrAttendanceService;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class HrPayrollAttendanceRefreshIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired HrPayrollService payroll;
    @Autowired HrAttendanceService attendance;

    @Test
    void controlCorrectionsRefreshDraftAttendanceAndKeepSalaryAndApprovedHistory() {
        var week = LocalDate.now().minusWeeks(4).with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
        var companyName = "Payroll weekly test " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", companyName);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, companyName);
        String email = "weekly-" + UUID.randomUUID() + "@example.invalid";
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'synthetic-unused', 'Weekly test')", email);
        long user = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'root', 'active', 'all')", company, user);
        long member = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?", Long.class, company, user);
        jdbc.update("""
            INSERT INTO user_work_profiles
              (company_id, user_company_id, user_id, hire_date, salary, pay_period, salary_type,
               workday_hours, workdays_per_week, payroll_treatment, registration_country, status)
            VALUES (?, ?, ?, ?, 6000, 'weekly', 'daily', 8, 6, 'operational_payroll', 'MX', 'active')
            """, company, member, user, week.minusYears(1));
        var actor = new AuthSessionUser(user, company, "Weekly test", "root");
        for (var date : week.datesUntil(week.plusDays(6)).toList()) {
            correct(company, user, member, date, "on_time");
        }
        var created = payroll.createRuns(actor, Map.of("pay_period", "weekly", "period_start_date", week.toString()));
        long run = ((Number) ((Map<?, ?>) ((List<?>) created.get("items")).getFirst()).get("id")).longValue();
        assertLine(run, "6.00", "0.00", "0.00", "0.00", "6000.00");

        // Later profile salary changes must not silently rewrite this run's salary snapshot.
        jdbc.update("UPDATE user_work_profiles SET salary = 12000 WHERE company_id = ? AND user_company_id = ?", company, member);
        correct(company, user, member, week.plusDays(5), "absence");
        assertLine(run, "6.00", "0.00", "0.00", "0.00", "6000.00");
        var preview = payroll.prepareAssistantPayroll(actor, "recalculate_hr_payroll", run, null);
        assertEquals(new BigDecimal("5000.00"), preview.after().runs().getFirst().lines().getFirst().netAmount());
        assertLine(run, "6.00", "0.00", "0.00", "0.00", "6000.00");
        payroll.processRun(actor, run);
        assertLine(run, "5.00", "1.00", "0.00", "1000.00", "5000.00");
        assertEquals("draft", jdbc.queryForObject("SELECT status FROM payroll_runs WHERE id = ?", String.class, run));
        assertEquals(new BigDecimal("6000.00"), jdbc.queryForObject("SELECT base_salary_amount FROM payroll_run_lines WHERE run_id = ?", BigDecimal.class, run));
        assertEquals(7, jdbc.queryForObject("SELECT JSON_LENGTH(attendance_snapshot_json, '$.records') FROM payroll_run_lines WHERE run_id = ?", Integer.class, run));

        // Control swaps Friday for an authorized rest and records Saturday as worked.
        correct(company, user, member, week.plusDays(5), "rest");
        correct(company, user, member, week.plusDays(6), "on_time");
        payroll.processRun(actor, run);
        assertLine(run, "6.00", "0.00", "0.00", "0.00", "6000.00");
        assertEquals(new BigDecimal("1.00"), jdbc.queryForObject("SELECT rest_days FROM payroll_run_lines WHERE run_id = ?", BigDecimal.class, run));

        // Removing a correction leaves a system 'not_scheduled' projection, not proof of work.
        attendance.updateDailyRecord(company, user, member, week.plusDays(6), Map.of("status", ""));
        payroll.processRun(actor, run);
        assertLine(run, "5.00", "0.00", "1.00", "1000.00", "5000.00");
        payroll.processRun(actor, run);
        assertLine(run, "5.00", "0.00", "1.00", "1000.00", "5000.00");

        payroll.approveRun(actor, run);
        assertEquals(7, jdbc.queryForObject("SELECT JSON_LENGTH(attendance_snapshot_json, '$.records') FROM payroll_run_lines WHERE run_id = ?", Integer.class, run));
        var approvedSnapshot = jdbc.queryForObject("SELECT attendance_snapshot_json FROM payroll_run_lines WHERE run_id = ?", String.class, run);
        correct(company, user, member, week.plusDays(6), "on_time");
        assertThrows(IllegalArgumentException.class, () -> payroll.processRun(actor, run));
        assertLine(run, "5.00", "0.00", "1.00", "1000.00", "5000.00");
        assertEquals(approvedSnapshot, jdbc.queryForObject("SELECT attendance_snapshot_json FROM payroll_run_lines WHERE run_id = ?", String.class, run));
    }

    private void correct(long company, long user, long member, LocalDate day, String status) {
        attendance.updateDailyRecord(company, user, member, day, Map.of("status", status, "notes", "Synthetic payroll regression"));
    }

    private void assertLine(long run, String paid, String absences, String missing, String deductions, String net) {
        var line = jdbc.queryForMap("SELECT days_payable, absence_days, missing_attendance_days, deductions_amount, net_amount FROM payroll_run_lines WHERE run_id = ?", run);
        assertEquals(new BigDecimal(paid), line.get("days_payable"));
        assertEquals(new BigDecimal(absences), line.get("absence_days"));
        assertEquals(new BigDecimal(missing), line.get("missing_attendance_days"));
        assertEquals(new BigDecimal(deductions), line.get("deductions_amount"));
        assertEquals(new BigDecimal(net), line.get("net_amount"));
    }
}
