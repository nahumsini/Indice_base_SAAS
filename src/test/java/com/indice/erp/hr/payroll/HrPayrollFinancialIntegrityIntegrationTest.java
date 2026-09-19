package com.indice.erp.hr.payroll;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class HrPayrollFinancialIntegrityIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private HrPayrollService payrollService;

    @Test
    void approvalIntegrityAcceptsBalancedTotalsAndRejectsNegativeNet() {
        var companyName = "Payroll integrity " + UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO companies (name) VALUES (?)", companyName);
        var companyId = jdbcTemplate.queryForObject(
            "SELECT id FROM companies WHERE name = ?",
            Long.class,
            companyName
        );
        var userId = jdbcTemplate.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        jdbcTemplate.update(
            "INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')",
            companyId,
            userId
        );
        var userCompanyId = jdbcTemplate.queryForObject(
            "SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?",
            Long.class,
            companyId,
            userId
        );

        jdbcTemplate.update(
            """
                INSERT INTO payroll_runs
                    (company_id, grouping_mode, pay_period, period_start_date, period_end_date, status,
                     users_count, gross_amount, deductions_amount, employer_contributions_amount, net_amount)
                VALUES (?, 'single', 'monthly', '2099-03-01', '2099-03-31', 'processed', 1, 1000, 200, 100, 800)
                """,
            companyId
        );
        var runId = jdbcTemplate.queryForObject(
            "SELECT id FROM payroll_runs WHERE company_id = ?",
            Long.class,
            companyId
        );
        jdbcTemplate.update(
            """
                INSERT INTO payroll_run_lines
                    (company_id, run_id, user_company_id, user_id, user_name_snapshot, pay_period_snapshot,
                     salary_type_snapshot, currency_code_snapshot, payment_route, gross_amount,
                     deductions_amount, employer_contributions_amount, net_amount)
                VALUES (?, ?, ?, ?, 'Payroll integrity fixture', 'monthly', 'fixed', 'MXN', 'expenses',
                        1000, 200, 100, 800)
                """,
            companyId,
            runId,
            userCompanyId,
            userId
        );

        assertDoesNotThrow(() -> payrollService.ensureFinancialIntegrityForApproval(companyId, runId));

        jdbcTemplate.update(
            "UPDATE payroll_run_lines SET deductions_amount = 1200, net_amount = -200 WHERE company_id = ? AND run_id = ?",
            companyId,
            runId
        );
        jdbcTemplate.update(
            "UPDATE payroll_runs SET deductions_amount = 1200, net_amount = -200 WHERE company_id = ? AND id = ?",
            companyId,
            runId
        );

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> payrollService.ensureFinancialIntegrityForApproval(companyId, runId)
        );
        assertTrue(error.getMessage().contains("negative net amounts"));
    }
}
