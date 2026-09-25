package com.indice.erp.finance.reporting;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.reporting.AccountingPostingModels.Discovery;
import com.indice.erp.finance.reporting.AccountingPostingModels.DiscoveryIssue;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingCandidate;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingLine;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
class AccountingSourceDiscoveryService {

    private static final BigDecimal ZERO = new BigDecimal("0.0000");

    private final AccountingSourceRepository sourceRepository;
    private final ObjectMapper objectMapper;
    private final AccountingCurrencyConversion currencies;

    AccountingSourceDiscoveryService(AccountingSourceRepository sourceRepository, ObjectMapper objectMapper, AccountingCurrencyConversion currencies) {
        this.sourceRepository = sourceRepository;
        this.objectMapper = objectMapper;
        this.currencies = currencies;
    }

    Discovery discover(long companyId, LocalDate from, LocalDate to, String functionalCurrency) {
        var candidates = new ArrayList<PostingCandidate>();
        var issues = new ArrayList<DiscoveryIssue>();
        var eligible = new LinkedHashMap<String, Integer>();
        issues.addAll(sourceRepository.pendingPosReturns(companyId, from, to));

        discoverSales(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverStandaloneCreditSales(companyId, from, to, candidates, issues, eligible);
        discoverExpenses(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverExpensePayments(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverReceivablePayments(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverPayroll(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverInventoryReceipts(companyId, from, to, candidates, issues, eligible);

        var converted = new ArrayList<PostingCandidate>();
        var rateCache = new java.util.HashMap<LocalDate, java.util.Optional<com.indice.erp.exchange.BusinessExchangeRatesResponse>>();
        for (var candidate : candidates) {
            try {
                converted.add(currencies.convert(companyId, candidate, functionalCurrency, rateCache));
            } catch (AccountingCurrencyConversion.MissingRate | AccountingCurrencyConversion.MissingRecognition error) {
                issues.add(new DiscoveryIssue(error instanceof AccountingCurrencyConversion.MissingRate
                    ? "MISSING_EXCHANGE_RATE" : "MISSING_SOURCE_RECOGNITION", "BLOCKING", candidate.sourceModule(),
                    candidate.sourceType(), candidate.sourceId(), error.getMessage(),
                    "Completa la evidencia del documento de origen y la tasa histórica antes de sincronizar."));
            }
        }
        return new Discovery(List.copyOf(converted), List.copyOf(issues), MapCopy.of(eligible));
    }

    Discovery discover(long companyId, LocalDate from, LocalDate to, String functionalCurrency, Long unitId, Long businessId) {
        return inScope(companyId, discover(companyId, from, to, functionalCurrency), unitId, businessId);
    }

    Discovery inScope(long companyId, Discovery all, Long unitId, Long businessId) {
        if (unitId == null && businessId == null) return all;
        var candidates = all.candidates().stream().filter(candidate -> candidate.lines().stream().anyMatch(line ->
            (unitId == null || unitId.equals(line.unitId())) && (businessId == null || businessId.equals(line.businessId())))).toList();
        var issues = all.issues().stream().filter(issue -> relevant(companyId, issue, unitId, businessId)).toList();
        var eligible = new LinkedHashMap<String, Integer>();
        candidates.forEach(candidate -> count(eligible, candidate.sourceModule()));
        issues.stream().filter(issue -> "BLOCKING".equals(issue.severity())).forEach(issue -> count(eligible, issue.sourceModule()));
        return new Discovery(candidates, issues, eligible);
    }

    boolean relevant(long companyId, DiscoveryIssue issue, Long unitId, Long businessId) {
        return sourceRepository.sourceInScope(companyId, issue, unitId, businessId);
    }

    private void discoverInventoryReceipts(long companyId, LocalDate from, LocalDate to,
            List<PostingCandidate> candidates, List<DiscoveryIssue> issues, LinkedHashMap<String, Integer> eligible) {
        for (var receipt : sourceRepository.findInventoryReceipts(companyId, from, to)) {
            count(eligible, "inventory");
            if (!receipt.paymentVerified() || receipt.subtotal() == null || receipt.tax() == null
                    || receipt.subtotal().signum() < 0 || receipt.tax().signum() < 0 || receipt.total().signum() <= 0
                    || receipt.subtotal().add(receipt.tax()).compareTo(receipt.total()) != 0) {
                issues.add(issue("UNVERIFIED_INVENTORY_RECEIPT", "BLOCKING", "inventory", "INVENTORY_RECEIPT", receipt.id(),
                    "La entrada pagada requiere importes y salida de dinero coincidentes.", "Revisa la entrada original en POS."));
                continue;
            }
            var lines = new ArrayList<PostingLine>();
            if (receipt.subtotal().signum() > 0) lines.add(line("INVENTORY", null, receipt.unitId(), receipt.businessId(),
                "Compra de inventario " + receipt.number(), receipt.subtotal(), ZERO, receipt.number()));
            if (receipt.tax().signum() > 0) {
                lines.add(line("PURCHASE_TAX_PENDING", null, receipt.unitId(), receipt.businessId(),
                    "Impuestos de compra por clasificar " + receipt.number(), receipt.tax(), ZERO, receipt.number()));
                issues.add(issue("PURCHASE_TAX_CLASSIFICATION", "WARNING", "inventory", "INVENTORY_RECEIPT", receipt.id(),
                    "El impuesto de compra se presenta separado, pendiente de validar su recuperabilidad.",
                    "Revisa la jurisdicción y la política fiscal antes de usar estos estados para cumplimiento."));
            }
            lines.add(line("CASH", null, receipt.unitId(), receipt.businessId(), "Pago de inventario " + receipt.number(),
                ZERO, receipt.total(), receipt.number()));
            candidates.add(candidate("inventory", "INVENTORY_RECEIPT", receipt.id(), "INVENTORY", receipt.date(),
                "Entrada pagada " + receipt.number(), receipt.currency(), lines));
        }
    }

    private void discoverSales(
        long companyId,
        LocalDate from,
        LocalDate to,
        String currency,
        List<PostingCandidate> candidates,
        List<DiscoveryIssue> issues,
        LinkedHashMap<String, Integer> eligible
    ) {
        for (var sale : sourceRepository.findSales(companyId, from, to)) {
            count(eligible, "sales");
            if (sale.total().signum() <= 0 || sale.tax().signum() < 0 || sale.tax().compareTo(sale.total()) > 0) {
                issues.add(issue("INVALID_SALE_TOTALS", "BLOCKING", "sales", "SALE", sale.id(),
                    "La venta no tiene importes válidos para una partida balanceada.",
                    "Corrige total e impuestos en Ventas y vuelve a sincronizar."));
                continue;
            }

            var cost = costOfSale(sale.linesJson(), sale.currency());
            if (cost == null) {
                issues.add(issue("MISSING_PRODUCT_COST", "BLOCKING", "sales", "SALE", sale.id(),
                    "La venta " + sale.number() + " no conserva costo unitario verificable en todas sus líneas.",
                    "Completa el costo de producto en Ventas/Inventario antes de contabilizar."));
                continue;
            }

            var netRevenue = money(sale.total().subtract(sale.tax()));
            var lines = new ArrayList<PostingLine>();
            if (sale.creditAmount().signum() < 0 || sale.cashAmount().signum() < 0
                    || sale.creditAmount().add(sale.cashAmount()).compareTo(sale.total()) != 0) {
                issues.add(issue("INCOMPLETE_SALE_SETTLEMENT", "BLOCKING", "sales", "SALE", sale.id(),
                    "El cobro confirmado más el principal a crédito no coincide con el total de la venta.",
                    "Completa la evidencia de cobro y crédito en Ventas, POS o Cartera antes de contabilizar."));
                continue;
            }
            if (sale.creditAmount().signum() > 0) lines.add(line("ACCOUNTS_RECEIVABLE", null,
                sale.unitId(), sale.businessId(), "Contrapartida venta " + sale.number(), sale.creditAmount(), ZERO, sale.number()));
            if (sale.cashAmount().signum() > 0) lines.add(line("CASH", null,
                sale.unitId(), sale.businessId(), "Contrapartida venta " + sale.number(), sale.cashAmount(), ZERO, sale.number()));
            if (netRevenue.signum() > 0) {
                lines.add(line("REVENUE", null, sale.unitId(), sale.businessId(),
                    "Ingreso venta " + sale.number(), ZERO, netRevenue, sale.number()));
            }
            if (sale.tax().signum() > 0) {
                lines.add(line("TAXES_PAYABLE", null, sale.unitId(), sale.businessId(),
                    "Impuesto venta " + sale.number(), ZERO, sale.tax(), sale.number()));
            }
            for (var costEntry : cost.entrySet()) {
                if (costEntry.getValue().signum() <= 0) continue;
                for (var costLine : List.of(
                    line("COST_OF_SALES", null, sale.unitId(), sale.businessId(),
                        "Costo venta " + sale.number(), costEntry.getValue(), ZERO, sale.number()),
                    line("INVENTORY", null, sale.unitId(), sale.businessId(),
                        "Salida de inventario " + sale.number(), ZERO, costEntry.getValue(), sale.number()))) {
                    lines.add(new PostingLine(costLine.systemAccountCode(), null, sale.unitId(), sale.businessId(),
                        costLine.description(), costLine.debit(), costLine.credit(), sale.number(),
                        costEntry.getValue(), costEntry.getKey(), BigDecimal.ONE));
                }
            }
            candidates.add(candidate("sales", "SALE", sale.id(), "SALES", sale.date(),
                "Venta " + sale.number(), sale.currency(), lines));
        }
    }

    private void discoverStandaloneCreditSales(long companyId, LocalDate from, LocalDate to,
            List<PostingCandidate> candidates, List<DiscoveryIssue> issues, LinkedHashMap<String, Integer> eligible) {
        for (var sale : sourceRepository.findStandaloneCreditSales(companyId, from, to)) {
            count(eligible, "receivables");
            if (sale.total().signum() <= 0 || sale.total().compareTo(sale.financedAmount()) != 0) {
                issues.add(issue("INCOMPLETE_SALE_SETTLEMENT", "BLOCKING", "receivables", "CREDIT_SALE", sale.id(),
                    "El crédito manual requiere evidencia del anticipo y de su venta completa.",
                    "Vincula la venta de origen y su cobro; no se registrará efectivo supuesto."));
                continue;
            }
            candidates.add(candidate("receivables", "CREDIT_SALE", sale.id(), "SALES", sale.date(), "Venta a crédito " + sale.number(),
                sale.currency(), List.of(
                    line("ACCOUNTS_RECEIVABLE", null, sale.unitId(), sale.businessId(), "Crédito " + sale.number(), sale.financedAmount(), ZERO, sale.number()),
                    line("REVENUE", null, sale.unitId(), sale.businessId(), "Venta a crédito " + sale.number(), ZERO, sale.financedAmount(), sale.number()))));
        }
    }

    private void discoverExpenses(
        long companyId,
        LocalDate from,
        LocalDate to,
        String currency,
        List<PostingCandidate> candidates,
        List<DiscoveryIssue> issues,
        LinkedHashMap<String, Integer> eligible
    ) {
        for (var expense : sourceRepository.findExpenses(companyId, from, to)) {
            count(eligible, "expenses");
            if (expense.total().signum() <= 0) {
                issues.add(issue("INVALID_EXPENSE_TOTAL", "BLOCKING", "expenses", "EXPENSE", expense.id(),
                    "El gasto no tiene un importe positivo.", "Corrige el gasto antes de sincronizar."));
                continue;
            }
            Long explicitAccountId = expense.accountingAccountId();
            if (explicitAccountId != null && !sourceRepository.isActiveExpenseAccount(companyId, explicitAccountId)) {
                issues.add(issue("INVALID_EXPENSE_ACCOUNT", "BLOCKING", "expenses", "EXPENSE", expense.id(),
                    "La cuenta asignada no es una cuenta activa de gasto o activo; no se cambiará su clasificación automáticamente.",
                    "Asigna una cuenta postable de gasto o activo antes de sincronizar."));
                continue;
            }
            var lines = List.of(
                line(explicitAccountId == null ? "OPERATING_EXPENSES" : null, explicitAccountId,
                    expense.unitId(), expense.businessId(), expense.concept(), expense.total(), ZERO, expense.folio()),
                line("ACCOUNTS_PAYABLE", null, expense.unitId(), expense.businessId(),
                    "Pasivo por " + expense.folio(), ZERO, expense.total(), expense.folio())
            );
            candidates.add(candidate("expenses", "EXPENSE", expense.id(), "EXPENSE", expense.date(),
                "Gasto " + expense.folio(), expense.currency(), lines));
        }
    }

    private void discoverExpensePayments(
        long companyId,
        LocalDate from,
        LocalDate to,
        String currency,
        List<PostingCandidate> candidates,
        List<DiscoveryIssue> issues,
        LinkedHashMap<String, Integer> eligible
    ) {
        for (var payment : sourceRepository.findExpensePayments(companyId, from, to)) {
            count(eligible, "expenses");
            var lines = List.of(
                line("ACCOUNTS_PAYABLE", null, payment.unitId(), payment.businessId(),
                    "Pago de " + payment.folio(), payment.amount(), ZERO, payment.folio()),
                line("CASH", null, payment.unitId(), payment.businessId(),
                    "Salida de efectivo " + payment.folio(), ZERO, payment.amount(), payment.folio())
            );
            candidates.add(candidate("expenses", "EXPENSE_PAYMENT", payment.id(), "CASH", payment.date(),
                "Pago de gasto " + payment.folio(), payment.currency(), lines));
        }
    }

    private void discoverReceivablePayments(
        long companyId,
        LocalDate from,
        LocalDate to,
        String currency,
        List<PostingCandidate> candidates,
        List<DiscoveryIssue> issues,
        LinkedHashMap<String, Integer> eligible
    ) {
        for (var payment : sourceRepository.findReceivablePayments(companyId, from, to)) {
            count(eligible, "receivables");
            var principal = payment.principalAmount();
            if (principal == null || principal.signum() < 0 || principal.compareTo(payment.amount()) > 0) {
                issues.add(issue("INVALID_RECEIVABLE_PRINCIPAL", "BLOCKING", "receivables", "RECEIVABLE_PAYMENT", payment.id(),
                    "El abono no tiene una separación válida de principal e intereses.", "Revisa el financiamiento y sus importes originales."));
                continue;
            }
            var lines = new ArrayList<PostingLine>();
            lines.add(line("CASH", null, payment.unitId(), payment.businessId(),
                "Cobro de " + payment.saleNumber(), payment.amount(), ZERO, payment.saleNumber()));
            if (principal.signum() > 0) lines.add(line("ACCOUNTS_RECEIVABLE", null, payment.unitId(), payment.businessId(),
                "Aplicación a cliente " + payment.saleNumber(), ZERO, principal, payment.saleNumber()));
            var interest = payment.amount().subtract(principal);
            if (interest.signum() > 0) lines.add(line("OTHER_INCOME", null, payment.unitId(), payment.businessId(),
                "Intereses cobrados " + payment.saleNumber(), ZERO, interest, payment.saleNumber()));
            candidates.add(candidate("receivables", "RECEIVABLE_PAYMENT", payment.id(), "CASH", payment.date(),
                "Cobro de cuenta por cobrar " + payment.saleNumber(), payment.currency(), lines));
        }
    }

    private void discoverPayroll(
        long companyId,
        LocalDate from,
        LocalDate to,
        String currency,
        List<PostingCandidate> candidates,
        List<DiscoveryIssue> issues,
        LinkedHashMap<String, Integer> eligible
    ) {
        for (var payroll : sourceRepository.findPayrollRuns(companyId, from, to)) {
            boolean accrualDue = !payroll.periodEnd().isBefore(from) && !payroll.periodEnd().isAfter(to);
            boolean paymentDue = "paid".equals(payroll.status()) && payroll.paidDate() != null
                && !payroll.paidDate().isBefore(from) && !payroll.paidDate().isAfter(to);
            if (accrualDue) count(eligible, "payroll");
            boolean valid = !payroll.lines().isEmpty() && payroll.lines().stream().allMatch(row ->
                row.validPayable() && row.currency() != null && row.currency().matches("[A-Z]{3}") && row.gross().signum() >= 0
                    && row.deductions().signum() >= 0 && row.employerContributions().signum() >= 0
                    && row.net().signum() >= 0 && row.gross().subtract(row.deductions()).compareTo(row.net()) == 0);
            if (!valid) {
                issues.add(issue("UNBALANCED_PAYROLL_SOURCE", "BLOCKING", "payroll", "PAYROLL_ACCRUAL", payroll.id(),
                    "La nómina necesita importes balanceados y moneda verificable por persona.",
                    "Revisa las líneas de la nómina; el total general no puede mezclar monedas."));
                continue;
            }
            var accrualLines = new ArrayList<PostingLine>();
            var paymentLines = new ArrayList<PostingLine>();
            for (var row : payroll.lines()) {
                String reference = "NOM-" + payroll.id();
                addPayrollLine(accrualLines, row, "PAYROLL_EXPENSE", "Nómina bruta", row.gross(), ZERO, reference);
                addPayrollLine(accrualLines, row, "EMPLOYER_CONTRIBUTIONS_EXPENSE", "Cargas patronales", row.employerContributions(), ZERO, reference);
                addPayrollLine(accrualLines, row, "PAYROLL_WITHHOLDINGS", "Retenciones y cargas", ZERO, row.deductions().add(row.employerContributions()), reference);
                addPayrollLine(accrualLines, row, row.payableExpenseId() == null ? "PAYROLL_PAYABLE" : "ACCOUNTS_PAYABLE",
                    "Nómina neta por pagar", ZERO, row.net(), reference);
                if (row.payableExpenseId() == null) {
                    addPayrollLine(paymentLines, row, "PAYROLL_PAYABLE", "Liquidación de nómina", row.net(), ZERO, reference);
                    addPayrollLine(paymentLines, row, "CASH", "Pago de nómina", ZERO, row.net(), reference);
                }
            }
            if (accrualDue && !accrualLines.isEmpty()) candidates.add(candidate("payroll", "PAYROLL_ACCRUAL", payroll.id(),
                "PAYROLL", payroll.periodEnd(), "Devengo de nómina " + payroll.id(), currency, accrualLines));
            if (paymentDue && !paymentLines.isEmpty()) {
                count(eligible, "payroll");
                candidates.add(candidate("payroll", "PAYROLL_PAYMENT", payroll.id(),
                    "CASH", payroll.paidDate(), "Pago de nómina " + payroll.id(), currency, paymentLines));
            }
        }
    }

    private static void addPayrollLine(List<PostingLine> lines, AccountingSourceRepository.PayrollLineSource row,
                                       String account, String description, BigDecimal debit, BigDecimal credit, String reference) {
        if (debit.signum() == 0 && credit.signum() == 0) return;
        lines.add(new PostingLine(account, null, row.unitId(), row.businessId(), description, money(debit), money(credit),
            reference, money(debit.signum() > 0 ? debit : credit), row.currency(), BigDecimal.ONE));
    }

    private java.util.Map<String, BigDecimal> costOfSale(String json, String saleCurrency) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            if (!root.isArray() || root.isEmpty()) {
                return null;
            }
            var cost = new LinkedHashMap<String, BigDecimal>();
            for (JsonNode line : root) {
                if (!line.has("quantity") || !line.has("unitCost") || !line.path("quantity").isNumber()
                    || !line.path("unitCost").isNumber()) {
                    return null;
                }
                BigDecimal quantity = line.path("quantity").decimalValue();
                BigDecimal unitCost = line.path("unitCost").decimalValue();
                if (quantity.signum() < 0 || unitCost.signum() < 0) {
                    return null;
                }
                String costCurrency = line.path("costCurrency").asText(saleCurrency).toUpperCase(java.util.Locale.ROOT);
                if (!costCurrency.matches("[A-Z]{3}")) return null;
                cost.merge(costCurrency, money(quantity.multiply(unitCost)), BigDecimal::add);
            }
            return cost;
        } catch (Exception ignored) {
            return null;
        }
    }

    private PostingCandidate candidate(
        String module,
        String type,
        long id,
        String journalType,
        LocalDate date,
        String description,
        String currency,
        List<PostingLine> lines
    ) {
        String key = module + ":" + type + ":" + id;
        // Preserve fingerprints of already posted version-1 sources as model metadata evolves.
        String stableLines = lines.stream().map(line -> "PostingLine[systemAccountCode=" + line.systemAccountCode()
            + ", explicitAccountId=" + line.explicitAccountId() + ", unitId=" + line.unitId()
            + ", businessId=" + line.businessId() + ", description=" + line.description()
            + ", debit=" + line.debit() + ", credit=" + line.credit()
            + ", documentReference=" + line.documentReference() + "]")
            .collect(java.util.stream.Collectors.joining(", ", "[", "]"));
        String canonical = key + "|" + date + "|" + currency + "|" + stableLines;
        if (lines.stream().anyMatch(line -> line.transactionCurrency() != null && !line.transactionCurrency().equalsIgnoreCase(currency))) {
            canonical += "|nativeCurrencies=" + lines.stream().map(PostingLine::transactionCurrency).toList();
        }
        return new PostingCandidate(module, type, String.valueOf(id), key, sha256(canonical),
            journalType, date, description, currency, List.copyOf(lines));
    }

    private static PostingLine line(
        String systemCode,
        Long accountId,
        Long unitId,
        Long businessId,
        String description,
        BigDecimal debit,
        BigDecimal credit,
        String reference
    ) {
        return new PostingLine(systemCode, accountId, unitId, businessId, description,
            money(debit), money(credit), reference);
    }

    private static DiscoveryIssue currencyIssue(String module, String type, long id, String source, String functional) {
        return issue("MISSING_EXCHANGE_RATE", "BLOCKING", module, type, id,
            "La operación está en " + source + " y la moneda funcional es " + functional + ".",
            "Registra una tasa de cambio válida para la fecha antes de contabilizar." );
    }

    private static DiscoveryIssue issue(
        String code,
        String severity,
        String module,
        String type,
        long id,
        String message,
        String action
    ) {
        return new DiscoveryIssue(code, severity, module, type, String.valueOf(id), message, action);
    }

    private static void count(LinkedHashMap<String, Integer> counts, String module) {
        counts.merge(module, 1, Integer::sum);
    }

    private static boolean sameCurrency(String source, String functional) {
        return source != null && functional != null && source.equalsIgnoreCase(functional);
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(4, RoundingMode.HALF_UP);
    }

    private static String sha256(String value) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            var result = new StringBuilder(bytes.length * 2);
            for (byte item : bytes) {
                result.append(String.format("%02x", item));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    private static final class MapCopy {
        private MapCopy() {
        }

        static <K, V> java.util.Map<K, V> of(java.util.Map<K, V> source) {
            return java.util.Collections.unmodifiableMap(new LinkedHashMap<>(source));
        }
    }
}
