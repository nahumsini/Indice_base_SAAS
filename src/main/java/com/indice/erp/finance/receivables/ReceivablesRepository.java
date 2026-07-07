package com.indice.erp.finance.receivables;

import com.indice.erp.finance.receivables.ReceivablesDtos.CandidateSaleResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.CreditPolicyResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.CreditSaleResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.CreditSimulationResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.ReceivableAccountResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.ReceivableInstallmentResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.ReceivablePaymentResponse;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class ReceivablesRepository {

    private final JdbcTemplate jdbcTemplate;

    ReceivablesRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<CreditSaleResponse> listCreditSales(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT credit_sale.*, unit.name AS unit_name, business.name AS business_name
            FROM finance_credit_sales credit_sale
            LEFT JOIN units unit ON unit.id = credit_sale.unit_id
            LEFT JOIN businesses business ON business.id = credit_sale.business_id
            WHERE credit_sale.company_id = ?
              AND credit_sale.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("credit_sale", context.scope()) + """
            ORDER BY credit_sale.sale_date DESC, credit_sale.id DESC
            """,
            (rs, rowNum) -> mapCreditSale(rs),
            params.toArray()
        );
    }

    List<ReceivableAccountResponse> listReceivableAccounts(FinanceContext context, LocalDate today) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT account.*, unit.name AS unit_name, business.name AS business_name
            FROM finance_receivable_accounts account
            LEFT JOIN units unit ON unit.id = account.unit_id
            LEFT JOIN businesses business ON business.id = account.business_id
            WHERE account.company_id = ?
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            ORDER BY account.due_date ASC, account.id DESC
            """,
            (rs, rowNum) -> mapReceivableAccount(rs, today),
            params.toArray()
        );
    }

    Optional<ReceivableAccountResponse> findReceivableAccount(FinanceContext context, long receivableId, LocalDate today) {
        var params = scopedParams(context);
        params.add(1, receivableId);
        var rows = jdbcTemplate.query(
            """
            SELECT account.*, unit.name AS unit_name, business.name AS business_name
            FROM finance_receivable_accounts account
            LEFT JOIN units unit ON unit.id = account.unit_id
            LEFT JOIN businesses business ON business.id = account.business_id
            WHERE account.company_id = ?
              AND account.id = ?
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            """,
            (rs, rowNum) -> mapReceivableAccount(rs, today),
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    List<ReceivableInstallmentResponse> listInstallments(FinanceContext context, LocalDate today) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT installment.*, account.sale_number, account.customer_name,
                   unit.name AS unit_name, business.name AS business_name
            FROM finance_receivable_installments installment
            JOIN finance_receivable_accounts account ON account.id = installment.receivable_id
            LEFT JOIN units unit ON unit.id = account.unit_id
            LEFT JOIN businesses business ON business.id = account.business_id
            WHERE installment.company_id = ?
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            ORDER BY installment.due_date ASC, installment.installment_number ASC
            """,
            (rs, rowNum) -> mapInstallment(rs, today),
            params.toArray()
        );
    }

    private List<ReceivableInstallmentResponse> listOpenInstallmentsForAccount(
            FinanceContext context,
            long receivableId,
            LocalDate today) {
        var params = scopedParams(context);
        params.add(1, receivableId);
        return jdbcTemplate.query(
            """
            SELECT installment.*, account.sale_number, account.customer_name,
                   unit.name AS unit_name, business.name AS business_name
            FROM finance_receivable_installments installment
            JOIN finance_receivable_accounts account ON account.id = installment.receivable_id
            LEFT JOIN units unit ON unit.id = account.unit_id
            LEFT JOIN businesses business ON business.id = account.business_id
            WHERE installment.company_id = ?
              AND installment.receivable_id = ?
              AND installment.balance_amount > 0
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            ORDER BY installment.due_date ASC, installment.installment_number ASC
            """,
            (rs, rowNum) -> mapInstallment(rs, today),
            params.toArray()
        );
    }

    List<ReceivablePaymentResponse> listPayments(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT payment.*, account.sale_number, account.customer_name
            FROM finance_receivable_payments payment
            JOIN finance_receivable_accounts account ON account.id = payment.receivable_id
            WHERE payment.company_id = ?
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            ORDER BY payment.payment_date DESC, payment.id DESC
            """,
            (rs, rowNum) -> mapPayment(rs),
            params.toArray()
        );
    }

    List<CreditPolicyResponse> listCreditPolicies(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT policy.*, unit.name AS unit_name, business.name AS business_name
            FROM finance_credit_policies policy
            LEFT JOIN units unit ON unit.id = policy.unit_id
            LEFT JOIN businesses business ON business.id = policy.business_id
            WHERE policy.company_id = ?
              AND policy.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("policy", context.scope()) + """
            ORDER BY policy.customer_name ASC, policy.id DESC
            """,
            (rs, rowNum) -> mapCreditPolicy(rs),
            params.toArray()
        );
    }

    Optional<CreditPolicyResponse> findCreditPolicy(FinanceContext context, Long contactId, String customerName) {
        var params = scopedParams(context);
        params.add(1, contactId);
        params.add(2, contactId);
        params.add(3, contactId);
        params.add(4, safe(customerName));
        var rows = jdbcTemplate.query(
            """
            SELECT policy.*, unit.name AS unit_name, business.name AS business_name
            FROM finance_credit_policies policy
            LEFT JOIN units unit ON unit.id = policy.unit_id
            LEFT JOIN businesses business ON business.id = policy.business_id
            WHERE policy.company_id = ?
              AND (
                (? IS NOT NULL AND policy.contact_id = ?)
                OR (? IS NULL AND LOWER(policy.customer_name) = LOWER(?))
              )
              AND policy.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("policy", context.scope()) + """
            ORDER BY policy.id DESC
            LIMIT 1
            """,
            (rs, rowNum) -> mapCreditPolicy(rs),
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    BigDecimal sumMonthlyCreditSales(
            FinanceContext context,
            Long contactId,
            String customerName,
            LocalDate monthStart,
            LocalDate monthEnd) {
        var params = scopedParams(context);
        params.add(1, contactId);
        params.add(2, contactId);
        params.add(3, contactId);
        params.add(4, safe(customerName));
        params.add(5, Date.valueOf(monthStart));
        params.add(6, Date.valueOf(monthEnd));
        var amount = jdbcTemplate.queryForObject(
            """
            SELECT COALESCE(SUM(credit_sale.financed_amount), 0)
            FROM finance_credit_sales credit_sale
            WHERE credit_sale.company_id = ?
              AND (
                (? IS NOT NULL AND credit_sale.contact_id = ?)
                OR (? IS NULL AND LOWER(credit_sale.customer_name) = LOWER(?))
              )
              AND credit_sale.sale_date >= ?
              AND credit_sale.sale_date < ?
              AND credit_sale.status NOT IN ('REJECTED', 'CANCELLED')
              AND credit_sale.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("credit_sale", context.scope()) + """
            """,
            BigDecimal.class,
            params.toArray()
        );
        return amount == null ? BigDecimal.ZERO : amount;
    }

    List<CandidateSaleResponse> listCandidateSales(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT sale.id AS sales_record_id,
                   ticket.id AS pos_ticket_id,
                   sale.contact_id,
                   sale.unit_id,
                   sale.business_id,
                   sale.sale_number,
                   sale.customer_name,
                   COALESCE(sale.sale_date, CURRENT_DATE) AS sale_date,
                   sale.total_amount,
                   UPPER(COALESCE(sale.currency, 'MXN')) AS currency_code,
                   unit.name AS unit_name,
                   business.name AS business_name
            FROM sales_records sale
            LEFT JOIN pos_tickets ticket ON ticket.sales_record_id = sale.id AND ticket.deleted_at IS NULL
            LEFT JOIN units unit ON unit.id = sale.unit_id
            LEFT JOIN businesses business ON business.id = sale.business_id
            WHERE sale.company_id = ?
              AND sale.deleted_at IS NULL
              AND sale.total_amount > 0
              AND NOT EXISTS (
                SELECT 1
                FROM finance_credit_sales credit_sale
                WHERE credit_sale.company_id = sale.company_id
                  AND credit_sale.sales_record_id = sale.id
                  AND credit_sale.deleted_at IS NULL
              )
              AND """ + FinanceSqlSupport.scopePredicate("sale", context.scope()) + """
            ORDER BY COALESCE(sale.sale_date, CURRENT_DATE) DESC, sale.id DESC
            LIMIT 200
            """,
            (rs, rowNum) -> mapCandidateSale(rs),
            params.toArray()
        );
    }

    Optional<CandidateSaleResponse> findCandidateSale(FinanceContext context, long salesRecordId) {
        var params = scopedParams(context);
        params.add(1, salesRecordId);
        var rows = jdbcTemplate.query(
            """
            SELECT sale.id AS sales_record_id,
                   ticket.id AS pos_ticket_id,
                   sale.contact_id,
                   sale.unit_id,
                   sale.business_id,
                   sale.sale_number,
                   sale.customer_name,
                   COALESCE(sale.sale_date, CURRENT_DATE) AS sale_date,
                   sale.total_amount,
                   UPPER(COALESCE(sale.currency, 'MXN')) AS currency_code,
                   unit.name AS unit_name,
                   business.name AS business_name
            FROM sales_records sale
            LEFT JOIN pos_tickets ticket ON ticket.sales_record_id = sale.id AND ticket.deleted_at IS NULL
            LEFT JOIN units unit ON unit.id = sale.unit_id
            LEFT JOIN businesses business ON business.id = sale.business_id
            WHERE sale.company_id = ?
              AND sale.id = ?
              AND sale.deleted_at IS NULL
              AND sale.total_amount > 0
              AND NOT EXISTS (
                SELECT 1
                FROM finance_credit_sales credit_sale
                WHERE credit_sale.company_id = sale.company_id
                  AND credit_sale.sales_record_id = sale.id
                  AND credit_sale.deleted_at IS NULL
              )
              AND """ + FinanceSqlSupport.scopePredicate("sale", context.scope()) + """
            """,
            (rs, rowNum) -> mapCandidateSale(rs),
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    CreditSaleResponse insertCreditSale(
            FinanceContext context,
            CandidateSaleResponse source,
            BigDecimal financedAmount,
            LocalDate firstDueDate,
            CreditSimulationResponse simulation) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                INSERT INTO finance_credit_sales
                (company_id, unit_id, business_id, sales_record_id, pos_ticket_id, contact_id, sale_number,
                 customer_name, source, sale_date, original_amount, financed_amount, currency_code, status,
                 selected_simulation_key, selected_simulation_name, term_months, annual_interest_rate,
                 monthly_payment_amount, total_interest_amount, total_payable_amount, first_due_date,
                 due_date, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                Statement.RETURN_GENERATED_KEYS
            );
            bindCreditSale(statement, context, source, financedAmount, firstDueDate, simulation);
            return statement;
        }, keyHolder);
        var id = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return listCreditSales(context).stream()
            .filter(item -> item.id().equals(id))
            .findFirst()
            .orElseThrow();
    }

    ReceivableAccountResponse insertReceivableAccount(
            FinanceContext context,
            CreditSaleResponse sale,
            String status) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                INSERT INTO finance_receivable_accounts
                (company_id, unit_id, business_id, credit_sale_id, sales_record_id, pos_ticket_id, contact_id,
                 sale_number, customer_name, original_amount, total_payable_amount, paid_amount, balance_amount,
                 currency_code, due_date, next_payment_date, installment_amount, term_months, annual_interest_rate,
                 status, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0000, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setLong(1, context.companyId());
            setNullableLong(statement, 2, sale.unitId());
            setNullableLong(statement, 3, sale.businessId());
            statement.setLong(4, sale.id());
            setNullableLong(statement, 5, sale.salesRecordId());
            setNullableLong(statement, 6, sale.posTicketId());
            setNullableLong(statement, 7, sale.contactId());
            statement.setString(8, sale.saleNumber());
            statement.setString(9, sale.customerName());
            statement.setBigDecimal(10, sale.financedAmount());
            statement.setBigDecimal(11, sale.selectedSimulation().totalPayable());
            statement.setBigDecimal(12, sale.selectedSimulation().totalPayable());
            statement.setString(13, sale.currency());
            statement.setDate(14, Date.valueOf(sale.dueDate()));
            statement.setDate(15, Date.valueOf(sale.firstDueDate()));
            statement.setBigDecimal(16, sale.selectedSimulation().monthlyPayment());
            statement.setInt(17, sale.selectedSimulation().termMonths());
            statement.setBigDecimal(18, sale.selectedSimulation().annualInterestRate());
            statement.setString(19, status);
            statement.setLong(20, context.userId());
            return statement;
        }, keyHolder);
        var id = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findReceivableAccount(context, id, LocalDate.now()).orElseThrow();
    }

    void insertPayment(FinanceContext context, ReceivableAccountResponse account, String method, BigDecimal amount,
            LocalDate paymentDate, String reference, String registeredBy) {
        jdbcTemplate.update(
            """
            INSERT INTO finance_receivable_payments
            (company_id, receivable_id, payment_date, payment_method, amount, currency_code, reference,
             registered_by_user_id, registered_by_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            context.companyId(),
            account.id(),
            Date.valueOf(paymentDate),
            method,
            amount,
            account.currency(),
            reference,
            context.userId(),
            registeredBy
        );
    }

    void insertInstallments(FinanceContext context, ReceivableAccountResponse account, LocalDate today) {
        var remaining = account.totalPayable();
        for (var index = 1; index <= account.termMonths() && remaining.compareTo(BigDecimal.ZERO) > 0; index++) {
            var dueDate = account.nextPaymentDate().plusMonths(index - 1L);
            var amount = index == account.termMonths()
                ? remaining
                : account.installmentAmount().min(remaining);
            amount = money(amount);
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            var status = resolveInstallmentStatus("ON_TIME", BigDecimal.ZERO, amount, dueDate, today);

            jdbcTemplate.update(
                """
                INSERT INTO finance_receivable_installments
                (company_id, receivable_id, credit_sale_id, installment_number, due_date, amount,
                 paid_amount, balance_amount, currency_code, status)
                VALUES (?, ?, ?, ?, ?, ?, 0.0000, ?, ?, ?)
                """,
                context.companyId(),
                account.id(),
                account.creditSaleId(),
                index,
                Date.valueOf(dueDate),
                amount,
                amount,
                account.currency(),
                status
            );
            remaining = money(remaining.subtract(amount).max(BigDecimal.ZERO));
        }
    }

    void applyPaymentToInstallments(
            FinanceContext context,
            long receivableId,
            BigDecimal paymentAmount,
            LocalDate paymentDate,
            LocalDate today) {
        var remaining = paymentAmount;
        var installments = listOpenInstallmentsForAccount(context, receivableId, today);

        for (var installment : installments) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            var appliedAmount = installment.balance().min(remaining);
            var paidAmount = money(installment.paidAmount().add(appliedAmount));
            var balance = money(installment.amount().subtract(paidAmount).max(BigDecimal.ZERO));
            var status = resolveInstallmentStatus(installment.status(), paidAmount, balance, installment.dueDate(), today);

            jdbcTemplate.update(
                """
                UPDATE finance_receivable_installments
                SET paid_amount = ?,
                    balance_amount = ?,
                    status = ?,
                    paid_at = ?,
                    version = version + 1
                WHERE company_id = ?
                  AND id = ?
                """,
                paidAmount,
                balance,
                status,
                balance.compareTo(BigDecimal.ZERO) == 0 ? Date.valueOf(paymentDate) : null,
                context.companyId(),
                installment.id()
            );
            remaining = money(remaining.subtract(appliedAmount).max(BigDecimal.ZERO));
        }
    }

    Optional<LocalDate> findNextOpenInstallmentDueDate(FinanceContext context, long receivableId) {
        var params = scopedParams(context);
        params.add(1, receivableId);
        var rows = jdbcTemplate.query(
            """
            SELECT installment.due_date
            FROM finance_receivable_installments installment
            JOIN finance_receivable_accounts account ON account.id = installment.receivable_id
            WHERE installment.company_id = ?
              AND installment.receivable_id = ?
              AND installment.balance_amount > 0
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            ORDER BY installment.due_date ASC, installment.installment_number ASC
            LIMIT 1
            """,
            (rs, rowNum) -> localDate(rs, "due_date"),
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    void updateReceivableAfterPayment(
            FinanceContext context,
            ReceivableAccountResponse account,
            BigDecimal paidAmount,
            BigDecimal balance,
            LocalDate nextPaymentDate,
            String status) {
        jdbcTemplate.update(
            """
            UPDATE finance_receivable_accounts
            SET paid_amount = ?,
                balance_amount = ?,
                next_payment_date = ?,
                status = ?,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            paidAmount,
            balance,
            Date.valueOf(nextPaymentDate),
            status,
            context.userId(),
            context.companyId(),
            account.id()
        );
    }

    void markCreditSaleCompleted(FinanceContext context, long creditSaleId) {
        jdbcTemplate.update(
            """
            UPDATE finance_credit_sales
            SET status = 'COMPLETED',
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            context.userId(),
            context.companyId(),
            creditSaleId
        );
    }

    void decreaseAvailableCredit(FinanceContext context, Long contactId, String customerName, BigDecimal amount) {
        jdbcTemplate.update(
            """
            UPDATE finance_credit_policies
            SET available_credit_amount = GREATEST(0.0000, available_credit_amount - ?),
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND deleted_at IS NULL
              AND (
                (? IS NOT NULL AND contact_id = ?)
                OR (? IS NULL AND LOWER(customer_name) = LOWER(?))
              )
            """,
            amount,
            context.userId(),
            context.companyId(),
            contactId,
            contactId,
            contactId,
            customerName
        );
    }

    void increaseAvailableCredit(FinanceContext context, Long contactId, String customerName, BigDecimal amount) {
        jdbcTemplate.update(
            """
            UPDATE finance_credit_policies
            SET available_credit_amount = LEAST(credit_line_amount, available_credit_amount + ?),
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND deleted_at IS NULL
              AND (
                (? IS NOT NULL AND contact_id = ?)
                OR (? IS NULL AND LOWER(customer_name) = LOWER(?))
              )
            """,
            amount,
            context.userId(),
            context.companyId(),
            contactId,
            contactId,
            contactId,
            customerName
        );
    }

    void insertCreditPolicy(
            FinanceContext context,
            Long contactId,
            Long unitId,
            Long businessId,
            String customerName,
            BigDecimal creditLine,
            BigDecimal monthlyPurchaseLimit,
            int defaultTermMonths,
            BigDecimal annualInterestRate,
            String status,
            String notes) {
        jdbcTemplate.update(
            """
            INSERT INTO finance_credit_policies
            (company_id, unit_id, business_id, contact_id, customer_name, credit_line_amount,
             monthly_purchase_limit_amount, available_credit_amount, default_term_months,
             annual_interest_rate, status, notes, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            context.companyId(),
            unitId,
            businessId,
            contactId,
            customerName,
            creditLine,
            monthlyPurchaseLimit,
            creditLine,
            defaultTermMonths,
            annualInterestRate,
            status,
            notes,
            context.userId()
        );
    }

    boolean unitExists(FinanceContext context, Long unitId) {
        if (unitId == null) {
            return true;
        }
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM units WHERE id = ? AND (company_id = ? OR company_id IS NULL)",
            Long.class,
            unitId,
            context.companyId()
        );
        return count != null && count > 0;
    }

    boolean businessExists(FinanceContext context, Long unitId, Long businessId) {
        if (businessId == null) {
            return true;
        }
        var sql = unitId == null
            ? "SELECT COUNT(*) FROM businesses WHERE id = ? AND (company_id = ? OR company_id IS NULL)"
            : "SELECT COUNT(*) FROM businesses WHERE id = ? AND unit_id = ? AND (company_id = ? OR company_id IS NULL)";
        var count = unitId == null
            ? jdbcTemplate.queryForObject(sql, Long.class, businessId, context.companyId())
            : jdbcTemplate.queryForObject(sql, Long.class, businessId, unitId, context.companyId());
        return count != null && count > 0;
    }

    boolean contactExists(FinanceContext context, Long contactId) {
        if (contactId == null) {
            return true;
        }
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM sales_contacts WHERE id = ? AND company_id = ? AND deleted_at IS NULL",
            Long.class,
            contactId,
            context.companyId()
        );
        return count != null && count > 0;
    }

    private void bindCreditSale(
            PreparedStatement statement,
            FinanceContext context,
            CandidateSaleResponse source,
            BigDecimal financedAmount,
            LocalDate firstDueDate,
            CreditSimulationResponse simulation) throws SQLException {
        var index = 1;
        statement.setLong(index++, context.companyId());
        setNullableLong(statement, index++, source.unitId());
        setNullableLong(statement, index++, source.businessId());
        setNullableLong(statement, index++, source.salesRecordId());
        setNullableLong(statement, index++, source.posTicketId());
        setNullableLong(statement, index++, source.contactId());
        statement.setString(index++, source.saleNumber());
        statement.setString(index++, source.customerName());
        statement.setString(index++, normalizeSource(source.source()));
        statement.setDate(index++, Date.valueOf(source.saleDate()));
        statement.setBigDecimal(index++, source.amount());
        statement.setBigDecimal(index++, financedAmount);
        statement.setString(index++, source.currency());
        statement.setString(index++, simulation.id());
        statement.setString(index++, simulation.name());
        statement.setInt(index++, simulation.termMonths());
        statement.setBigDecimal(index++, simulation.annualInterestRate());
        statement.setBigDecimal(index++, simulation.monthlyPayment());
        statement.setBigDecimal(index++, simulation.totalInterest());
        statement.setBigDecimal(index++, simulation.totalPayable());
        statement.setDate(index++, Date.valueOf(firstDueDate));
        statement.setDate(index++, Date.valueOf(firstDueDate.plusMonths(Math.max(0, simulation.termMonths() - 1L))));
        statement.setLong(index, context.userId());
    }

    private CreditSaleResponse mapCreditSale(ResultSet rs) throws SQLException {
        var simulation = new CreditSimulationResponse(
            rs.getString("selected_simulation_key"),
            rs.getString("selected_simulation_name"),
            rs.getInt("term_months"),
            rs.getBigDecimal("annual_interest_rate"),
            rs.getBigDecimal("monthly_payment_amount"),
            rs.getBigDecimal("total_payable_amount"),
            rs.getBigDecimal("total_interest_amount")
        );
        var salesRecordId = nullableLong(rs, "sales_record_id");
        return new CreditSaleResponse(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            salesRecordId,
            nullableLong(rs, "pos_ticket_id"),
            nullableLong(rs, "contact_id"),
            salesRecordId == null ? "manual:" + rs.getLong("id") : "sales:" + salesRecordId,
            rs.getString("sale_number"),
            customerId(nullableLong(rs, "contact_id"), rs.getString("customer_name")),
            rs.getString("customer_name"),
            labelOrDefault(rs.getString("unit_name"), "Unidad general"),
            labelOrDefault(rs.getString("business_name"), "Negocio general"),
            localDate(rs, "sale_date"),
            rs.getBigDecimal("original_amount"),
            rs.getBigDecimal("financed_amount"),
            rs.getString("currency_code"),
            rs.getString("status"),
            simulation,
            localDate(rs, "first_due_date"),
            localDate(rs, "due_date"),
            rs.getString("source")
        );
    }

    private ReceivableAccountResponse mapReceivableAccount(ResultSet rs, LocalDate today) throws SQLException {
        var balance = rs.getBigDecimal("balance_amount");
        var dueDate = localDate(rs, "due_date");
        var nextPaymentDate = localDate(rs, "next_payment_date");
        return new ReceivableAccountResponse(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            rs.getLong("credit_sale_id"),
            nullableLong(rs, "sales_record_id"),
            nullableLong(rs, "pos_ticket_id"),
            nullableLong(rs, "contact_id"),
            rs.getString("sale_number"),
            customerId(nullableLong(rs, "contact_id"), rs.getString("customer_name")),
            rs.getString("customer_name"),
            labelOrDefault(rs.getString("unit_name"), "Unidad general"),
            labelOrDefault(rs.getString("business_name"), "Negocio general"),
            rs.getBigDecimal("original_amount"),
            rs.getBigDecimal("total_payable_amount"),
            rs.getBigDecimal("paid_amount"),
            balance,
            rs.getString("currency_code"),
            dueDate,
            nextPaymentDate,
            rs.getBigDecimal("installment_amount"),
            rs.getInt("term_months"),
            rs.getBigDecimal("annual_interest_rate"),
            resolveStatus(rs.getString("status"), balance, nextPaymentDate, today)
        );
    }

    private ReceivableInstallmentResponse mapInstallment(ResultSet rs, LocalDate today) throws SQLException {
        var paidAmount = rs.getBigDecimal("paid_amount");
        var balance = rs.getBigDecimal("balance_amount");
        var dueDate = localDate(rs, "due_date");
        return new ReceivableInstallmentResponse(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getLong("receivable_id"),
            rs.getLong("credit_sale_id"),
            rs.getInt("installment_number"),
            rs.getString("sale_number"),
            rs.getString("customer_name"),
            labelOrDefault(rs.getString("unit_name"), "Unidad general"),
            labelOrDefault(rs.getString("business_name"), "Negocio general"),
            dueDate,
            rs.getBigDecimal("amount"),
            paidAmount,
            balance,
            rs.getString("currency_code"),
            resolveInstallmentStatus(rs.getString("status"), paidAmount, balance, dueDate, today)
        );
    }

    private ReceivablePaymentResponse mapPayment(ResultSet rs) throws SQLException {
        return new ReceivablePaymentResponse(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getLong("receivable_id"),
            rs.getString("sale_number"),
            rs.getString("customer_name"),
            localDate(rs, "payment_date"),
            rs.getString("payment_method"),
            rs.getBigDecimal("amount"),
            rs.getString("currency_code"),
            rs.getString("reference"),
            labelOrDefault(rs.getString("registered_by_name"), "Finanzas")
        );
    }

    private CreditPolicyResponse mapCreditPolicy(ResultSet rs) throws SQLException {
        var contactId = nullableLong(rs, "contact_id");
        return new CreditPolicyResponse(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            contactId,
            customerId(contactId, rs.getString("customer_name")),
            rs.getString("customer_name"),
            rs.getBigDecimal("credit_line_amount"),
            rs.getBigDecimal("monthly_purchase_limit_amount"),
            rs.getBigDecimal("available_credit_amount"),
            rs.getInt("default_term_months"),
            rs.getBigDecimal("annual_interest_rate"),
            rs.getString("status"),
            labelOrDefault(rs.getString("unit_name"), "Unidad general"),
            labelOrDefault(rs.getString("business_name"), "Negocio general"),
            rs.getString("notes")
        );
    }

    private CandidateSaleResponse mapCandidateSale(ResultSet rs) throws SQLException {
        var salesRecordId = rs.getLong("sales_record_id");
        var posTicketId = nullableLong(rs, "pos_ticket_id");
        var contactId = nullableLong(rs, "contact_id");
        var source = posTicketId == null && !safe(rs.getString("sale_number")).startsWith("POS-") ? "SALES" : "POS";
        return new CandidateSaleResponse(
            "sales:" + salesRecordId,
            salesRecordId,
            posTicketId,
            contactId,
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            rs.getString("sale_number"),
            customerId(contactId, rs.getString("customer_name")),
            rs.getString("customer_name"),
            labelOrDefault(rs.getString("unit_name"), "Unidad general"),
            labelOrDefault(rs.getString("business_name"), "Negocio general"),
            localDate(rs, "sale_date"),
            rs.getBigDecimal("total_amount"),
            rs.getString("currency_code"),
            source
        );
    }

    private ArrayList<Object> scopedParams(FinanceContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        appendScopeParam(params, context.scope());
        return params;
    }

    private void appendScopeParam(List<Object> params, FinanceScope scope) {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> params.add(scope.unitId());
            case BUSINESS_OFFICE -> params.add(scope.businessId());
        }
    }

    private String resolveStatus(String storedStatus, BigDecimal balance, LocalDate dueDate, LocalDate today) {
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            return "PAID";
        }
        if ("RESTRUCTURED".equals(storedStatus)) {
            return storedStatus;
        }
        if (dueDate.isBefore(today)) {
            return "OVERDUE";
        }
        if (!dueDate.isAfter(today.plusDays(7))) {
            return "DUE_SOON";
        }
        return "ON_TIME";
    }

    private String resolveInstallmentStatus(
            String storedStatus,
            BigDecimal paidAmount,
            BigDecimal balance,
            LocalDate dueDate,
            LocalDate today) {
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            return "PAID";
        }
        if ("CANCELLED".equals(storedStatus)) {
            return storedStatus;
        }
        if (dueDate.isBefore(today)) {
            return "OVERDUE";
        }
        if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIAL";
        }
        if (!dueDate.isAfter(today.plusDays(7))) {
            return "DUE_SOON";
        }
        return "ON_TIME";
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private String normalizeSource(String value) {
        var normalized = safe(value).toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "POS" -> "POS";
            case "MANUAL" -> "MANUAL";
            default -> "SALES";
        };
    }

    private String customerId(Long contactId, String customerName) {
        if (contactId != null) {
            return String.valueOf(contactId);
        }
        return "customer:" + safe(customerName)
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
    }

    private String labelOrDefault(String value, String fallback) {
        var cleaned = value == null ? "" : value.trim();
        return cleaned.isBlank() ? fallback : cleaned;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private LocalDate localDate(ResultSet rs, String column) throws SQLException {
        var value = rs.getDate(column);
        return value == null ? LocalDate.now() : value.toLocalDate();
    }

    private Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private void setNullableLong(PreparedStatement statement, int index, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
        } else {
            statement.setLong(index, value);
        }
    }
}
