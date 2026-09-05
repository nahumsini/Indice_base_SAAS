package com.indice.erp.hr.incentives;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Locale;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * HR-owned intake boundary for deductions produced by another business module.
 *
 * <p>The source module may queue an auditable obligation, but only Payroll can
 * apply it to a draft run through the existing explicit application action.</p>
 */
@Service
public class HrPayrollExternalDeductionService {

    private static final LocalDate OPEN_END_DATE = LocalDate.of(9999, 12, 31);
    private static final String PETTY_CASH_SOURCE = "petty_cash_shortage";
    private static final String PETTY_CASH_REFERENCE = "petty_cash_statement";

    private final JdbcTemplate jdbcTemplate;

    public HrPayrollExternalDeductionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void queueFundShortageDeduction(
        long companyId,
        long responsibleUserId,
        long fundId,
        String fundName,
        long statementId,
        String statementFolio,
        BigDecimal sourceAmount,
        String sourceCurrency,
        LocalDate effectiveDate,
        long actorUserId
    ) {
        var amount = scale(sourceAmount);
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("Fund shortage deduction amount must be greater than zero.");
        }
        if (effectiveDate == null) {
            throw new IllegalArgumentException("Fund shortage deduction date is required.");
        }

        var membership = resolveActiveMembership(companyId, responsibleUserId);
        var enteredCurrency = normalizeCurrency(sourceCurrency);
        var payrollCurrency = resolvePayrollCurrency(membership.registrationCountry(), enteredCurrency);
        var exchangeRate = HrIncentiveService.exchangeRateBetween(enteredCurrency, payrollCurrency);
        var payrollAmount = scale(amount.multiply(exchangeRate));
        var incentiveCode = "PC-SHORTAGE-" + statementId;
        var name = truncate("Descuento por faltante · " + normalizedLabel(fundName, "Fondo " + fundId), 180);
        var description = truncate(
            "Pendiente de aplicación manual en nómina. Corte "
                + normalizedLabel(statementFolio, String.valueOf(statementId)) + ".",
            65535
        );

        jdbcTemplate.update(
            """
                INSERT INTO hr_incentives
                (company_id, incentive_code, name, description, incentive_type, calculation_method, amount, currency_code,
                 payroll_category, tax_treatment, taxable, affects_social_security, affects_employer_cost, source_type,
                 source_reference_type, source_reference_id, effective_start_date, effective_end_date, application_mode,
                 status, created_by_user_id, approved_by_user_id, approved_at, metadata_json)
                VALUES (?, ?, ?, ?, 'external_deduction', 'fixed_amount', ?, ?, 'deduction', 'operational_recovery',
                        0, 0, 0, ?, ?, ?, ?, ?, 'manual_payroll_decision', 'active', ?, ?, CURRENT_TIMESTAMP,
                        JSON_OBJECT('source_module', 'petty_cash', 'fund_id', ?, 'statement_id', ?,
                                    'entered_amount', ?, 'entered_currency', ?, 'payroll_amount', ?,
                                    'payroll_currency', ?, 'exchange_rate', ?))
                ON DUPLICATE KEY UPDATE id = id
                """,
            companyId,
            incentiveCode,
            name,
            description,
            payrollAmount,
            payrollCurrency,
            PETTY_CASH_SOURCE,
            PETTY_CASH_REFERENCE,
            String.valueOf(statementId),
            effectiveDate,
            OPEN_END_DATE,
            actorUserId,
            actorUserId,
            fundId,
            statementId,
            amount,
            enteredCurrency,
            payrollAmount,
            payrollCurrency,
            exchangeRate
        );

        var incentiveId = jdbcTemplate.queryForObject(
            """
                SELECT id
                FROM hr_incentives
                WHERE company_id = ? AND incentive_code = ?
                FOR UPDATE
                """,
            Long.class,
            companyId,
            incentiveCode
        );
        if (incentiveId == null) {
            throw new IllegalStateException("Payroll deduction source could not be created.");
        }

        var existingApplication = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_incentive_applications
                WHERE company_id = ?
                  AND incentive_id = ?
                  AND user_company_id = ?
                  AND source_type = ?
                  AND source_reference_type = ?
                  AND source_reference_id = ?
                """,
            Integer.class,
            companyId,
            incentiveId,
            membership.userCompanyId(),
            PETTY_CASH_SOURCE,
            PETTY_CASH_REFERENCE,
            String.valueOf(statementId)
        );
        if (existingApplication != null && existingApplication > 0) {
            return;
        }

        jdbcTemplate.update(
            """
                INSERT INTO hr_incentive_assignments
                (incentive_id, company_id, assignment_type, user_company_id, unit_id, business_id)
                SELECT ?, ?, 'employee', ?, NULL, NULL
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM hr_incentive_assignments
                    WHERE incentive_id = ? AND company_id = ? AND user_company_id = ?
                )
                """,
            incentiveId,
            companyId,
            membership.userCompanyId(),
            incentiveId,
            companyId,
            membership.userCompanyId()
        );

        jdbcTemplate.update(
            """
                INSERT INTO hr_incentive_applications
                (company_id, incentive_id, user_company_id, period_start_date, period_end_date, amount, currency_code,
                 payroll_category, tax_treatment, taxable, affects_social_security, affects_employer_cost, source_type,
                 source_reference_type, source_reference_id, status, calculation_snapshot_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'deduction', 'operational_recovery', 0, 0, 0, ?, ?, ?, 'approved',
                        JSON_OBJECT('decision', 'pending_manual_payroll_application', 'fund_id', ?, 'statement_id', ?,
                                    'entered_amount', ?, 'entered_currency', ?, 'payroll_amount', ?,
                                    'payroll_currency', ?, 'exchange_rate', ?))
                """,
            companyId,
            incentiveId,
            membership.userCompanyId(),
            effectiveDate,
            OPEN_END_DATE,
            payrollAmount,
            payrollCurrency,
            PETTY_CASH_SOURCE,
            PETTY_CASH_REFERENCE,
            String.valueOf(statementId),
            fundId,
            statementId,
            amount,
            enteredCurrency,
            payrollAmount,
            payrollCurrency,
            exchangeRate
        );
    }

    private ActiveMembership resolveActiveMembership(long companyId, long userId) {
        var rows = jdbcTemplate.queryForList(
            """
                SELECT uc.id AS user_company_id,
                       COALESCE(MAX(wp.registration_country), '') AS registration_country
                FROM user_companies uc
                LEFT JOIN user_work_profiles wp
                  ON wp.user_company_id = uc.id
                 AND wp.company_id = uc.company_id
                WHERE uc.company_id = ?
                  AND uc.user_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                GROUP BY uc.id
                ORDER BY uc.id DESC
                LIMIT 1
                """,
            companyId,
            userId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("The fund responsible user is not an active company collaborator.");
        }
        var row = rows.getFirst();
        var id = row.get("user_company_id");
        if (!(id instanceof Number number)) {
            throw new IllegalStateException("The responsible collaborator membership is invalid.");
        }
        return new ActiveMembership(number.longValue(), String.valueOf(row.getOrDefault("registration_country", "")));
    }

    static String resolvePayrollCurrency(String country, String fallback) {
        var normalizedCountry = country == null
            ? ""
            : country.trim().toUpperCase(Locale.ROOT).replace(" ", "");
        return switch (normalizedCountry) {
            case "BR", "BRAZIL", "BRASIL" -> "BRL";
            case "CA", "CANADA" -> "CAD";
            case "CO", "COLOMBIA" -> "COP";
            case "MX", "MEXICO", "MÉXICO" -> "MXN";
            case "US", "USA", "UNITEDSTATES" -> "USD";
            default -> normalizeCurrency(fallback);
        };
    }

    private static String normalizeCurrency(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() != 3) {
            throw new IllegalArgumentException("Fund shortage currency must use a three-letter ISO code.");
        }
        return normalized;
    }

    private static BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static String normalizedLabel(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private record ActiveMembership(long userCompanyId, String registrationCountry) {
    }
}
