package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.ExpenseBulkActionRequest;
import com.indice.erp.finance.expenses.dto.ExpenseBulkActionRequest.Action;
import com.indice.erp.finance.expenses.dto.ExpenseListResponse;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.ExpenseStatus;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicit classification adjustments; never rewrites payment history or monetary amounts. */
@Service
public class ExpenseBulkActionService {
    private final ExpenseRepository repository;
    private final ExpenseMapper mapper;
    private final ExpenseReferenceValidator references;
    private final ExpenseDeletionService deletions;
    private final JdbcTemplate jdbc;

    public ExpenseBulkActionService(ExpenseRepository repository, ExpenseMapper mapper,
            ExpenseReferenceValidator references, ExpenseDeletionService deletions, JdbcTemplate jdbc) {
        this.repository = repository;
        this.mapper = mapper;
        this.references = references;
        this.deletions = deletions;
        this.jdbc = jdbc;
    }

    @Transactional
    public ExpenseListResponse apply(FinanceContext context, ExpenseBulkActionRequest request) {
        if (request.action() == null || request.rows() == null || request.rows().isEmpty() || request.rows().size() > 200)
            throw FinanceApiException.badRequest("Select between 1 and 200 expenses.");
        repository.lockCompanyForCreation(context);
        var records = new ArrayList<ExpenseRecord>();
        var ids = new HashSet<Long>();
        for (var row : request.rows()) {
            if (row == null || !ids.add(row.id())) throw FinanceApiException.badRequest("Duplicate expense selection.");
            var record = repository.findByIdForUpdate(context, row.id())
                .orElseThrow(() -> FinanceApiException.notFound("Expense not found."));
            if (!Objects.equals(row.expectedVersion(), record.version()))
                throw FinanceApiException.conflict("An expense changed. Reload the selection before retrying.");
            if (request.action() == Action.DELETE) {
                validateTarget(context, record, request);
                deletions.validate(context, record);
                records.add(record);
                continue;
            }
            if (record.originFund() != null || "PETTY_CASH".equals(record.auditStatus()))
                throw FinanceApiException.conflict("Fund expenses must be changed from Petty Cash.");
            if (record.accountingPosted() || record.purchaseOrderId() != null || record.budgetLineId() != null)
                throw FinanceApiException.conflict("Linked or posted expenses require an adjustment from their source workflow.");
            if (record.status() == ExpenseStatus.CANCELLED || record.status() == ExpenseStatus.REJECTED || record.status() == ExpenseStatus.CLOSED)
                throw FinanceApiException.conflict("Cancelled, rejected or closed expenses cannot be changed in bulk.");
            validateTarget(context, record, request);
            records.add(record);
        }
        // Validate the entire selection before any mutation. A stale row rolls back the entire batch.
        for (var record : records) {
            audit(context, record, request);
            if (request.action() == Action.DELETE) deletions.delete(context, record, request.reason().trim());
            else update(context, record, request);
        }
        return new ExpenseListResponse(request.action() == Action.DELETE ? java.util.List.of()
            : records.stream().map(record -> mapper.toResponse(repository.findById(context, record.id()).orElseThrow())).toList(),
            request.action() == Action.DELETE ? 0 : records.size());
    }

    private void validateTarget(FinanceContext context, ExpenseRecord record, ExpenseBulkActionRequest request) {
        var id = request.targetId();
        switch (request.action()) {
            case DELETE -> {
                if (request.reason() == null || request.reason().isBlank())
                    throw FinanceApiException.badRequest("A reason is required to delete expenses.");
            }
            case ACCOUNTING_ACCOUNT -> references.validateImportAccountingAccount(context, id);
            case PAYMENT_ACCOUNT -> {
                references.validateImportPaymentAccount(context, id, record.currencyCode());
                if (id != null && count("SELECT COUNT(*) FROM finance_petty_cash_funds WHERE company_id = ? AND payment_account_id = ? AND deleted_at IS NULL", context.companyId(), id) > 0)
                    throw FinanceApiException.badRequest("A fund custody account cannot be selected for an ordinary expense.");
                if (record.balanceAmount().signum() <= 0)
                    throw FinanceApiException.conflict("A fully paid expense has no future payment account to change.");
            }
            case PROVIDER -> {
                if (id != null && count("SELECT COUNT(*) FROM finance_providers WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'ACTIVE'", context.companyId(), id) == 0)
                    throw FinanceApiException.badRequest("Select an active provider from this company.");
            }
            case UNIT -> {
                if (id != null && count("SELECT COUNT(*) FROM units WHERE company_id = ? AND id = ?", context.companyId(), id) == 0)
                    throw FinanceApiException.badRequest("Select a unit from this company.");
                if (!context.scope().isCorporateOffice())
                    throw FinanceApiException.conflict("Changing unit requires company-wide access.");
            }
            case BUSINESS -> {
                if (id != null && count("SELECT COUNT(*) FROM businesses WHERE company_id = ? AND id = ? AND unit_id <=> ?", context.companyId(), id, record.unitId()) == 0)
                    throw FinanceApiException.badRequest("The business must belong to the unit of every selected expense.");
                if (context.scope().type() == FinanceScope.Type.BUSINESS_OFFICE && !Objects.equals(id, context.scope().businessId()))
                    throw FinanceApiException.conflict("The business is outside your operating scope.");
            }
        }
    }

    private long count(String sql, Object... params) { return jdbc.queryForObject(sql, Long.class, params); }

    private void audit(FinanceContext context, ExpenseRecord record, ExpenseBulkActionRequest request) {
        jdbc.update("""
            UPDATE finance_expenses SET metadata_json = JSON_SET(COALESCE(metadata_json, JSON_OBJECT()), '$.bulkAdjustments',
                JSON_ARRAY_APPEND(COALESCE(JSON_EXTRACT(metadata_json, '$.bulkAdjustments'), JSON_ARRAY()), '$',
                    JSON_OBJECT('action', ?, 'targetId', ?, 'reason', ?, 'userId', ?, 'changedAt', UTC_TIMESTAMP(6),
                        'previousUnitId', unit_id, 'previousBusinessId', business_id, 'previousProviderId', provider_id,
                        'previousPaymentAccountId', payment_account_id, 'previousAccountingAccountId', accounting_account_id)))
            WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
            """, request.action().name(), request.targetId(), request.reason(), context.userId(), context.companyId(), record.id(), record.version());
    }

    private void update(FinanceContext context, ExpenseRecord record, ExpenseBulkActionRequest request) {
        // SQL identifiers are exclusively selected from this server-owned enum.
        var assignment = switch (request.action()) {
            case UNIT -> "unit_id = ?, business_id = NULL";
            case BUSINESS -> "business_id = ?";
            case PROVIDER -> "provider_id = ?";
            case PAYMENT_ACCOUNT -> "payment_account_id = ?";
            case ACCOUNTING_ACCOUNT -> "accounting_account_id = ?";
            default -> throw new IllegalArgumentException("Unsupported adjustment");
        };
        var customFields = switch (request.action()) {
            case PROVIDER -> "JSON_REMOVE(COALESCE(custom_fields_json, JSON_OBJECT()), '$.providerId', '$.providerName')";
            case PAYMENT_ACCOUNT -> "JSON_REMOVE(COALESCE(custom_fields_json, JSON_OBJECT()), '$.paymentAccountId')";
            case ACCOUNTING_ACCOUNT -> "JSON_REMOVE(COALESCE(custom_fields_json, JSON_OBJECT()), '$.accountingAccount')";
            default -> "custom_fields_json";
        };
        int updated = jdbc.update("UPDATE finance_expenses SET " + assignment + ", custom_fields_json = " + customFields + """
            , updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
            """, request.targetId(), context.userId(), context.companyId(), record.id(), record.version());
        if (updated != 1) throw FinanceApiException.conflict("An expense changed. Reload the selection before retrying.");
    }
}
