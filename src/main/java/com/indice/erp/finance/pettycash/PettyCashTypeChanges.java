package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.ChangePettyCashFundTypeRequest;
import com.indice.erp.finance.pettycash.dto.PettyCashTypeChangeResponse;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

/** Prospective configuration changes. A type change never posts money or rewrites receipts. */
@Service
class PettyCashTypeChanges {
    private final JdbcTemplate jdbc;
    private final PettyCashRepository repository;
    private final PettyCashMapper mapper;
    private final PettyCashValidator validator;
    private final PettyCashFundSnapshots snapshots;
    private final FinanceBusinessTimeZoneResolver zones;

    PettyCashTypeChanges(JdbcTemplate jdbc, PettyCashRepository repository, PettyCashMapper mapper,
            PettyCashValidator validator, PettyCashFundSnapshots snapshots, FinanceBusinessTimeZoneResolver zones) {
        this.jdbc = jdbc; this.repository = repository; this.mapper = mapper; this.validator = validator;
        this.snapshots = snapshots; this.zones = zones;
    }

    @Transactional(readOnly = true)
    public List<PettyCashTypeChangeResponse> history(FinanceContext context, long fundId) {
        requireFund(context, fundId);
        return jdbc.query("SELECT * FROM finance_petty_cash_type_changes WHERE company_id = ? AND petty_cash_fund_id = ? ORDER BY id DESC",
            (rs, row) -> new PettyCashTypeChangeResponse(rs.getLong("id"), PettyCashFundType.valueOf(rs.getString("previous_type")),
                PettyCashFundType.valueOf(rs.getString("next_type")), rs.getObject("effective_date", LocalDate.class),
                rs.getString("reason"), rs.getString("status"), rs.getObject("created_by_user_id", Long.class),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("applied_at") == null ? null : rs.getTimestamp("applied_at").toInstant(),
                rs.getObject("cancelled_by_user_id", Long.class),
                rs.getTimestamp("cancelled_at") == null ? null : rs.getTimestamp("cancelled_at").toInstant()),
            context.companyId(), fundId);
    }

    @Transactional
    public List<PettyCashTypeChangeResponse> schedule(FinanceContext context, long fundId, ChangePettyCashFundTypeRequest request) {
        repository.lockFund(context, fundId);
        var existing = requireFund(context, fundId);
        if (request.expectedVersion() == null || !request.expectedVersion().equals(existing.version())) {
            throw FinanceApiException.conflict("The fund changed. Refresh and review the type change.");
        }
        requireNoPendingChange(context, fundId);
        if (existing.status() == PettyCashFundStatus.CLOSED) throw FinanceApiException.conflict("A closed fund cannot change type.");
        var configuration = request.configuration();
        if (configuration == null || configuration.fundType() == null || configuration.fundType() == existing.fundType()) {
            throw FinanceApiException.badRequest("Choose a different fund type.");
        }
        if (!existing.currencyCode().equalsIgnoreCase(configuration.currencyCode())) {
            throw FinanceApiException.badRequest("Changing fund type preserves its currency.");
        }
        if (!java.util.Objects.equals(existing.paymentAccountId(), configuration.paymentAccountId())) {
            throw FinanceApiException.badRequest("Changing fund type preserves its custody account.");
        }
        var reason = request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 8 || reason.length() > 500) throw FinanceApiException.badRequest("A reason between 8 and 500 characters is required.");
        var today = LocalDate.now(zones.resolve(context.companyId()));
        var earliest = repository.hasFinancialActivity(context, fundId) ? today.plusDays(1) : today;
        if (request.effectiveDate() == null || request.effectiveDate().isBefore(earliest)) {
            throw FinanceApiException.badRequest("The type change must start on or after " + earliest + ".");
        }
        var futureActivity = jdbc.queryForObject("""
            SELECT (SELECT COUNT(*) FROM finance_petty_cash_movements WHERE company_id = ? AND petty_cash_fund_id = ? AND movement_date >= ? AND deleted_at IS NULL)
              + (SELECT COUNT(*) FROM finance_petty_cash_settlement_lines WHERE company_id = ? AND petty_cash_fund_id = ? AND expense_date >= ? AND deleted_at IS NULL)
              + (SELECT COUNT(*) FROM finance_petty_cash_statements WHERE company_id = ? AND petty_cash_fund_id = ? AND period_end >= ? AND status IN ('CLOSED','TRANSFERRED_TO_NEXT_CUT','FORGIVEN_SHORTAGE','CHARGED_TO_EMPLOYEE') AND deleted_at IS NULL)
            """, Long.class, context.companyId(), fundId, request.effectiveDate(), context.companyId(), fundId, request.effectiveDate(), context.companyId(), fundId, request.effectiveDate());
        if (futureActivity > 0) throw FinanceApiException.conflict("There is already activity or a closed statement on or after the chosen date.");
        if (pendingReceipts(context, fundId) > 0) {
            throw FinanceApiException.conflict("Resolve the fund's pending receipts before scheduling its type change.");
        }
        var assignment = validator.validateUpdate(context, configuration, existing);
        // Only financial/owner context changes here; operational identity and kiosk configuration stay live.
        var command = mapper.toUpdateCommand(context, configuration, assignment, existing, existing.kioskPublicToken());
        jdbc.update("""
            INSERT INTO finance_petty_cash_type_changes (company_id, petty_cash_fund_id, previous_type, next_type,
              effective_date, reason, configuration_json, previous_configuration_json, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, context.companyId(), fundId, existing.fundType().name(), command.fundType().name(), request.effectiveDate(),
            reason, snapshots.write(command), snapshots.write(existing), context.userId());
        jdbc.update("UPDATE finance_petty_cash_funds SET version = version + 1 WHERE company_id = ? AND id = ?", context.companyId(), fundId);
        activateDue(context, fundId);
        return history(context, fundId);
    }

    void requireNoPendingChange(FinanceContext context, long fundId) {
        if (jdbc.queryForObject("SELECT COUNT(*) FROM finance_petty_cash_type_changes WHERE company_id = ? AND petty_cash_fund_id = ? AND status = 'SCHEDULED'",
                Long.class, context.companyId(), fundId) > 0) {
            throw FinanceApiException.conflict("This fund has a scheduled type change. Cancel it before editing the configuration.");
        }
    }

    void requireDateAvailable(FinanceContext context, long fundId, LocalDate date) {
        if (date != null && jdbc.queryForObject("SELECT COUNT(*) FROM finance_petty_cash_type_changes WHERE company_id = ? AND petty_cash_fund_id = ? AND status = 'SCHEDULED' AND effective_date <= ?",
                Long.class, context.companyId(), fundId, date) > 0) {
            throw FinanceApiException.conflict("A type change is scheduled for that date. Register the operation when the new stage starts.");
        }
    }

    @Transactional
    public List<PettyCashTypeChangeResponse> cancel(FinanceContext context, long fundId, long changeId) {
        repository.lockFund(context, fundId); requireFund(context, fundId); activateDue(context, fundId);
        if (jdbc.update("UPDATE finance_petty_cash_type_changes SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP(6), cancelled_by_user_id = ? WHERE company_id = ? AND petty_cash_fund_id = ? AND id = ? AND status = 'SCHEDULED'",
                context.userId(), context.companyId(), fundId, changeId) != 1) throw FinanceApiException.conflict("Only a pending type change can be cancelled.");
        jdbc.update("UPDATE finance_petty_cash_funds SET version = version + 1 WHERE company_id = ? AND id = ?", context.companyId(), fundId);
        return history(context, fundId);
    }

    @Transactional
    public void activateCompany(long companyId) {
        var context = new FinanceContext(null, companyId, "System", "system", true, FinanceScope.corporateOffice());
        var ids = jdbc.queryForList("SELECT petty_cash_fund_id FROM finance_petty_cash_type_changes WHERE company_id = ? AND status = 'SCHEDULED' AND effective_date <= ? ORDER BY petty_cash_fund_id",
            Long.class, companyId, LocalDate.now(zones.resolve(companyId)));
        for (var id : ids) { repository.lockFund(context, id); activateDue(context, id); }
    }

    void activateDue(FinanceContext context, long fundId) {
        var today = LocalDate.now(zones.resolve(context.companyId()));
        var rows = jdbc.queryForList("SELECT id, effective_date, configuration_json FROM finance_petty_cash_type_changes WHERE company_id = ? AND petty_cash_fund_id = ? AND status = 'SCHEDULED' AND effective_date <= ? FOR UPDATE",
            context.companyId(), fundId, today);
        for (var row : rows) {
            var existing = requireFund(context, fundId);
            if (pendingReceipts(context, fundId) > 0) continue;
            var command = snapshots.command(row.get("configuration_json").toString());
            var date = LocalDate.parse(row.get("effective_date").toString());
            var id = ((Number) row.get("id")).longValue();
            var splitStage = jdbc.queryForObject("""
                SELECT COUNT(*) FROM finance_petty_cash_statements s
                WHERE s.company_id = ? AND s.petty_cash_fund_id = ?
                  AND s.period_start <= ? AND s.period_end >= ?
                  AND s.status IN ('OPEN','CUT_PENDING','PARTIALLY_SETTLED','SETTLED','SHORTAGE')
                  AND s.deleted_at IS NULL
                  AND (
                    EXISTS (SELECT 1 FROM finance_petty_cash_movements m
                            WHERE m.company_id = s.company_id AND m.petty_cash_statement_id = s.id AND m.deleted_at IS NULL)
                    OR EXISTS (SELECT 1 FROM finance_petty_cash_settlement_lines l
                               WHERE l.company_id = s.company_id AND l.petty_cash_statement_id = s.id AND l.deleted_at IS NULL)
                  )
                """, Long.class, context.companyId(), fundId, date, date) > 0;
            if (splitStage) jdbc.update("""
                UPDATE finance_petty_cash_statements
                SET period_end = ?, cut_off_date = ?, status = 'TRANSFERRED_TO_NEXT_CUT',
                    carry_forward_amount = declared_closing_balance_amount,
                    metadata_json = JSON_SET(COALESCE(metadata_json, JSON_OBJECT()), '$.typeChange',
                        JSON_OBJECT('changeId', ?, 'effectiveDate', ?, 'nextType', ?)),
                    version = version + 1
                WHERE company_id = ? AND petty_cash_fund_id = ? AND period_start < ? AND period_end >= ?
                  AND status IN ('OPEN','CUT_PENDING','PARTIALLY_SETTLED','SETTLED','SHORTAGE')
                  AND deleted_at IS NULL
                """, date.minusDays(1), date.minusDays(1), id, date.toString(), command.fundType().name(),
                context.companyId(), fundId, date, date);
            repository.updateFund(context, fundId, command);
            jdbc.update("UPDATE finance_petty_cash_funds SET type_stage_id = ? WHERE company_id = ? AND id = ?", id, context.companyId(), fundId);
            var saved = requireFund(context, fundId);
            if (splitStage) {
                var period = java.time.YearMonth.from(date);
                repository.insertStatement(context, saved,
                    "PC-ST-" + period + "-" + fundId + "-" + id, period.toString(), date, period.atEndOfMonth());
            } else {
                jdbc.update("""
                    UPDATE finance_petty_cash_statements s
                    SET type_stage_id = ?, fund_type_snapshot = ?, fund_snapshot_json = ?,
                        external_owner_type_snapshot = ?, external_owner_name_snapshot = ?,
                        external_owner_relationship_snapshot = ?, external_owner_reference_snapshot = ?,
                        statement_recipient_email_snapshot = ?, managed_asset_type_snapshot = ?,
                        managed_asset_name_snapshot = ?, managed_asset_reference_snapshot = ?, managed_assets_snapshot_json = ?
                    WHERE company_id = ? AND petty_cash_fund_id = ?
                      AND period_start <= ? AND period_end >= ?
                      AND status IN ('OPEN','CUT_PENDING','PARTIALLY_SETTLED','SETTLED','SHORTAGE')
                      AND NOT EXISTS (SELECT 1 FROM finance_petty_cash_movements m WHERE m.company_id = s.company_id AND m.petty_cash_statement_id = s.id)
                      AND NOT EXISTS (SELECT 1 FROM finance_petty_cash_settlement_lines l WHERE l.company_id = s.company_id AND l.petty_cash_statement_id = s.id)
                    """, id, command.fundType().name(), snapshots.write(saved), saved.externalOwnerType(), saved.externalOwnerName(),
                    saved.externalOwnerRelationship(), saved.externalOwnerReference(), saved.statementRecipientEmail(),
                    saved.managedAssetType(), saved.managedAssetName(), saved.managedAssetReference(), saved.managedAssetsJson(),
                    context.companyId(), fundId, date, date);
            }
            jdbc.update("UPDATE finance_petty_cash_type_changes SET status = 'APPLIED', applied_at = CURRENT_TIMESTAMP(6) WHERE company_id = ? AND id = ?",
                context.companyId(), id);
        }
    }

    @Scheduled(cron = "0 */5 * * * *", zone = "UTC")
    @Transactional
    public void activateDueChanges() {
        var companies = jdbc.queryForList("SELECT DISTINCT company_id FROM finance_petty_cash_type_changes WHERE status = 'SCHEDULED'", Long.class);
        for (var companyId : companies) activateCompany(companyId);
    }

    private PettyCashFundRecord requireFund(FinanceContext context, long id) {
        return repository.findFundById(context, id).orElseThrow(() -> new NoSuchElementException("Petty cash fund not found."));
    }

    private long pendingReceipts(FinanceContext context, long fundId) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM finance_petty_cash_settlement_lines line
            JOIN finance_petty_cash_statements statement_record
              ON statement_record.company_id = line.company_id AND statement_record.id = line.petty_cash_statement_id
            WHERE line.company_id = ? AND line.petty_cash_fund_id = ? AND line.deleted_at IS NULL
              AND ((statement_record.fund_type_snapshot = 'INTERNAL_COMPANY' AND line.status NOT IN ('EXPENSE_CREATED','REJECTED','REVERSED'))
                OR (statement_record.fund_type_snapshot = 'EXTERNAL_MANAGED' AND line.status NOT IN ('VALIDATED','REJECTED','REVERSED')))
            """, Long.class, context.companyId(), fundId);
    }
}
