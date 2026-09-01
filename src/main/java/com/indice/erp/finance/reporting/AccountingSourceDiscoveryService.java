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

    AccountingSourceDiscoveryService(AccountingSourceRepository sourceRepository, ObjectMapper objectMapper) {
        this.sourceRepository = sourceRepository;
        this.objectMapper = objectMapper;
    }

    Discovery discover(long companyId, LocalDate from, LocalDate to, String functionalCurrency) {
        var candidates = new ArrayList<PostingCandidate>();
        var issues = new ArrayList<DiscoveryIssue>();
        var eligible = new LinkedHashMap<String, Integer>();

        discoverSales(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverExpenses(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverExpensePayments(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverReceivablePayments(companyId, from, to, functionalCurrency, candidates, issues, eligible);
        discoverPayroll(companyId, from, to, functionalCurrency, candidates, issues, eligible);

        return new Discovery(List.copyOf(candidates), List.copyOf(issues), MapCopy.of(eligible));
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
            if (!sameCurrency(sale.currency(), currency)) {
                issues.add(currencyIssue("sales", "SALE", sale.id(), sale.currency(), currency));
                continue;
            }
            if (sale.total().signum() <= 0 || sale.tax().signum() < 0 || sale.tax().compareTo(sale.total()) > 0) {
                issues.add(issue("INVALID_SALE_TOTALS", "BLOCKING", "sales", "SALE", sale.id(),
                    "La venta no tiene importes válidos para una partida balanceada.",
                    "Corrige total e impuestos en Ventas y vuelve a sincronizar."));
                continue;
            }

            var cost = costOfSale(sale.linesJson());
            if (cost == null) {
                issues.add(issue("MISSING_PRODUCT_COST", "BLOCKING", "sales", "SALE", sale.id(),
                    "La venta " + sale.number() + " no conserva costo unitario verificable en todas sus líneas.",
                    "Completa el costo de producto en Ventas/Inventario antes de contabilizar."));
                continue;
            }

            var netRevenue = money(sale.total().subtract(sale.tax()));
            var lines = new ArrayList<PostingLine>();
            lines.add(line(sale.onCredit() ? "ACCOUNTS_RECEIVABLE" : "CASH", null,
                sale.unitId(), sale.businessId(), "Contrapartida venta " + sale.number(), sale.total(), ZERO,
                sale.number()));
            if (netRevenue.signum() > 0) {
                lines.add(line("REVENUE", null, sale.unitId(), sale.businessId(),
                    "Ingreso venta " + sale.number(), ZERO, netRevenue, sale.number()));
            }
            if (sale.tax().signum() > 0) {
                lines.add(line("TAXES_PAYABLE", null, sale.unitId(), sale.businessId(),
                    "Impuesto venta " + sale.number(), ZERO, sale.tax(), sale.number()));
            }
            if (cost.signum() > 0) {
                lines.add(line("COST_OF_SALES", null, sale.unitId(), sale.businessId(),
                    "Costo venta " + sale.number(), cost, ZERO, sale.number()));
                lines.add(line("INVENTORY", null, sale.unitId(), sale.businessId(),
                    "Salida de inventario " + sale.number(), ZERO, cost, sale.number()));
            }
            candidates.add(candidate("sales", "SALE", sale.id(), "SALES", sale.date(),
                "Venta " + sale.number(), currency, lines));
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
            if (!sameCurrency(expense.currency(), currency)) {
                issues.add(currencyIssue("expenses", "EXPENSE", expense.id(), expense.currency(), currency));
                continue;
            }
            if (expense.total().signum() <= 0) {
                issues.add(issue("INVALID_EXPENSE_TOTAL", "BLOCKING", "expenses", "EXPENSE", expense.id(),
                    "El gasto no tiene un importe positivo.", "Corrige el gasto antes de sincronizar."));
                continue;
            }
            Long explicitAccountId = expense.accountingAccountId();
            if (explicitAccountId != null && !sourceRepository.isActiveExpenseAccount(companyId, explicitAccountId)) {
                explicitAccountId = null;
                issues.add(issue("EXPENSE_ACCOUNT_FALLBACK", "WARNING", "expenses", "EXPENSE", expense.id(),
                    "La cuenta asignada al gasto no es una cuenta de resultados activa; se usará Gastos operativos.",
                    "Asigna una cuenta de gasto activa para mejorar la presentación."));
            }
            var lines = List.of(
                line(explicitAccountId == null ? "OPERATING_EXPENSES" : null, explicitAccountId,
                    expense.unitId(), expense.businessId(), expense.concept(), expense.total(), ZERO, expense.folio()),
                line("ACCOUNTS_PAYABLE", null, expense.unitId(), expense.businessId(),
                    "Pasivo por " + expense.folio(), ZERO, expense.total(), expense.folio())
            );
            candidates.add(candidate("expenses", "EXPENSE", expense.id(), "EXPENSE", expense.date(),
                "Gasto " + expense.folio(), currency, lines));
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
            if (!sameCurrency(payment.currency(), currency)) {
                issues.add(currencyIssue("expenses", "EXPENSE_PAYMENT", payment.id(), payment.currency(), currency));
                continue;
            }
            var lines = List.of(
                line("ACCOUNTS_PAYABLE", null, payment.unitId(), payment.businessId(),
                    "Pago de " + payment.folio(), payment.amount(), ZERO, payment.folio()),
                line("CASH", null, payment.unitId(), payment.businessId(),
                    "Salida de efectivo " + payment.folio(), ZERO, payment.amount(), payment.folio())
            );
            candidates.add(candidate("expenses", "EXPENSE_PAYMENT", payment.id(), "CASH", payment.date(),
                "Pago de gasto " + payment.folio(), currency, lines));
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
            if (!sameCurrency(payment.currency(), currency)) {
                issues.add(currencyIssue("receivables", "RECEIVABLE_PAYMENT", payment.id(), payment.currency(), currency));
                continue;
            }
            var lines = List.of(
                line("CASH", null, payment.unitId(), payment.businessId(),
                    "Cobro de " + payment.saleNumber(), payment.amount(), ZERO, payment.saleNumber()),
                line("ACCOUNTS_RECEIVABLE", null, payment.unitId(), payment.businessId(),
                    "Aplicación a cliente " + payment.saleNumber(), ZERO, payment.amount(), payment.saleNumber())
            );
            candidates.add(candidate("receivables", "RECEIVABLE_PAYMENT", payment.id(), "CASH", payment.date(),
                "Cobro de cuenta por cobrar " + payment.saleNumber(), currency, lines));
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
            if (!payroll.periodEnd().isBefore(from) && !payroll.periodEnd().isAfter(to)) {
                count(eligible, "payroll");
                var debits = money(payroll.gross().add(payroll.employerContributions()));
                var liabilities = money(payroll.deductions().add(payroll.employerContributions()).add(payroll.net()));
                if (debits.compareTo(liabilities) != 0 || debits.signum() <= 0) {
                    issues.add(issue("UNBALANCED_PAYROLL_SOURCE", "BLOCKING", "payroll", "PAYROLL_ACCRUAL", payroll.id(),
                        "Los totales de nómina no forman una partida balanceada.",
                        "Recalcula la nómina y confirma bruto, deducciones, cargas y neto."));
                } else {
                    var lines = new ArrayList<PostingLine>();
                    if (payroll.gross().signum() > 0) {
                        lines.add(line("PAYROLL_EXPENSE", null, null, null, "Nómina bruta", payroll.gross(), ZERO, "NOM-" + payroll.id()));
                    }
                    if (payroll.employerContributions().signum() > 0) {
                        lines.add(line("EMPLOYER_CONTRIBUTIONS_EXPENSE", null, null, null,
                            "Cargas patronales", payroll.employerContributions(), ZERO, "NOM-" + payroll.id()));
                    }
                    var withholdings = money(payroll.deductions().add(payroll.employerContributions()));
                    if (withholdings.signum() > 0) {
                        lines.add(line("PAYROLL_WITHHOLDINGS", null, null, null,
                            "Retenciones y cargas", ZERO, withholdings, "NOM-" + payroll.id()));
                    }
                    if (payroll.net().signum() > 0) {
                        lines.add(line("PAYROLL_PAYABLE", null, null, null,
                            "Nómina neta por pagar", ZERO, payroll.net(), "NOM-" + payroll.id()));
                    }
                    candidates.add(candidate("payroll", "PAYROLL_ACCRUAL", payroll.id(), "PAYROLL", payroll.periodEnd(),
                        "Devengo de nómina " + payroll.id(), currency, lines));
                }
            }
            if ("paid".equals(payroll.status()) && payroll.paidDate() != null
                && !payroll.paidDate().isBefore(from) && !payroll.paidDate().isAfter(to)) {
                count(eligible, "payroll");
                var lines = List.of(
                    line("PAYROLL_PAYABLE", null, null, null, "Liquidación de nómina", payroll.net(), ZERO, "NOM-" + payroll.id()),
                    line("CASH", null, null, null, "Pago de nómina", ZERO, payroll.net(), "NOM-" + payroll.id())
                );
                candidates.add(candidate("payroll", "PAYROLL_PAYMENT", payroll.id(), "CASH", payroll.paidDate(),
                    "Pago de nómina " + payroll.id(), currency, lines));
            }
        }
    }

    private BigDecimal costOfSale(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            if (!root.isArray() || root.isEmpty()) {
                return null;
            }
            BigDecimal cost = ZERO;
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
                cost = cost.add(quantity.multiply(unitCost));
            }
            return money(cost);
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
        String canonical = key + "|" + date + "|" + currency + "|" + lines;
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
