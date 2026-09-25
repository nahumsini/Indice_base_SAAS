package com.indice.erp.finance.reporting;

import com.indice.erp.pos.PosApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Finance owns the boundary between an operational void and a posted reversal. */
@Service
public class PosReturnAccountingGuard {
    private final JdbcTemplate jdbc;
    public PosReturnAccountingGuard(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void lockAndRequireUnpostedSale(long company, long sale) {
        jdbc.queryForList("SELECT id FROM companies WHERE id = ? FOR UPDATE", company);
        int posted = jdbc.queryForObject("""
            SELECT COUNT(*) FROM finance_journal_entries
            WHERE company_id = ? AND source_module = 'sales' AND source_type = 'SALE'
              AND source_id = ? AND status = 'POSTED'
            """, Integer.class, company, String.valueOf(sale));
        int closed = jdbc.queryForObject("""
            SELECT COUNT(*) FROM sales_records sale JOIN finance_accounting_periods period
              ON period.company_id = sale.company_id
              AND sale.sale_date BETWEEN period.period_start AND period.period_end
            WHERE sale.company_id = ? AND sale.id = ? AND period.status = 'CLOSED'
            """, Integer.class, company, sale);
        if (posted > 0 || closed > 0) throw PosApiException.conflict(
                "La venta tiene contabilidad registrada o un periodo cerrado. Requiere una reversión financiera; no se puede anular desde el turno.");
    }
}
