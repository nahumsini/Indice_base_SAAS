package com.indice.erp.kpis.currency;

import com.indice.erp.hr.HrOperationalScope;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;

/** Read contract: direct Treasury collections, captured POS non-credit payments and Cartera payments.
 * Treasury settlement of a POS/credit payment is not another collection. IDs always identify Sales. */
final class SalesCollectionAmounts {
    static List<KpiMoneyAmount> load(JdbcTemplate jdbc, long company, LocalDate from, LocalDate to,
            List<Long> ids, boolean restrict, ZoneId zone, HrOperationalScope scope) {
        if (scope == null || scope.type() == HrOperationalScope.Type.UNASSIGNED || (restrict && (ids == null || ids.isEmpty()))) return List.of();
        var sources = List.of(
            new Source("finance_payment_account_movements p JOIN sales_records s ON s.company_id = p.company_id AND s.id = p.source_id",
                "p.available_delta", "p.occurred_at", true, " AND p.source_module = 'SALES' AND p.source_type IN ('SALE_COLLECTION', 'SALE_COLLECTION_REVERSAL')"),
            new Source("pos_payments p JOIN pos_tickets t ON t.company_id = p.company_id AND t.id = p.ticket_id JOIN sales_records s ON s.company_id = t.company_id AND s.id = t.sales_record_id",
                "p.amount", "p.paid_at", true, " AND t.deleted_at IS NULL AND t.status = 'COMPLETED' AND p.status = 'CAPTURED' AND p.payment_method <> 'CREDIT'"),
            new Source("finance_receivable_payments p JOIN finance_receivable_accounts a ON a.company_id = p.company_id AND a.id = p.receivable_id JOIN sales_records s ON s.company_id = a.company_id AND s.id = a.sales_record_id",
                "p.amount", "p.payment_date", false, " AND a.deleted_at IS NULL")
        );
        var result = new ArrayList<KpiMoneyAmount>();
        for (var source : sources) {
            var params = new ArrayList<Object>(); params.add(company);
            String sql = "SELECT " + source.amount + " amount, p.currency_code currency FROM " + source.table
                + " WHERE p.company_id = ?" + source.filter;
            if (from != null) { sql += " AND " + source.date + " >= ?"; params.add(source.timestamp ? Timestamp.from(from.atStartOfDay(zone).toInstant()) : from); }
            if (to != null) { sql += " AND " + source.date + " < ?"; params.add(source.timestamp ? Timestamp.from(to.plusDays(1).atStartOfDay(zone).toInstant()) : to.plusDays(1)); }
            if (ids != null && !ids.isEmpty()) {
                sql += " AND s.id IN (" + String.join(",", java.util.Collections.nCopies(ids.size(), "?")) + ")";
                params.addAll(ids);
            }
            sql += scope.assignmentPredicate("s.unit_id", "s.business_id", "s.company_id");
            params.addAll(scope.assignmentParameters());
            result.addAll(jdbc.query(sql, (rs, row) -> new KpiMoneyAmount(rs.getBigDecimal("amount"), rs.getString("currency")), params.toArray()));
        }
        return result;
    }
    private record Source(String table, String amount, String date, boolean timestamp, String filter) {}
    private SalesCollectionAmounts() {}
}
