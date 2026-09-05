package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.sql.Date;
import java.time.YearMonth;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Opens the calendar-month statement for every active petty-cash fund. */
@Component
class PettyCashMonthlyCutScheduler {

    private final JdbcTemplate jdbcTemplate;
    private final FinanceBusinessTimeZoneResolver timeZoneResolver;

    PettyCashMonthlyCutScheduler(
            JdbcTemplate jdbcTemplate,
            FinanceBusinessTimeZoneResolver timeZoneResolver) {
        this.jdbcTemplate = jdbcTemplate;
        this.timeZoneResolver = timeZoneResolver;
    }

    @Scheduled(cron = "0 5 * * * *", zone = "UTC")
    @Transactional
    public void openMonthlyStatements() {
        var companyIds = jdbcTemplate.query(
            """
            SELECT DISTINCT company_id
            FROM finance_petty_cash_funds
            WHERE deleted_at IS NULL AND status <> 'CLOSED'
            """,
            (rs, rowNum) -> rs.getLong("company_id")
        );
        for (var companyId : companyIds) {
            openPeriod(companyId, YearMonth.now(timeZoneResolver.resolve(companyId)));
        }
    }

    void openPeriod(long companyId, YearMonth period) {
        var periodKey = period.toString();
        var periodStart = period.atDay(1);
        var periodEnd = period.atEndOfMonth();

        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_statements statement
            JOIN finance_petty_cash_funds fund ON fund.id = statement.petty_cash_fund_id
            SET statement.status = 'CUT_PENDING',
                statement.version = statement.version + 1
            WHERE statement.period_key < ?
              AND statement.company_id = ?
              AND statement.status = 'OPEN'
              AND statement.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND fund.status <> 'CLOSED'
            """,
            periodKey,
            companyId
        );

        jdbcTemplate.update(
            """
            INSERT INTO finance_petty_cash_statements
            (company_id, petty_cash_fund_id, folio, period_key, period_start, period_end, cut_off_date,
             opening_balance_amount, assigned_amount, additional_deposit_amount, declared_closing_balance_amount,
             estimated_usage_amount, verified_expense_amount, returned_amount, shortage_amount, carry_forward_amount,
             currency_code, status, responsible_user_id, attachment_count, created_by_user_id,
             custom_fields_json, metadata_json)
            SELECT fund.company_id,
                   fund.id,
                   CONCAT('PC-ST-', ?, '-', fund.id),
                   ?,
                   ?,
                   ?,
                   ?,
                   fund.current_balance_amount,
                   0, 0,
                   fund.current_balance_amount,
                   0, 0, 0, 0, 0,
                   fund.currency_code,
                   'OPEN',
                   fund.responsible_user_id,
                   0,
                   NULL,
                   NULL,
                   NULL
            FROM finance_petty_cash_funds fund
            WHERE fund.deleted_at IS NULL
              AND fund.company_id = ?
              AND fund.status <> 'CLOSED'
              AND NOT EXISTS (
                SELECT 1
                FROM finance_petty_cash_statements existing
                WHERE existing.petty_cash_fund_id = fund.id
                  AND existing.period_key = ?
                  AND existing.deleted_at IS NULL
              )
            """,
            periodKey,
            periodKey,
            Date.valueOf(periodStart),
            Date.valueOf(periodEnd),
            Date.valueOf(periodEnd),
            companyId,
            periodKey
        );
    }
}
