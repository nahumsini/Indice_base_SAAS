package com.indice.erp.finance.reporting;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.exchange.BusinessExchangeRateEvidence;
import com.indice.erp.exchange.BusinessExchangeRateSnapshotRepository;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingCandidate;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingLine;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Historical accounting conversion. Never fetches today's rate to restate an old transaction. */
@Service
class AccountingCurrencyConversion {
    private static final BigDecimal ZERO = new BigDecimal("0.0000");
    private final BusinessExchangeRateSnapshotRepository snapshots;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final HistoricalInventoryCost inventoryCost;

    AccountingCurrencyConversion(BusinessExchangeRateSnapshotRepository snapshots, JdbcTemplate jdbc, ObjectMapper json, HistoricalInventoryCost inventoryCost) {
        this.snapshots = snapshots;
        this.jdbc = jdbc;
        this.json = json;
        this.inventoryCost = inventoryCost;
    }

    PostingCandidate convert(long companyId, PostingCandidate nativeEntry, String functionalCurrency) {
        return convert(companyId, nativeEntry, functionalCurrency, new java.util.HashMap<>());
    }

    PostingCandidate convert(long companyId, PostingCandidate nativeEntry, String functionalCurrency,
            Map<LocalDate, java.util.Optional<com.indice.erp.exchange.BusinessExchangeRatesResponse>> cache) {
        var evidence = new LinkedHashMap<String, Object>();
        var lines = new ArrayList<PostingLine>();
        var historicalCosts = new java.util.HashMap<String, HistoricalInventoryCost.Valuation>();
        BigDecimal entryRate = rate(nativeEntry.currency(), functionalCurrency, nativeEntry.entryDate(), evidence, cache);
        for (var line : nativeEntry.lines()) {
            String nativeCurrency = line.transactionCurrency() == null ? nativeEntry.currency() : line.transactionCurrency();
            BigDecimal lineRate = rate(nativeCurrency, functionalCurrency, nativeEntry.entryDate(), evidence, cache);
            if ("SALE".equals(nativeEntry.sourceType()) && !nativeCurrency.equalsIgnoreCase(functionalCurrency)
                    && ("COST_OF_SALES".equals(line.systemAccountCode()) || "INVENTORY".equals(line.systemAccountCode()))) {
                var nativeCost = line.debit().signum() > 0 ? line.debit() : line.credit();
                var historical = historicalCosts.computeIfAbsent(nativeCurrency, ignored -> inventoryCost.sale(companyId, Long.parseLong(nativeEntry.sourceId()), nativeCurrency, functionalCurrency, nativeCost));
                lineRate = historical.functionalCost().divide(nativeCost, 12, RoundingMode.HALF_UP);
                evidence.put("inventoryHistoricalCost:" + nativeCurrency, historical.evidence());
            }
            if (!nativeCurrency.equalsIgnoreCase(functionalCurrency) && (("EXPENSE_PAYMENT".equals(nativeEntry.sourceType()) && "ACCOUNTS_PAYABLE".equals(line.systemAccountCode()))
                    || ("RECEIVABLE_PAYMENT".equals(nativeEntry.sourceType()) && "ACCOUNTS_RECEIVABLE".equals(line.systemAccountCode()))
                    || ("PAYROLL_PAYMENT".equals(nativeEntry.sourceType()) && "PAYROLL_PAYABLE".equals(line.systemAccountCode())))) {
                // Settle the original carrying value; the difference from cash belongs to realized FX.
                LocalDate recognitionDate = recognitionDate(companyId, nativeEntry);
                lineRate = rate(nativeCurrency, functionalCurrency, recognitionDate, evidence, cache);
            }
            lines.add(new PostingLine(line.systemAccountCode(), line.explicitAccountId(), line.unitId(), line.businessId(),
                line.description(), money(line.debit().multiply(lineRate)), money(line.credit().multiply(lineRate)),
                line.documentReference(), line.debit().signum() > 0 ? line.debit() : line.credit(), nativeCurrency, lineRate));
        }
        BigDecimal difference = lines.stream().map(line -> line.debit().subtract(line.credit())).reduce(ZERO, BigDecimal::add);
        if (difference.signum() != 0) {
            boolean payment = "EXPENSE_PAYMENT".equals(nativeEntry.sourceType()) || "RECEIVABLE_PAYMENT".equals(nativeEntry.sourceType()) || "PAYROLL_PAYMENT".equals(nativeEntry.sourceType());
            if (!payment && difference.abs().compareTo(new BigDecimal("0.0010")) > 0) {
                throw new IllegalArgumentException("La fuente contable no está balanceada por moneda.");
            }
            var first = lines.getFirst();
            lines.add(new PostingLine(difference.signum() > 0 ? "REALIZED_EXCHANGE_GAIN" : "REALIZED_EXCHANGE_LOSS",
                null, first.unitId(), first.businessId(), payment ? "Diferencia de cambio realizada" : "Redondeo de conversión",
                difference.signum() < 0 ? difference.negate() : ZERO, difference.signum() > 0 ? difference : ZERO,
                first.documentReference(), difference.abs(), functionalCurrency, BigDecimal.ONE));
        }
        return new PostingCandidate(nativeEntry.sourceModule(), nativeEntry.sourceType(), nativeEntry.sourceId(),
            nativeEntry.sourceEventKey(), nativeEntry.sourceFingerprint(), nativeEntry.journalType(), nativeEntry.entryDate(),
            nativeEntry.description(), nativeEntry.currency(), java.util.List.copyOf(lines), entryRate, serialize(evidence));
    }

    PostingCandidate revalueReversalCash(PostingCandidate reversal, String functionalCurrency) {
        var evidence = new LinkedHashMap<String, Object>();
        evidence.put("originalEntryEvidence", reversal.exchangeRateEvidenceJson() == null ? "" : reversal.exchangeRateEvidenceJson());
        var cache = new java.util.HashMap<LocalDate, java.util.Optional<com.indice.erp.exchange.BusinessExchangeRatesResponse>>();
        var lines = new ArrayList<PostingLine>();
        for (var line : reversal.lines()) {
            if (!"CASH".equals(line.systemAccountCode()) || functionalCurrency.equalsIgnoreCase(line.transactionCurrency())) { lines.add(line); continue; }
            var cashRate = rate(line.transactionCurrency(), functionalCurrency, reversal.entryDate(), evidence, cache);
            var amount = money(line.transactionAmount().multiply(cashRate));
            lines.add(new PostingLine(line.systemAccountCode(), line.explicitAccountId(), line.unitId(), line.businessId(),
                line.description(), line.debit().signum() > 0 ? amount : ZERO, line.credit().signum() > 0 ? amount : ZERO,
                line.documentReference(), line.transactionAmount(), line.transactionCurrency(), cashRate));
        }
        var difference = lines.stream().map(line -> line.debit().subtract(line.credit())).reduce(ZERO, BigDecimal::add);
        if (difference.signum() != 0) {
            var first = lines.getFirst();
            lines.add(new PostingLine(difference.signum() > 0 ? "REALIZED_EXCHANGE_GAIN" : "REALIZED_EXCHANGE_LOSS", null,
                first.unitId(), first.businessId(), "Diferencia de cambio de la devolución", difference.signum() < 0 ? difference.negate() : ZERO,
                difference.signum() > 0 ? difference : ZERO, first.documentReference(), difference.abs(), functionalCurrency, BigDecimal.ONE));
        }
        return new PostingCandidate(reversal.sourceModule(), reversal.sourceType(), reversal.sourceId(), reversal.sourceEventKey(),
            reversal.sourceFingerprint(), reversal.journalType(), reversal.entryDate(), reversal.description(), reversal.currency(), List.copyOf(lines),
            reversal.exchangeRate(), serialize(evidence));
    }

    private LocalDate recognitionDate(long companyId, PostingCandidate entry) {
        String sql = "PAYROLL_PAYMENT".equals(entry.sourceType())
            ? "SELECT period_end_date FROM payroll_runs WHERE company_id = ? AND id = ?"
            : "EXPENSE_PAYMENT".equals(entry.sourceType()) ? """
            SELECT expense.expense_date FROM finance_expense_payments payment
            JOIN finance_expenses expense ON expense.company_id = payment.company_id AND expense.id = payment.expense_id
            WHERE payment.company_id = ? AND payment.id = ?
            """ : """
            SELECT COALESCE(sale.sale_date, credit.sale_date) FROM finance_receivable_payments payment
            JOIN finance_receivable_accounts receivable ON receivable.company_id = payment.company_id AND receivable.id = payment.receivable_id
            JOIN finance_credit_sales credit ON credit.company_id = receivable.company_id AND credit.id = receivable.credit_sale_id
            LEFT JOIN sales_records sale ON sale.company_id = receivable.company_id AND sale.id = receivable.sales_record_id
            WHERE payment.company_id = ? AND payment.id = ?
            """;
        return jdbc.query(sql, (rs, index) -> rs.getObject(1, LocalDate.class), companyId, entry.sourceId()).stream()
            .findFirst().orElseThrow(() -> new MissingRecognition("El pago no tiene un documento de origen reconocible; vincula la venta o registra su saldo de apertura."));
    }

    private BigDecimal rate(String nativeCurrency, String functionalCurrency, LocalDate date, Map<String, Object> evidence,
            Map<LocalDate, java.util.Optional<com.indice.erp.exchange.BusinessExchangeRatesResponse>> cache) {
        if (nativeCurrency != null && nativeCurrency.equalsIgnoreCase(functionalCurrency)) return BigDecimal.ONE;
        var snapshot = cache.computeIfAbsent(date, day -> snapshots.find(day).or(() -> snapshots.findLatestBefore(day)))
            .orElseThrow(() -> new MissingRate("No existe un corte de divisas verificable para " + date + "."));
        var rates = BusinessExchangeRateEvidence.verifiedRates(snapshot, date, false);
        var source = rates.get(nativeCurrency);
        var target = rates.get(functionalCurrency);
        if (source == null || target == null) throw new MissingRate("Falta evidencia de conversión " + nativeCurrency + "/" + functionalCurrency + " para " + date + ".");
        BigDecimal result = target.divide(source, 12, RoundingMode.HALF_UP);
        evidence.put(date + ":" + nativeCurrency + ":" + functionalCurrency, Map.of(
            "transactionDate", date.toString(), "nativeCurrency", nativeCurrency, "functionalCurrency", functionalCurrency,
            "rate", result, "sources", snapshot.sources()));
        return result;
    }

    private String serialize(Object value) {
        try { return json.writeValueAsString(value); }
        catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException("Cannot preserve accounting rate evidence", error); }
    }
    private static BigDecimal money(BigDecimal value) { return value.setScale(4, RoundingMode.HALF_UP); }
    static class MissingRate extends IllegalArgumentException { MissingRate(String message) { super(message); } }
    static class MissingRecognition extends IllegalArgumentException { MissingRecognition(String message) { super(message); } }
}
