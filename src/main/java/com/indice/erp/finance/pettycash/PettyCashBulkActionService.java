package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.PettyCashBulkActionRequest;
import com.indice.erp.finance.pettycash.dto.PettyCashBulkActionResponse;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PettyCashBulkActionService {
    private final PettyCashRepository repository;
    private final PettyCashMapper mapper;
    private final PettyCashService service;
    private final JdbcTemplate jdbc;

    public PettyCashBulkActionService(PettyCashRepository repository, PettyCashMapper mapper,
            PettyCashService service, JdbcTemplate jdbc) {
        this.repository = repository;
        this.mapper = mapper;
        this.service = service;
        this.jdbc = jdbc;
    }

    @Transactional
    public PettyCashBulkActionResponse apply(FinanceContext context, long fundId, PettyCashBulkActionRequest request) {
        if (request.action() == null || request.rows() == null || request.rows().isEmpty() || request.rows().size() > 200)
            throw FinanceApiException.badRequest("Select between 1 and 200 receipts.");
        // Same serialization boundary as journal synchronization, followed by fund, cut and receipts.
        jdbc.queryForList("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, context.companyId());
        repository.lockFund(context, fundId);
        var fund = repository.findFundById(context, fundId).orElseThrow(() -> FinanceApiException.notFound("Fund not found."));
        var statement = repository.findStatementByIdForUpdate(context, request.statementId())
            .orElseThrow(() -> FinanceApiException.notFound("Statement not found."));
        if (!Objects.equals(statement.pettyCashFundId(), fundId)) throw FinanceApiException.badRequest("Statement does not belong to this fund.");
        if (java.util.Set.of(PettyCashStatementStatus.CLOSED, PettyCashStatementStatus.FORGIVEN_SHORTAGE,
                PettyCashStatementStatus.CHARGED_TO_EMPLOYEE, PettyCashStatementStatus.TRANSFERRED_TO_NEXT_CUT).contains(statement.status()))
            throw FinanceApiException.conflict("This cut is closed. Its receipts cannot be changed.");
        String targetName = validateTarget(context, request);
        var ids = new HashSet<Long>();
        var lines = new ArrayList<PettyCashSettlementLineRecord>();
        for (var row : request.rows()) {
            if (row == null || !ids.add(row.id())) throw FinanceApiException.badRequest("Duplicate receipt selection.");
            jdbc.queryForList("SELECT id FROM finance_petty_cash_settlement_lines WHERE company_id = ? AND id = ? FOR UPDATE", Long.class, context.companyId(), row.id());
            var line = repository.findSettlementLineById(context, row.id()).orElseThrow(() -> FinanceApiException.notFound("Receipt not found."));
            if (!Objects.equals(line.pettyCashFundId(), fundId) || !Objects.equals(line.pettyCashStatementId(), request.statementId()))
                throw FinanceApiException.badRequest("Every receipt must belong to the selected fund and cut.");
            if (!Objects.equals(line.version(), row.expectedVersion()))
                throw FinanceApiException.conflict("A receipt changed. Reload the selection before retrying.");
            if (line.status() == PettyCashSettlementLineStatus.REVERSED || line.status() == PettyCashSettlementLineStatus.REJECTED)
                throw FinanceApiException.conflict("Rejected or reversed receipts cannot be changed in bulk.");
            if (line.expenseId() != null) {
                var sources = jdbc.queryForList("SELECT id FROM finance_expenses WHERE company_id = ? AND id = ? AND audit_status = 'PETTY_CASH' AND deleted_at IS NULL FOR UPDATE", Long.class, context.companyId(), line.expenseId());
                if (sources.isEmpty()) throw FinanceApiException.conflict("The linked expense must be reconciled before changing this receipt.");
                var posted = jdbc.queryForObject("SELECT COUNT(*) FROM finance_journal_entries WHERE company_id = ? AND source_type = 'EXPENSE' AND source_id = ? AND status = 'POSTED'", Long.class, context.companyId(), String.valueOf(line.expenseId()));
                if (posted != null && posted > 0) throw FinanceApiException.conflict("This expense has a posted journal entry. Use an accounting adjustment to preserve the ledger.");
            }
            if (request.action() == PettyCashBulkActionRequest.Action.ACCOUNTING_ACCOUNT && request.targetId() == null
                    && line.status() == PettyCashSettlementLineStatus.EXPENSE_CREATED)
                throw FinanceApiException.badRequest("An authorized internal expense requires an accounting account.");
            lines.add(line);
        }
        // Reversing an older open cut must also correct later openings without touching closed cuts.
        var following = request.action() == PettyCashBulkActionRequest.Action.DELETE
            ? repository.reconcileFollowingStatementOpening(context, fundId, statement.periodKey(),
                statement.declaredClosingBalanceAmount().add(lines.stream().map(PettyCashSettlementLineRecord::totalAmount)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add)))
            : java.util.List.<PettyCashStatementRecord>of();
        for (var line : lines) {
            if (request.action() == PettyCashBulkActionRequest.Action.DELETE) {
                service.deleteSettlementLine(context, fundId, line.id(), request.reason());
            } else {
                update(context, "finance_petty_cash_settlement_lines", line.id(), request, targetName);
                if (line.expenseId() != null) update(context, "finance_expenses", line.expenseId(), request, targetName);
            }
        }
        return new PettyCashBulkActionResponse(mapper.toResponse(repository.findFundById(context, fund.id()).orElseThrow()),
            mapper.toResponse(repository.findStatementById(context, statement.id()).orElseThrow()),
            lines.stream().map(line -> mapper.toResponse(repository.findSettlementLineById(context, line.id()).orElseThrow())).toList(),
            following.stream().map(mapper::toResponse).toList());
    }

    private String validateTarget(FinanceContext context, PettyCashBulkActionRequest request) {
        if (request.action() == PettyCashBulkActionRequest.Action.DELETE) {
            if (request.reason() == null || request.reason().isBlank()) throw FinanceApiException.badRequest("A reason is required to reverse receipts.");
            return null;
        }
        if (request.targetId() == null) return null;
        var table = request.action() == PettyCashBulkActionRequest.Action.PROVIDER ? "finance_providers" : "finance_accounting_accounts";
        var labels = jdbc.queryForList("SELECT name FROM " + table + " WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'ACTIVE'", String.class, context.companyId(), request.targetId());
        if (labels.isEmpty()) throw FinanceApiException.badRequest("Select an active reference from this company.");
        return labels.getFirst();
    }

    private void update(FinanceContext context, String table, long id, PettyCashBulkActionRequest request, String targetName) {
        boolean provider = request.action() == PettyCashBulkActionRequest.Action.PROVIDER;
        var column = provider ? "provider_id" : "accounting_account_id";
        var nameKey = provider ? "$.providerName" : "$.accountingAccountName";
        var idKey = provider ? "$.providerId" : "$.accountingAccount";
        int updated = jdbc.update("UPDATE " + table + " SET metadata_json = JSON_SET(COALESCE(metadata_json, JSON_OBJECT()), '$.bulkAdjustments',"
            + " JSON_ARRAY_APPEND(COALESCE(JSON_EXTRACT(metadata_json, '$.bulkAdjustments'), JSON_ARRAY()), '$',"
            + " JSON_OBJECT('action', ?, 'previousId', " + column + ", 'targetId', ?, 'userId', ?, 'changedAt', UTC_TIMESTAMP(6)))),"
            + column + " = ?, custom_fields_json = JSON_SET(COALESCE(custom_fields_json, JSON_OBJECT()), ?, ?, ?, ?),"
            + " updated_by_user_id = ?, version = version + 1 WHERE company_id = ? AND id = ? AND deleted_at IS NULL",
            request.action().name(), request.targetId(), context.userId(), request.targetId(), nameKey, targetName, idKey, request.targetId(),
            context.userId(), context.companyId(), id);
        if (updated != 1) throw FinanceApiException.conflict("A receipt changed. Reload the selection before retrying.");
    }
}
