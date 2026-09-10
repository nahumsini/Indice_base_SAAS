package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.dto.BudgetLineBulkActionRequest;
import com.indice.erp.finance.budgetlines.dto.BudgetLineBulkActionRequest.Action;
import com.indice.erp.finance.budgetlines.dto.BudgetLineListResponse;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.BudgetStatus;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Budget-owned classification: amounts, dates and linked execution evidence remain intact. */
@Service
public class BudgetLineBulkActionService {
    private final BudgetLineRepository repository;
    private final BudgetLineMapper mapper;
    private final JdbcTemplate jdbc;

    public BudgetLineBulkActionService(BudgetLineRepository repository, BudgetLineMapper mapper, JdbcTemplate jdbc) {
        this.repository = repository;
        this.mapper = mapper;
        this.jdbc = jdbc;
    }

    @Transactional
    public BudgetLineListResponse apply(FinanceContext context, BudgetLineBulkActionRequest request) {
        if (request == null || request.action() == null || request.rows() == null || request.rows().isEmpty() || request.rows().size() > 200)
            throw FinanceApiException.badRequest("Select between 1 and 200 budget lines.");
        var ids = new HashSet<Long>();
        for (var row : request.rows()) {
            if (row == null || row.id() <= 0 || row.expectedVersion() == null || row.expectedVersion() < 0 || !ids.add(row.id()))
                throw FinanceApiException.badRequest("Invalid or duplicate budget line selection.");
        }
        if (request.reason() != null && request.reason().length() > 500)
            throw FinanceApiException.badRequest("Reason must be at most 500 characters.");
        if (request.targetId() != null && request.targetId() <= 0)
            throw FinanceApiException.badRequest("Invalid target reference.");
        jdbc.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, context.companyId());
        var records = new ArrayList<BudgetLineRecord>();
        for (var selected : request.rows().stream().sorted(Comparator.comparingLong(BudgetLineBulkActionRequest.Selection::id)).toList()) {
            var record = repository.findByIdForUpdate(context, selected.id())
                .orElseThrow(() -> FinanceApiException.notFound("Budget line not found."));
            if (!Objects.equals(selected.expectedVersion(), record.version()))
                throw FinanceApiException.conflict("A budget line changed. Reload the selection before retrying.");
            if (record.status() == BudgetStatus.CLOSED || record.status() == BudgetStatus.ARCHIVED)
                throw FinanceApiException.conflict("Closed or archived budget lines cannot be changed in bulk.");
            validateTarget(context, record, request);
            records.add(record);
        }
        // All rows and references are checked before writing any classification or audit record.
        String label = targetLabel(context, request);
        for (var record : records) update(context, record, request, label);
        var updated = request.action() == Action.DELETE ? List.<com.indice.erp.finance.budgetlines.dto.BudgetLineResponse>of()
            : records.stream().map(record -> mapper.toResponse(repository.findById(context, record.id()).orElseThrow())).toList();
        return new BudgetLineListResponse(updated, updated.size());
    }

    private void validateTarget(FinanceContext context, BudgetLineRecord record, BudgetLineBulkActionRequest request) {
        Long id = request.targetId();
        switch (request.action()) {
            case DELETE -> {
                if (request.reason() == null || request.reason().trim().length() < 8)
                    throw FinanceApiException.badRequest("A reason of at least 8 characters is required to delete budget lines.");
                requireNoExecution(context, record);
            }
            case UNIT -> {
                if (!context.scope().isCorporateOffice())
                    throw FinanceApiException.conflict("Changing unit requires company-wide access.");
                requireNoExecution(context, record);
                if (id != null && count("SELECT COUNT(*) FROM units WHERE company_id = ? AND id = ?", context.companyId(), id) == 0)
                    throw FinanceApiException.badRequest("Select a unit from this company.");
            }
            case BUSINESS -> {
                requireNoExecution(context, record);
                if (context.scope().type() == FinanceScope.Type.BUSINESS_OFFICE && !Objects.equals(id, context.scope().businessId()))
                    throw FinanceApiException.conflict("The business is outside your operating scope.");
                if (id != null && count("SELECT COUNT(*) FROM businesses WHERE company_id = ? AND id = ? AND unit_id <=> ?", context.companyId(), id, record.unitId()) == 0)
                    throw FinanceApiException.badRequest("The business must belong to the unit of every selected budget line.");
            }
            case PROVIDER -> {
                if (id != null && count("SELECT COUNT(*) FROM finance_providers WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'ACTIVE'", context.companyId(), id) == 0)
                    throw FinanceApiException.badRequest("Select an active provider from this company.");
            }
            case ACCOUNTING_ACCOUNT -> {
                if (id != null && count("SELECT COUNT(*) FROM finance_accounting_accounts WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'ACTIVE'", context.companyId(), id) == 0)
                    throw FinanceApiException.badRequest("Select an active accounting account from this company.");
            }
        }
    }

    private void requireNoExecution(FinanceContext context, BudgetLineRecord record) {
        if (record.committedAmount().signum() != 0 || record.actualExpenseAmount().signum() != 0
                || record.pettyCashIssuedAmount().signum() != 0 || record.pettyCashSettledAmount().signum() != 0
                || count("SELECT COUNT(*) FROM finance_expenses WHERE company_id = ? AND budget_line_id = ?", context.companyId(), record.id()) > 0
                || count("SELECT COUNT(*) FROM finance_petty_cash_funds WHERE company_id = ? AND budget_line_id = ?", context.companyId(), record.id()) > 0)
            throw FinanceApiException.conflict("Budget lines with execution or linked funds cannot be deleted or moved to another unit or business.");
    }

    private String targetLabel(FinanceContext context, BudgetLineBulkActionRequest request) {
        if (request.targetId() == null) return null;
        return switch (request.action()) {
            case PROVIDER -> jdbc.queryForObject("SELECT name FROM finance_providers WHERE company_id = ? AND id = ?", String.class, context.companyId(), request.targetId());
            case ACCOUNTING_ACCOUNT -> jdbc.queryForObject("SELECT CONCAT(code, ' - ', name) FROM finance_accounting_accounts WHERE company_id = ? AND id = ?", String.class, context.companyId(), request.targetId());
            default -> null;
        };
    }

    private void update(FinanceContext context, BudgetLineRecord record, BudgetLineBulkActionRequest request, String label) {
        var params = new ArrayList<Object>();
        String assignment;
        switch (request.action()) {
            case DELETE -> assignment = "deleted_at = CURRENT_TIMESTAMP(6)";
            case UNIT -> { assignment = "unit_id = ?, business_id = NULL"; params.add(request.targetId()); }
            case BUSINESS -> { assignment = "business_id = ?"; params.add(request.targetId()); }
            case PROVIDER -> {
                assignment = "custom_fields_json = JSON_SET(COALESCE(custom_fields_json, JSON_OBJECT()), '$.providerId', ?, '$.providerName', ?)";
                params.add(request.targetId() == null ? null : request.targetId().toString()); params.add(label);
            }
            case ACCOUNTING_ACCOUNT -> {
                assignment = "custom_fields_json = JSON_SET(COALESCE(custom_fields_json, JSON_OBJECT()), '$.accountingAccount', ?)";
                params.add(label);
            }
            default -> throw new IllegalArgumentException("Unsupported budget action");
        }
        // Record the original classification before the allow-listed assignment below.
        jdbc.update("""
            UPDATE finance_budget_lines SET metadata_json = JSON_SET(COALESCE(metadata_json, JSON_OBJECT()), '$.bulkAdjustments',
                JSON_ARRAY_APPEND(COALESCE(JSON_EXTRACT(metadata_json, '$.bulkAdjustments'), JSON_ARRAY()), '$',
                    JSON_OBJECT('action', ?, 'targetId', ?, 'reason', ?, 'userId', ?, 'changedAt', UTC_TIMESTAMP(6),
                        'previousUnitId', unit_id, 'previousBusinessId', business_id,
                        'previousProviderId', JSON_EXTRACT(custom_fields_json, '$.providerId'),
                        'previousAccountingAccount', JSON_EXTRACT(custom_fields_json, '$.accountingAccount'))))
            WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
            """, request.action().name(), request.targetId(), request.reason(), context.userId(), context.companyId(), record.id(), record.version());
        params.add(context.userId()); params.add(context.companyId()); params.add(record.id()); params.add(record.version());
        int updated = jdbc.update("UPDATE finance_budget_lines SET " + assignment + """
            , updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP(6), version = version + 1
            WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
            """, params.toArray());
        if (updated != 1) throw FinanceApiException.conflict("A budget line changed. Reload the selection before retrying.");
    }

    private long count(String sql, Object... parameters) { return jdbc.queryForObject(sql, Long.class, parameters); }
}
