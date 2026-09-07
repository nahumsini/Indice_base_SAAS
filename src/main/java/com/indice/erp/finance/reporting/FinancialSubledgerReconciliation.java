package com.indice.erp.finance.reporting;

import com.indice.erp.finance.reporting.FinancialReportingContracts.QualityFinding;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Reconciles native control amounts. A USD balance is never compared with a MXN ledger value. */
@Service
class FinancialSubledgerReconciliation {
    private final JdbcTemplate jdbc;
    private final FinanceBusinessTimeZoneResolver timezones;
    private final com.indice.erp.finance.treasury.TreasuryService treasury;
    private final com.indice.erp.pos.settlement.CashClosingSettlementService pos;
    FinancialSubledgerReconciliation(JdbcTemplate jdbc, FinanceBusinessTimeZoneResolver timezones,
            com.indice.erp.finance.treasury.TreasuryService treasury, com.indice.erp.pos.settlement.CashClosingSettlementService pos) {
        this.jdbc = jdbc; this.timezones = timezones; this.treasury = treasury; this.pos = pos;
    }

    List<QualityFinding> reconcile(long companyId, LocalDate to, Long unitId, Long businessId) {
        var findings = new ArrayList<QualityFinding>();
        var payable = sums("""
            SELECT expense.currency_code currency, SUM(expense.total_amount - COALESCE((
              SELECT SUM(payment.amount) FROM finance_expense_payments payment
              WHERE payment.company_id = expense.company_id AND payment.expense_id = expense.id AND payment.payment_date <= ?
            ), 0)) amount FROM finance_expenses expense
            WHERE expense.company_id = ? AND expense.deleted_at IS NULL AND expense.expense_date <= ?
              AND expense.status IN ('APPROVED', 'PARTIALLY_PAID', 'PAID', 'CLOSED')
            """ + dimensions("expense", unitId, businessId) + " GROUP BY expense.currency_code", args(to, companyId, to, unitId, businessId));
        compare(findings, "PAYABLE_RECONCILIATION", "expenses", payable, ledger(companyId, to, unitId, businessId, "ACCOUNTS_PAYABLE"));

        var receivable = sums("""
            SELECT account.currency_code currency, SUM(account.original_amount - ROUND(COALESCE((
              SELECT SUM(payment.amount) FROM finance_receivable_payments payment
              WHERE payment.company_id = account.company_id AND payment.receivable_id = account.id AND payment.payment_date <= ?
            ), 0) * account.original_amount / NULLIF(account.total_payable_amount, 0), 4)) amount
            FROM finance_receivable_accounts account
            JOIN finance_credit_sales credit ON credit.company_id = account.company_id AND credit.id = account.credit_sale_id
            WHERE account.company_id = ? AND account.deleted_at IS NULL AND credit.sale_date <= ? AND account.status <> 'CANCELLED'
            """ + dimensions("account", unitId, businessId) + " GROUP BY account.currency_code", args(to, companyId, to, unitId, businessId));
        var pendingPos = sums("""
            SELECT ticket.currency_code currency, SUM(payment.amount) amount FROM pos_tickets ticket
            JOIN pos_payments payment ON payment.company_id = ticket.company_id AND payment.ticket_id = ticket.id
            JOIN sales_records sale ON sale.company_id = ticket.company_id AND sale.id = ticket.sales_record_id
            WHERE ticket.company_id = ? AND sale.sale_date <= ? AND ticket.status = 'COMPLETED' AND ticket.deleted_at IS NULL
              AND payment.payment_method = 'CREDIT' AND payment.status = 'CAPTURED'
              AND NOT EXISTS (SELECT 1 FROM finance_receivable_accounts account WHERE account.company_id = ticket.company_id
                AND account.sales_record_id = ticket.sales_record_id AND account.deleted_at IS NULL AND account.status <> 'CANCELLED')
            """ + dimensions("ticket", unitId, businessId) + " GROUP BY ticket.currency_code", args(companyId, to, unitId, businessId));
        pendingPos.forEach((currency, value) -> receivable.merge(currency, value, BigDecimal::add));
        if (pendingPos.values().stream().anyMatch(value -> value.signum() != 0)) findings.add(new QualityFinding(
            "POS_CREDIT_AWAITING_RECEIVABLE", "BLOCKING", "Crédito POS pendiente en Cartera",
            "Hay tickets a crédito sin cuenta de cobranza y calendario de pagos.",
            "Completa su financiamiento desde las ventas candidatas de Cartera.", "receivables", 1));
        compare(findings, "RECEIVABLE_RECONCILIATION", "receivables", receivable, ledger(companyId, to, unitId, businessId, "ACCOUNTS_RECEIVABLE"));

        if (!to.isBefore(LocalDate.now(timezones.resolve(companyId)))) {
            var inventory = sums("""
                SELECT product.currency currency, SUM(balance.available_quantity * balance.unit_cost) amount
                FROM sales_inventory_balances balance JOIN sales_products product
                  ON product.company_id = balance.company_id AND product.id = balance.product_id
                JOIN sales_inventory_warehouses warehouse ON warehouse.company_id = balance.company_id AND warehouse.id = balance.warehouse_id
                WHERE balance.company_id = ? AND balance.deleted_at IS NULL AND product.deleted_at IS NULL AND balance.uses_inventory = 1
                """ + dimensions("warehouse", "business_unit_id", unitId, businessId) + " GROUP BY product.currency", args(companyId, unitId, businessId));
            compare(findings, "INVENTORY_RECONCILIATION", "inventory", inventory, ledger(companyId, to, unitId, businessId, "INVENTORY"));
            if (unitId == null && businessId == null) {
                int pendingCollections = treasury.unsettledCollectionAccounts(companyId);
                if (pendingCollections > 0) findings.add(new QualityFinding("ELECTRONIC_COLLECTION_SETTLEMENT", "BLOCKING",
                    "Cobros electrónicos pendientes de liquidación", "Existen cobros por confirmar en las cuentas de Tesorería.",
                    "Liquida los cobros de tarjeta, transferencia o billetera en su cuenta destino antes de cerrar.", "treasury", pendingCollections));
                int creditAccounts = treasury.unclassifiedCreditAccounts(companyId);
                if (creditAccounts > 0) findings.add(new QualityFinding("CREDIT_INSTRUMENT_CLASSIFICATION", "BLOCKING",
                    "Instrumentos de crédito por clasificar", "Un saldo de tarjeta corporativa no identifica por sí mismo efectivo o deuda.",
                    "Revisa la deuda, disponibilidad y estados de cuenta del instrumento con su clasificación contable.", "treasury", creditAccounts));
                var control = pos.cashControl(companyId);
                if (control.openShifts() > 0) findings.add(new QualityFinding("POS_CASH_AWAITING_CLOSE", "BLOCKING",
                    "Efectivo POS pendiente de corte", "Hay " + control.openShifts() + " turnos sin cerrar.",
                    "Completa los cortes para conciliar efectivo y cobros pendientes con Tesorería.", "pos", control.openShifts()));
                else {
                    var cash = new LinkedHashMap<>(treasury.ownedCashBalances(companyId));
                    control.retainedByCurrency().forEach((currency, value) -> cash.merge(currency, value, BigDecimal::add));
                    compare(findings, "CASH_RECONCILIATION", "treasury", cash, ledger(companyId, to, null, null, "CASH"));
                }
            } else findings.add(new QualityFinding("CASH_COMPANY_CONTROL", "INFO", "Conciliación de efectivo corporativa",
                "Las cuentas compartidas de Tesorería se concilian en el informe de toda la empresa.",
                "Consulta el alcance corporativo para revisar el control de efectivo.", "treasury", 0));
        } else {
            findings.add(new QualityFinding("HISTORICAL_CONTROL_REVIEW", "WARNING", "Revisión de auxiliares históricos",
                "Cartera y cuentas por pagar se reconstruyen a la fecha; efectivo e inventario requieren sus cortes históricos documentados.",
                "Contrasta el mayor con los cortes de Tesorería, POS e inventario del período.", "ledger", 0));
        }
        return findings;
    }

    private Map<String, BigDecimal> ledger(long company, LocalDate to, Long unit, Long business, String account) {
        return sums("""
            SELECT line.transaction_currency currency,
              SUM(CASE WHEN line.debit_amount > 0 THEN line.transaction_amount ELSE -line.transaction_amount END)
                * CASE WHEN ? = 'ACCOUNTS_PAYABLE' THEN -1 ELSE 1 END amount
            FROM finance_journal_lines line JOIN finance_journal_entries entry
              ON entry.company_id = line.company_id AND entry.id = line.entry_id
            JOIN finance_accounting_accounts account ON account.company_id = line.company_id AND account.id = line.account_id
            WHERE line.company_id = ? AND entry.status = 'POSTED' AND entry.entry_date <= ? AND account.system_code = ?
            """ + dimensions("line", unit, business) + " GROUP BY line.transaction_currency",
            args(account, company, to, account, unit, business));
    }
    private Map<String, BigDecimal> sums(String sql, Object[] args) {
        var result = new LinkedHashMap<String, BigDecimal>();
        jdbc.query(sql, (org.springframework.jdbc.core.RowCallbackHandler) rs -> result.put(rs.getString("currency"), rs.getBigDecimal("amount")), args);
        return result;
    }
    private static void compare(List<QualityFinding> findings, String code, String module, Map<String, BigDecimal> operational, Map<String, BigDecimal> ledger) {
        var currencies = new LinkedHashSet<>(operational.keySet()); currencies.addAll(ledger.keySet());
        for (var currency : currencies) {
            BigDecimal difference = operational.getOrDefault(currency, BigDecimal.ZERO).subtract(ledger.getOrDefault(currency, BigDecimal.ZERO));
            if (difference.abs().compareTo(new BigDecimal("0.0100")) > 0) findings.add(new QualityFinding(code, "BLOCKING",
                "Auxiliar y mayor pendientes de conciliación", "La diferencia en moneda original es " + difference + " " + currency + ".",
                "Revisa saldos de apertura, operaciones pendientes y documentos de origen antes de cerrar.", module, 1));
        }
    }
    private static String dimensions(String alias, Long unit, Long business) { return dimensions(alias, "unit_id", unit, business); }
    private static String dimensions(String alias, String unitColumn, Long unit, Long business) {
        return (unit == null ? "" : " AND " + alias + "." + unitColumn + " = ?") + (business == null ? "" : " AND " + alias + ".business_id = ?");
    }
    private static Object[] args(Object... values) {
        var args = new ArrayList<Object>();
        for (Object value : values) if (value != null) args.add(value);
        return args.toArray();
    }
}
