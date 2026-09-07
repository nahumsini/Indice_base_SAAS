package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.finance.expenses.ExpenseType;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class PettyCashRepository {

    private final JdbcTemplate jdbcTemplate;
    private final PettyCashMapper mapper;

    PettyCashRepository(JdbcTemplate jdbcTemplate, PettyCashMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    List<PettyCashFundRecord> findFunds(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.FUND_COLUMNS + """
            FROM finance_petty_cash_funds fund
            WHERE fund.company_id = ?
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            ORDER BY fund.name ASC, fund.id ASC
            """,
            mapper::mapFund,
            params.toArray()
        );
    }

    Optional<PettyCashFundRecord> findFundById(FinanceContext context, long fundId) {
        var params = scopedParams(context);
        params.add(1, fundId);
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.FUND_COLUMNS + """
            FROM finance_petty_cash_funds fund
            WHERE fund.company_id = ?
              AND fund.id = ?
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            """,
            mapper::mapFund,
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    void lockFund(FinanceContext context, long fundId) {
        jdbcTemplate.queryForList("""
            SELECT fund.id FROM finance_petty_cash_funds fund
            WHERE fund.company_id = ? AND fund.id = ? AND fund.deleted_at IS NULL
              AND %s FOR UPDATE
            """.formatted(FinanceSqlSupport.scopePredicate("fund", context.scope())),
            scopedParams(context, fundId).toArray());
    }

    List<PettyCashStatementRecord> findStatements(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.STATEMENT_COLUMNS + """
            FROM finance_petty_cash_statements statement
            JOIN finance_petty_cash_funds fund ON fund.id = statement.petty_cash_fund_id
            WHERE statement.company_id = ?
              AND statement.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            ORDER BY statement.period_start DESC, statement.id DESC
            """,
            mapper::mapStatement,
            params.toArray()
        );
    }

    Optional<PettyCashStatementRecord> findStatementById(FinanceContext context, long statementId) {
        return findStatementById(context, statementId, false);
    }

    Optional<PettyCashStatementRecord> findStatementByIdForUpdate(FinanceContext context, long statementId) {
        return findStatementById(context, statementId, true);
    }

    private Optional<PettyCashStatementRecord> findStatementById(
            FinanceContext context,
            long statementId,
            boolean lock) {
        var params = scopedParams(context);
        params.add(1, statementId);
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.STATEMENT_COLUMNS + """
            FROM finance_petty_cash_statements statement
            JOIN finance_petty_cash_funds fund ON fund.id = statement.petty_cash_fund_id
            WHERE statement.company_id = ?
              AND statement.id = ?
              AND statement.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            """ + (lock ? " FOR UPDATE" : ""),
            mapper::mapStatement,
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    long countPendingSettlementLinesForStatement(FinanceContext context, long statementId) {
        var count = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM finance_petty_cash_settlement_lines settlement_line
            JOIN finance_petty_cash_funds fund ON fund.id = settlement_line.petty_cash_fund_id
            WHERE settlement_line.company_id = ?
              AND settlement_line.petty_cash_statement_id = ?
              AND settlement_line.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND (
                (fund.fund_type = 'INTERNAL_COMPANY'
                 AND settlement_line.status NOT IN ('EXPENSE_CREATED', 'REJECTED', 'REVERSED'))
                OR
                (fund.fund_type = 'EXTERNAL_MANAGED'
                 AND settlement_line.status NOT IN ('VALIDATED', 'REJECTED', 'REVERSED'))
              )
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            """,
            Long.class,
            scopedParams(context, statementId).toArray()
        );
        return count == null ? 0L : count;
    }

    Optional<PettyCashStatementRecord> findOpenStatementForFund(
            FinanceContext context,
            long fundId,
            String periodKey) {
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.STATEMENT_COLUMNS + """
            FROM finance_petty_cash_statements statement
            JOIN finance_petty_cash_funds fund ON fund.id = statement.petty_cash_fund_id
            WHERE statement.company_id = ?
              AND statement.petty_cash_fund_id = ?
              AND statement.period_key = ?
              AND statement.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            """,
            mapper::mapStatement,
            scopedParams(context, fundId, periodKey).toArray()
        );
        return rows.stream().findFirst();
    }

    void markPriorOpenStatementsCutPending(FinanceContext context, long fundId, String currentPeriodKey) {
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_statements
            SET status = 'CUT_PENDING',
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND petty_cash_fund_id = ?
              AND period_key < ?
              AND status = 'OPEN'
              AND deleted_at IS NULL
            """,
            context.userId(),
            context.companyId(),
            fundId,
            currentPeriodKey
        );
    }

    List<PettyCashMovementRecord> findMovements(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.MOVEMENT_COLUMNS + """
            FROM finance_petty_cash_movements movement
            JOIN finance_petty_cash_funds fund ON fund.id = movement.petty_cash_fund_id
            WHERE movement.company_id = ?
              AND movement.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            ORDER BY movement.movement_date DESC, movement.id DESC
            """,
            mapper::mapMovement,
            params.toArray()
        );
    }

    List<PettyCashSettlementLineRecord> findSettlementLines(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.SETTLEMENT_LINE_COLUMNS + """
            FROM finance_petty_cash_settlement_lines settlement_line
            JOIN finance_petty_cash_funds fund ON fund.id = settlement_line.petty_cash_fund_id
            WHERE settlement_line.company_id = ?
              AND settlement_line.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            ORDER BY settlement_line.expense_date DESC, settlement_line.id DESC
            """,
            mapper::mapSettlementLine,
            params.toArray()
        );
    }

    PettyCashFundRecord insertFund(FinanceContext context, PettyCashFundCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(PettyCashSql.INSERT_FUND, Statement.RETURN_GENERATED_KEYS);
            var index = 1;
            statement.setLong(index++, context.companyId());
            statement.setObject(index++, command.unitId());
            statement.setObject(index++, command.businessId());
            statement.setObject(index++, command.budgetId());
            statement.setObject(index++, command.budgetLineId());
            statement.setObject(index++, command.paymentAccountId());
            statement.setObject(index++, command.fundingSourcePaymentAccountId());
            statement.setObject(index++, command.responsibleUserId());
            statement.setString(index++, command.fundType().name());
            statement.setString(index++, command.name());
            statement.setString(index++, command.currencyCode());
            statement.setBigDecimal(index++, command.limitAmount());
            statement.setBigDecimal(index++, command.currentBalanceAmount());
            statement.setInt(index++, command.cutOffDay());
            statement.setString(index++, command.fundingSourceName());
            statement.setString(index++, command.externalOwnerType());
            statement.setString(index++, command.externalOwnerName());
            statement.setString(index++, command.externalOwnerRelationship());
            statement.setString(index++, command.externalOwnerReference());
            statement.setString(index++, command.statementRecipientEmail());
            statement.setString(index++, command.managedAssetType());
            statement.setString(index++, command.managedAssetName());
            statement.setString(index++, command.managedAssetReference());
            statement.setBoolean(index++, command.externalIdentityPending());
            statement.setString(index++, command.fundingMethodsJson());
            statement.setString(index++, command.spendingMethodsJson());
            statement.setBoolean(index++, command.kioskEnabled());
            statement.setBoolean(index++, command.kioskUsesUniversalPin());
            statement.setString(index++, command.kioskAccessUrl());
            statement.setString(index++, command.kioskPublicToken());
            statement.setString(index++, command.status().name());
            statement.setObject(index++, command.createdByUserId());
            statement.setString(index++, command.customFieldsJson());
            statement.setString(index, command.metadataJson());
            return statement;
        }, keyHolder);
        var fundId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findFundById(context, fundId).orElseThrow();
    }

    boolean updateFund(FinanceContext context, long fundId, PettyCashFundCommand command) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(PettyCashSql.UPDATE_FUND);
            var index = 1;
            statement.setObject(index++, command.unitId());
            statement.setObject(index++, command.businessId());
            statement.setObject(index++, command.budgetId());
            statement.setObject(index++, command.budgetLineId());
            statement.setObject(index++, command.paymentAccountId());
            statement.setObject(index++, command.fundingSourcePaymentAccountId());
            statement.setObject(index++, command.responsibleUserId());
            statement.setString(index++, command.fundType().name());
            statement.setString(index++, command.name());
            statement.setString(index++, command.currencyCode());
            statement.setBigDecimal(index++, command.limitAmount());
            statement.setInt(index++, command.cutOffDay());
            statement.setString(index++, command.fundingSourceName());
            statement.setString(index++, command.externalOwnerType());
            statement.setString(index++, command.externalOwnerName());
            statement.setString(index++, command.externalOwnerRelationship());
            statement.setString(index++, command.externalOwnerReference());
            statement.setString(index++, command.statementRecipientEmail());
            statement.setString(index++, command.managedAssetType());
            statement.setString(index++, command.managedAssetName());
            statement.setString(index++, command.managedAssetReference());
            statement.setBoolean(index++, command.externalIdentityPending());
            statement.setString(index++, command.fundingMethodsJson());
            statement.setString(index++, command.spendingMethodsJson());
            statement.setBoolean(index++, command.kioskEnabled());
            statement.setBoolean(index++, command.kioskUsesUniversalPin());
            statement.setString(index++, command.kioskAccessUrl());
            statement.setString(index++, command.kioskPublicToken());
            statement.setString(index++, command.status().name());
            statement.setObject(index++, command.updatedByUserId());
            statement.setString(index++, command.customFieldsJson());
            statement.setString(index++, command.metadataJson());
            statement.setLong(index++, context.companyId());
            statement.setLong(index, fundId);
            return statement;
        });
        return updated > 0;
    }

    boolean rotateKioskPublicToken(
            FinanceContext context,
            long fundId,
            String kioskPublicToken,
            String kioskAccessUrl) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_funds
            SET kiosk_public_token = ?,
                kiosk_access_url = ?,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            kioskPublicToken,
            kioskAccessUrl,
            context.userId(),
            context.companyId(),
            fundId
        );
        return updated > 0;
    }

    boolean updateKioskEnabled(FinanceContext context, long fundId, boolean enabled) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_funds
            SET kiosk_enabled = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """,
            enabled, context.userId(), context.companyId(), fundId
        );
        return updated > 0;
    }

    boolean clearKioskAccess(FinanceContext context, long fundId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_funds
            SET kiosk_enabled = 0,
                kiosk_public_token = NULL,
                kiosk_access_url = NULL,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """,
            context.userId(), context.companyId(), fundId
        );
        return updated > 0;
    }

    boolean softDeleteFund(FinanceContext context, long fundId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_funds
            SET deleted_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            context.userId(),
            context.companyId(),
            fundId
        );
        return updated > 0;
    }

    PettyCashStatementRecord insertStatement(
            FinanceContext context,
            PettyCashFundRecord fund,
            String folio,
            String periodKey,
            LocalDate periodStart,
            LocalDate periodEnd) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(PettyCashSql.INSERT_STATEMENT, Statement.RETURN_GENERATED_KEYS);
            var index = 1;
            statement.setLong(index++, context.companyId());
            statement.setLong(index++, fund.id());
            statement.setString(index++, fund.fundType().name());
            statement.setString(index++, folio);
            statement.setString(index++, periodKey);
            statement.setDate(index++, Date.valueOf(periodStart));
            statement.setDate(index++, Date.valueOf(periodEnd));
            statement.setDate(index++, Date.valueOf(periodEnd));
            statement.setBigDecimal(index++, fund.currentBalanceAmount());
            statement.setBigDecimal(index++, BigDecimal.ZERO);
            statement.setBigDecimal(index++, BigDecimal.ZERO);
            statement.setBigDecimal(index++, fund.currentBalanceAmount());
            statement.setBigDecimal(index++, BigDecimal.ZERO);
            statement.setBigDecimal(index++, BigDecimal.ZERO);
            statement.setBigDecimal(index++, BigDecimal.ZERO);
            statement.setBigDecimal(index++, BigDecimal.ZERO);
            statement.setBigDecimal(index++, BigDecimal.ZERO);
            statement.setString(index++, fund.currencyCode());
            statement.setString(index++, PettyCashStatementStatus.OPEN.name());
            statement.setObject(index++, fund.responsibleUserId());
            statement.setString(index++, fund.externalOwnerType());
            statement.setString(index++, fund.externalOwnerName());
            statement.setString(index++, fund.externalOwnerRelationship());
            statement.setString(index++, fund.externalOwnerReference());
            statement.setString(index++, fund.statementRecipientEmail());
            statement.setString(index++, fund.managedAssetType());
            statement.setString(index++, fund.managedAssetName());
            statement.setString(index++, fund.managedAssetReference());
            statement.setInt(index++, 0);
            statement.setObject(index++, context.userId());
            statement.setString(index++, null);
            statement.setString(index, null);
            return statement;
        }, keyHolder);
        var statementId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findStatementById(context, statementId).orElseThrow();
    }

    PettyCashMovementRecord insertMovement(
            FinanceContext context,
            long fundId,
            PettyCashMovementCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(PettyCashSql.INSERT_MOVEMENT, Statement.RETURN_GENERATED_KEYS);
            var index = 1;
            statement.setLong(index++, context.companyId());
            statement.setLong(index++, fundId);
            statement.setObject(index++, command.pettyCashStatementId());
            statement.setObject(index++, command.fromPaymentAccountId());
            statement.setObject(index++, command.toPaymentAccountId());
            statement.setString(index++, command.externalSourceName());
            statement.setString(index++, command.entryCategory());
            statement.setString(index++, command.counterpartyName());
            statement.setString(index++, command.statementDescription());
            statement.setString(index++, command.fundingMethod());
            statement.setString(index++, command.internalNote());
            statement.setString(index++, command.type().name());
            statement.setBigDecimal(index++, command.amount());
            statement.setString(index++, command.currencyCode());
            statement.setDate(index++, Date.valueOf(command.movementDate()));
            statement.setString(index++, command.reference());
            statement.setObject(index++, command.createdByUserId());
            statement.setString(index++, command.customFieldsJson());
            statement.setString(index, command.metadataJson());
            return statement;
        }, keyHolder);
        var movementId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findMovementById(context, movementId).orElseThrow();
    }

    void closeStatement(
            FinanceContext context,
            long statementId,
            PettyCashStatementStatus status,
            BigDecimal returnedDelta,
            BigDecimal carryForwardDelta,
            BigDecimal shortageDelta,
            BigDecimal declaredClosingBalanceAmount) {
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_statements
            SET returned_amount = returned_amount + ?,
                carry_forward_amount = carry_forward_amount + ?,
                shortage_amount = shortage_amount + ?,
                declared_closing_balance_amount = ?,
                status = ?,
                reviewed_by_user_id = ?,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            returnedDelta,
            carryForwardDelta,
            shortageDelta,
            declaredClosingBalanceAmount,
            status.name(),
            context.userId(),
            context.userId(),
            context.companyId(),
            statementId
        );
    }

    PettyCashSettlementLineRecord insertSettlementLine(
            FinanceContext context,
            long fundId,
            PettyCashSettlementLineCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(PettyCashSql.INSERT_SETTLEMENT_LINE, Statement.RETURN_GENERATED_KEYS);
            var index = 1;
            statement.setLong(index++, context.companyId());
            statement.setLong(index++, fundId);
            statement.setLong(index++, command.pettyCashStatementId());
            statement.setObject(index++, command.expenseId());
            statement.setObject(index++, command.providerId());
            statement.setObject(index++, command.accountingAccountId());
            statement.setString(index++, command.description());
            statement.setString(index++, command.receiptReference());
            statement.setBigDecimal(index++, command.subtotalAmount());
            statement.setBigDecimal(index++, command.taxAmount());
            statement.setBigDecimal(index++, command.totalAmount());
            statement.setString(index++, command.currencyCode());
            statement.setDate(index++, Date.valueOf(command.expenseDate()));
            statement.setInt(index++, command.attachmentCount());
            statement.setString(index++, command.status().name());
            statement.setObject(index++, command.createdByUserId());
            statement.setString(index++, command.customFieldsJson());
            statement.setString(index, command.metadataJson());
            return statement;
        }, keyHolder);
        var lineId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findSettlementLineById(context, lineId).orElseThrow();
    }

    boolean reverseSettlementLine(
            FinanceContext context,
            PettyCashSettlementLineRecord line,
            String cancellationReason) {
        return jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_settlement_lines
            SET status = 'REVERSED',
                cancelled_at = CURRENT_TIMESTAMP,
                cancellation_reason = ?,
                cancelled_by_user_id = ?,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND status <> 'REVERSED'
              AND deleted_at IS NULL
            """,
            cancellationReason,
            context.userId(),
            context.userId(),
            context.companyId(),
            line.id()
        ) > 0;
    }

    boolean rejectSettlementLine(FinanceContext context, long settlementLineId) {
        return jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_settlement_lines
            SET status = ?,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND expense_id IS NULL
              AND status IN (?, ?, ?)
              AND deleted_at IS NULL
            """,
            PettyCashSettlementLineStatus.REJECTED.name(),
            context.userId(),
            context.companyId(),
            settlementLineId,
            PettyCashSettlementLineStatus.DRAFT.name(),
            PettyCashSettlementLineStatus.RECEIPT_ATTACHED.name(),
            PettyCashSettlementLineStatus.VALIDATED.name()
        ) > 0;
    }

    boolean clearPendingSettlementLineExpenseLink(FinanceContext context, long settlementLineId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_settlement_lines
            SET expense_id = NULL,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND expense_id IS NOT NULL
              AND status IN (?, ?, ?)
              AND deleted_at IS NULL
            """,
            context.userId(),
            context.companyId(),
            settlementLineId,
            PettyCashSettlementLineStatus.DRAFT.name(),
            PettyCashSettlementLineStatus.RECEIPT_ATTACHED.name(),
            PettyCashSettlementLineStatus.VALIDATED.name()
        );
        if (updated > 0) {
            jdbcTemplate.update(
                """
                UPDATE finance_petty_cash_settlement_line_attachments
                SET expense_id = NULL
                WHERE company_id = ?
                  AND settlement_line_id = ?
                  AND deleted_at IS NULL
                """,
                context.companyId(),
                settlementLineId
            );
        }
        return updated > 0;
    }

    boolean reverseGeneratedExpense(
            FinanceContext context,
            Long expenseId,
            long settlementLineId,
            String cancellationReason) {
        if (expenseId == null) {
            return false;
        }
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_expenses
            SET status = 'CANCELLED',
                payment_status = 'UNPAID',
                paid_amount = 0,
                balance_amount = 0,
                audit_status = 'PETTY_CASH_REVERSED',
                metadata_json = JSON_SET(
                    COALESCE(metadata_json, JSON_OBJECT()),
                    '$.pettyCashReversal', JSON_OBJECT(
                        'reason', ?,
                        'settlementLineId', ?,
                        'reversedByUserId', ?,
                        'reversedAt', DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ')
                    )
                ),
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
              AND audit_status = 'PETTY_CASH'
            """,
            cancellationReason,
            settlementLineId,
            context.userId(),
            context.userId(),
            context.companyId(),
            expenseId
        );
        return updated > 0;
    }

    void revertSettlementLineFromStatement(FinanceContext context, PettyCashSettlementLineRecord line) {
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_statements
            SET estimated_usage_amount = GREATEST(0, estimated_usage_amount - ?),
                declared_closing_balance_amount = declared_closing_balance_amount + ?,
                status = CASE
                  WHEN GREATEST(0, estimated_usage_amount - ?) = 0 THEN 'OPEN'
                  WHEN verified_expense_amount >= GREATEST(0, estimated_usage_amount - ?) THEN 'SETTLED'
                  WHEN verified_expense_amount > 0 THEN 'PARTIALLY_SETTLED'
                  ELSE 'CUT_PENDING'
                END,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            line.totalAmount(),
            line.totalAmount(),
            line.totalAmount(),
            line.totalAmount(),
            context.userId(),
            context.companyId(),
            line.pettyCashStatementId()
        );
    }

    Long insertExpenseFromSettlementLine(
            FinanceContext context,
            PettyCashFundRecord fund,
            PettyCashStatementRecord statementRecord,
            PettyCashSettlementLineRecord line) {
        var folio = "PCX-" + statementRecord.periodKey().replace("-", "") + "-" + line.id();
        var customFields = new LinkedHashMap<String, Object>();
        customFields.put("source", "PETTY_CASH");
        customFields.put("pettyCashFundId", fund.id());
        customFields.put("pettyCashStatementId", statementRecord.id());
        customFields.put("pettyCashSettlementLineId", line.id());
        customFields.put("receiptReference", line.receiptReference());

        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("source", "petty_cash_settlement");
        metadata.put("generatedBy", "FinancePettyCashService");

        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var sql = """
                INSERT INTO finance_expenses
                (company_id, unit_id, business_id, folio, provider_id, budget_line_id, accounting_account_id,
                 payment_account_id, concept, description, expense_type, subtotal_amount, tax_amount, total_amount,
                 paid_amount, balance_amount, currency_code, expense_date, due_date, payment_date, close_date,
                 requested_by_user_id, approved_by_user_id, performed_by_user_id, status, payment_status,
                 audit_status, attachment_count, created_by_user_id, custom_fields_json, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
            var prepared = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            var index = 1;
            prepared.setLong(index++, context.companyId());
            prepared.setObject(index++, fund.unitId());
            prepared.setObject(index++, fund.businessId());
            prepared.setString(index++, folio);
            prepared.setObject(index++, line.providerId());
            prepared.setObject(index++, fund.budgetLineId());
            prepared.setObject(index++, line.accountingAccountId());
            prepared.setObject(index++, fund.paymentAccountId());
            prepared.setString(index++, line.description());
            prepared.setString(index++, line.description());
            prepared.setString(index++, ExpenseType.VARIABLE.name());
            prepared.setBigDecimal(index++, line.subtotalAmount());
            prepared.setBigDecimal(index++, line.taxAmount());
            prepared.setBigDecimal(index++, line.totalAmount());
            prepared.setBigDecimal(index++, line.totalAmount());
            prepared.setBigDecimal(index++, BigDecimal.ZERO);
            prepared.setString(index++, line.currencyCode());
            prepared.setDate(index++, Date.valueOf(line.expenseDate()));
            prepared.setDate(index++, Date.valueOf(line.expenseDate()));
            prepared.setDate(index++, Date.valueOf(line.expenseDate()));
            prepared.setDate(index++, Date.valueOf(line.expenseDate()));
            prepared.setObject(index++, fund.responsibleUserId());
            prepared.setObject(index++, context.userId());
            prepared.setObject(index++, fund.responsibleUserId());
            prepared.setString(index++, ExpenseStatus.PAID.name());
            prepared.setString(index++, PaymentStatus.PAID.name());
            prepared.setString(index++, "PETTY_CASH");
            prepared.setInt(index++, line.attachmentCount());
            prepared.setLong(index++, context.userId());
            prepared.setString(index++, FinanceJsonSupport.toJson(customFields));
            prepared.setString(index, FinanceJsonSupport.toJson(metadata));
            return prepared;
        }, keyHolder);
        return keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
    }

    void linkSettlementLineExpense(FinanceContext context, long lineId, Long expenseId) {
        if (expenseId == null) {
            return;
        }
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_settlement_lines
            SET expense_id = ?,
                status = ?,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            expenseId,
            PettyCashSettlementLineStatus.EXPENSE_CREATED.name(),
            context.userId(),
            context.companyId(),
            lineId
        );
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_settlement_line_attachments
            SET expense_id = ?
            WHERE company_id = ?
              AND settlement_line_id = ?
              AND deleted_at IS NULL
            """,
            expenseId,
            context.companyId(),
            lineId
        );
        jdbcTemplate.update(
            """
            INSERT INTO finance_expense_attachments
            (company_id, expense_id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id,
             custom_fields_json, metadata_json)
            SELECT attachment.company_id,
                   ?,
                   attachment.original_filename,
                   attachment.mime_type,
                   attachment.size_bytes,
                   attachment.object_key,
                   attachment.uploaded_by_user_id,
                   NULL,
                   JSON_OBJECT('source', 'PETTY_CASH', 'settlementLineId', attachment.settlement_line_id)
            FROM finance_petty_cash_settlement_line_attachments attachment
            WHERE attachment.company_id = ?
              AND attachment.settlement_line_id = ?
              AND attachment.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM finance_expense_attachments existing
                WHERE existing.company_id = attachment.company_id
                  AND existing.expense_id = ?
                  AND existing.object_key = attachment.object_key
                  AND existing.deleted_at IS NULL
              )
            """,
            expenseId,
            context.companyId(),
            lineId,
            expenseId
        );
    }

    void adjustFundBalance(FinanceContext context, long fundId, BigDecimal delta) {
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_funds
            SET current_balance_amount = current_balance_amount + ?,
                status = CASE
                  WHEN current_balance_amount + ? <= (limit_amount * 0.15) THEN 'LOW_BALANCE'
                  ELSE 'OPEN'
                END,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            delta,
            delta,
            context.userId(),
            context.companyId(),
            fundId
        );
    }

    void applyMovementToStatement(
            FinanceContext context,
            long statementId,
            PettyCashMovementType type,
            BigDecimal amount,
            BigDecimal balanceDelta) {
        var assignedDelta = type == PettyCashMovementType.INITIAL_FUNDING ? amount : BigDecimal.ZERO;
        var depositDelta = type == PettyCashMovementType.ADDITIONAL_DEPOSIT ? amount : BigDecimal.ZERO;
        var returnedDelta = type == PettyCashMovementType.RETURN_TO_SOURCE ? amount : BigDecimal.ZERO;
        var carryForwardDelta = type == PettyCashMovementType.CARRY_FORWARD ? amount : BigDecimal.ZERO;
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_statements
            SET assigned_amount = assigned_amount + ?,
                additional_deposit_amount = additional_deposit_amount + ?,
                returned_amount = returned_amount + ?,
                carry_forward_amount = carry_forward_amount + ?,
                declared_closing_balance_amount = declared_closing_balance_amount + ?,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            assignedDelta,
            depositDelta,
            returnedDelta,
            carryForwardDelta,
            balanceDelta,
            context.userId(),
            context.companyId(),
            statementId
        );
    }

    void applyMovementToBudgetLine(
            FinanceContext context,
            Long budgetLineId,
            PettyCashMovementType type,
            BigDecimal amount) {
        if (budgetLineId == null || amount == null || amount.signum() == 0) {
            return;
        }
        var issuedDelta = switch (type) {
            case INITIAL_FUNDING, ADDITIONAL_DEPOSIT, CARRY_FORWARD -> amount;
            case RETURN_TO_SOURCE -> amount.negate();
            case SHORTAGE_ADJUSTMENT, FORGIVEN_SHORTAGE, EMPLOYEE_CHARGE -> BigDecimal.ZERO;
        };
        if (issuedDelta.signum() == 0) {
            return;
        }
        adjustBudgetLinePettyCash(context, budgetLineId, issuedDelta, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    void applySettlementLineToStatement(
            FinanceContext context,
            long statementId,
            BigDecimal totalAmount,
            int attachmentCount) {
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_statements
            SET estimated_usage_amount = estimated_usage_amount + ?,
                declared_closing_balance_amount = declared_closing_balance_amount - ?,
                attachment_count = attachment_count + ?,
                status = CASE WHEN status = 'SETTLED' THEN 'PARTIALLY_SETTLED' ELSE 'CUT_PENDING' END,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            totalAmount,
            totalAmount,
            attachmentCount,
            context.userId(),
            context.companyId(),
            statementId
        );
    }

    void applySettlementLineExpenseToStatement(
            FinanceContext context,
            long statementId,
            BigDecimal totalAmount) {
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_statements
            SET verified_expense_amount = verified_expense_amount + ?,
                status = CASE
                  WHEN GREATEST(0, estimated_usage_amount - verified_expense_amount - returned_amount - shortage_amount) = 0
                    THEN 'SETTLED'
                  ELSE 'PARTIALLY_SETTLED'
                END,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            totalAmount,
            context.userId(),
            context.companyId(),
            statementId
        );
    }

    void revertSettlementLineExpenseFromStatement(
            FinanceContext context,
            long statementId,
            BigDecimal totalAmount) {
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_statements
            SET verified_expense_amount = GREATEST(0, verified_expense_amount - ?),
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            totalAmount,
            context.userId(),
            context.companyId(),
            statementId
        );
    }

    void applySettlementLineToBudgetLine(FinanceContext context, Long budgetLineId, BigDecimal totalAmount) {
        if (budgetLineId == null || totalAmount == null || totalAmount.signum() == 0) {
            return;
        }
        adjustBudgetLinePettyCash(context, budgetLineId, BigDecimal.ZERO, totalAmount, totalAmount);
    }

    void revertSettlementLineFromBudgetLine(FinanceContext context, Long budgetLineId, BigDecimal totalAmount) {
        if (budgetLineId == null || totalAmount == null || totalAmount.signum() == 0) {
            return;
        }
        adjustBudgetLinePettyCash(context, budgetLineId, BigDecimal.ZERO, totalAmount.negate(), totalAmount.negate());
    }

    boolean existsByName(FinanceContext context, String name, Long excludedFundId) {
        var sql = "SELECT COUNT(*) FROM finance_petty_cash_funds WHERE company_id = ? AND deleted_at IS NULL AND name = ?";
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(name);
        if (excludedFundId != null) {
            sql += " AND id <> ?";
            params.add(excludedFundId);
        }
        var count = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
    }

    boolean hasFinancialActivity(FinanceContext context, long fundId) {
        var count = jdbcTemplate.queryForObject(
            """
            SELECT (
              (SELECT COUNT(*) FROM finance_petty_cash_movements movement
               WHERE movement.company_id = ? AND movement.petty_cash_fund_id = ? AND movement.deleted_at IS NULL)
              +
              (SELECT COUNT(*) FROM finance_petty_cash_settlement_lines settlement_line
               WHERE settlement_line.company_id = ? AND settlement_line.petty_cash_fund_id = ? AND settlement_line.deleted_at IS NULL)
              +
              (SELECT COUNT(*) FROM finance_petty_cash_statements statement_record
               WHERE statement_record.company_id = ? AND statement_record.petty_cash_fund_id = ? AND statement_record.deleted_at IS NULL)
            )
            """,
            Long.class,
            context.companyId(), fundId,
            context.companyId(), fundId,
            context.companyId(), fundId
        );
        return count != null && count > 0;
    }

    boolean validateExternalSettlementLine(FinanceContext context, long lineId) {
        return jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_settlement_lines
            SET status = 'VALIDATED',
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND expense_id IS NULL
              AND status = 'RECEIPT_ATTACHED'
              AND deleted_at IS NULL
            """,
            context.userId(), context.companyId(), lineId
        ) > 0;
    }

    boolean kioskPublicTokenExists(String kioskPublicToken, Long excludedFundId) {
        var sql = "SELECT COUNT(*) FROM finance_petty_cash_funds WHERE kiosk_public_token = ?";
        var params = new ArrayList<Object>();
        params.add(kioskPublicToken);
        if (excludedFundId != null) {
            sql += " AND id <> ?";
            params.add(excludedFundId);
        }
        var count = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
    }

    private Optional<PettyCashMovementRecord> findMovementById(FinanceContext context, long movementId) {
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.MOVEMENT_COLUMNS + """
            FROM finance_petty_cash_movements movement
            JOIN finance_petty_cash_funds fund ON fund.id = movement.petty_cash_fund_id
            WHERE movement.company_id = ?
              AND movement.id = ?
              AND movement.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            """,
            mapper::mapMovement,
            scopedParams(context, movementId).toArray()
        );
        return rows.stream().findFirst();
    }

    Optional<PettyCashSettlementLineRecord> findSettlementLineById(FinanceContext context, long lineId) {
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.SETTLEMENT_LINE_COLUMNS + """
            FROM finance_petty_cash_settlement_lines settlement_line
            JOIN finance_petty_cash_funds fund ON fund.id = settlement_line.petty_cash_fund_id
            WHERE settlement_line.company_id = ?
              AND settlement_line.id = ?
              AND settlement_line.deleted_at IS NULL
              AND fund.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("fund", context.scope()) + """
            """,
            mapper::mapSettlementLine,
            scopedParams(context, lineId).toArray()
        );
        return rows.stream().findFirst();
    }

    private void adjustBudgetLinePettyCash(
            FinanceContext context,
            long budgetLineId,
            BigDecimal issuedDelta,
            BigDecimal settledDelta,
            BigDecimal actualDelta) {
        var availableExpression = """
            (planned_amount
              - committed_amount
              - actual_expense_amount)
            """;
        jdbcTemplate.update(
            """
            UPDATE finance_budget_lines
            SET actual_expense_amount = GREATEST(0, actual_expense_amount + ?),
                petty_cash_issued_amount = GREATEST(0, petty_cash_issued_amount + ?),
                petty_cash_settled_amount = GREATEST(0, petty_cash_settled_amount + ?),
                available_amount = """ + availableExpression + """
                ,
                health_status = CASE
                  WHEN """ + availableExpression + """
                       < 0 THEN 'EXCEEDED'
                  WHEN """ + availableExpression + """
                       > (planned_amount * 0.20) THEN 'ON_TRACK'
                  ELSE 'WARNING'
                END,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            actualDelta,
            issuedDelta,
            settledDelta,
            context.userId(),
            context.companyId(),
            budgetLineId
        );
    }

    private ArrayList<Object> scopedParams(FinanceContext context, Object... afterCompany) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        for (var value : afterCompany) {
            params.add(value);
        }
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
}
