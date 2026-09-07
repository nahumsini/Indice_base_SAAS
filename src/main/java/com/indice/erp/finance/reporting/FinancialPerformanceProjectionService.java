package com.indice.erp.finance.reporting;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Finance's read contract for operational profitability consumed by the central KPI module. */
@Service
public class FinancialPerformanceProjectionService {
    private final FinancialLedgerRepository ledger;
    private final AccountingSourceDiscoveryService discovery;
    private final JdbcTemplate jdbc;
    private final AccountingSourceReversalService reversals;

    FinancialPerformanceProjectionService(FinancialLedgerRepository ledger, AccountingSourceDiscoveryService discovery, JdbcTemplate jdbc, AccountingSourceReversalService reversals) {
        this.ledger = ledger; this.discovery = discovery; this.jdbc = jdbc; this.reversals = reversals;
    }

    public List<PerformanceRow> project(long companyId, LocalDate from, LocalDate to, Long unitId, Long businessId) {
        String currency = ledger.findSettings(companyId).map(FinancialLedgerRepository.AccountingSettings::functionalCurrency)
            .orElseGet(() -> jdbc.query("""
                SELECT UPPER(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(settings_json,
                  '$.config_center.empresa_template.currency')), ''), 'MXN')) FROM company_settings WHERE company_id = ?
                """, (rs, row) -> rs.getString(1), companyId).stream().findFirst().orElse("MXN"));
        var allSources = discovery.discover(companyId, from, to, currency);
        var source = discovery.inScope(companyId, allSources, unitId, businessId);
        var totals = new LinkedHashMap<Scope, Map<String, BigDecimal>>();
        var findings = new ArrayList<AccountingPostingModels.DiscoveryIssue>(reversals.pending(companyId, from, to, unitId, businessId));
        source.issues().stream().filter(issue -> "BLOCKING".equals(issue.severity()))
            .forEach(findings::add);
        ledger.missingPostedSources(companyId, from, to, allSources).stream()
            .filter(issue -> discovery.relevant(companyId, issue, unitId, businessId)).forEach(findings::add);
        var postedKeys = new LinkedHashMap<String, String>();
        jdbc.query("""
            SELECT entry.source_event_key, entry.source_fingerprint, line.unit_id, line.business_id,
                   account.system_code, account.account_type, line.debit_amount, line.credit_amount
            FROM finance_journal_entries entry
            JOIN finance_journal_lines line ON line.company_id = entry.company_id AND line.entry_id = entry.id
            JOIN finance_accounting_accounts account ON account.company_id = line.company_id AND account.id = line.account_id
            WHERE entry.company_id = ? AND entry.status = 'POSTED' AND entry.entry_date BETWEEN ? AND ?
            """, (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
                postedKeys.put(rs.getString("source_event_key"), rs.getString("source_fingerprint"));
                var scope = new Scope(rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class));
                if (matches(scope, unitId, businessId)) add(totals, scope, rs.getString("system_code"), rs.getString("account_type"),
                    rs.getBigDecimal("debit_amount"), rs.getBigDecimal("credit_amount"));
            }, companyId, from, to);
        var explicitAccounts = new LinkedHashMap<Long, String>();
        for (var candidate : source.candidates()) {
            if (postedKeys.containsKey(candidate.sourceEventKey())) {
                if (!Objects.equals(postedKeys.get(candidate.sourceEventKey()), candidate.sourceFingerprint())) {
                    findings.add(new AccountingPostingModels.DiscoveryIssue("SOURCE_CHANGED_AFTER_POSTING", "BLOCKING",
                        candidate.sourceModule(), candidate.sourceType(), candidate.sourceId(), "La operación cambió después de contabilizarse.",
                        "Revisa la operación y su corrección contable."));
                }
                continue;
            }
            for (var line : candidate.lines()) {
                var scope = new Scope(line.unitId(), line.businessId());
                if (!matches(scope, unitId, businessId)) continue;
                String type = line.explicitAccountId() == null ? systemType(line.systemAccountCode())
                    : explicitAccounts.computeIfAbsent(line.explicitAccountId(), id -> jdbc.queryForObject(
                        "SELECT account_type FROM finance_accounting_accounts WHERE company_id = ? AND id = ?", String.class, companyId, id));
                add(totals, scope, line.systemAccountCode(), type, line.debit(), line.credit());
            }
        }
        // A blocked source can have no posted or eligible amount; still propagate its readiness.
        if (!findings.isEmpty()) totals.computeIfAbsent(new Scope(unitId, businessId), ignored -> new LinkedHashMap<>());
        return totals.entrySet().stream().map(entry -> {
            var profit = FinancialReportingService.profitMetrics(entry.getValue());
            var scope = entry.getKey();
            var scopedFindings = findings.stream().filter(issue -> discovery.relevant(companyId, issue, scope.unitId(), scope.businessId()))
                .map(AccountingPostingModels.DiscoveryIssue::code).distinct().toList();
            return new PerformanceRow(entry.getKey().unitId(), entry.getKey().businessId(), currency, profit.revenue(),
                profit.costOfSales(), profit.operatingExpenses(), profit.operatingProfit(), scopedFindings.isEmpty(), scopedFindings);
        }).toList();
    }

    private static boolean matches(Scope scope, Long unitId, Long businessId) {
        return (unitId == null || unitId.equals(scope.unitId())) && (businessId == null || businessId.equals(scope.businessId()));
    }
    private static void add(Map<Scope, Map<String, BigDecimal>> groups, Scope scope, String systemCode, String type, BigDecimal debit, BigDecimal credit) {
        var totals = groups.computeIfAbsent(scope, ignored -> new LinkedHashMap<>());
        BigDecimal signed = "REVENUE".equals(type) ? credit.subtract(debit) : debit.subtract(credit);
        if (systemCode != null) totals.merge(systemCode, signed, BigDecimal::add);
        totals.merge("TYPE:" + type, signed, BigDecimal::add);
    }
    private static String systemType(String code) {
        if (List.of("REVENUE", "OTHER_INCOME", "REALIZED_EXCHANGE_GAIN").contains(code)) return "REVENUE";
        if (List.of("COST_OF_SALES", "OPERATING_EXPENSES", "PAYROLL_EXPENSE", "EMPLOYER_CONTRIBUTIONS_EXPENSE",
            "DEPRECIATION_EXPENSE", "FINANCE_EXPENSE", "INCOME_TAX_EXPENSE", "REALIZED_EXCHANGE_LOSS").contains(code)) return "EXPENSE";
        return "BALANCE";
    }
    private record Scope(Long unitId, Long businessId) {}
    public record PerformanceRow(Long unitId, Long businessId, String currency, BigDecimal recognizedRevenue,
                                 BigDecimal costOfSales, BigDecimal recognizedOperatingExpenses, BigDecimal operatingProfit,
                                 boolean profitReady, List<String> profitFindings) {
        public Map<String, Object> toMap() {
            var result = new LinkedHashMap<String, Object>();
            result.put("unitId", unitId); result.put("businessId", businessId); result.put("currency", currency);
            result.put("recognizedRevenue", recognizedRevenue); result.put("costOfSales", costOfSales);
            result.put("recognizedOperatingExpenses", recognizedOperatingExpenses); result.put("operatingProfit", operatingProfit);
            result.put("profitReady", profitReady); result.put("profitFindings", profitFindings);
            result.put("profitBasis", "FINANCE_POSTED_AND_VERIFIED_OPERATIONAL_SOURCES");
            return result;
        }
    }
}
