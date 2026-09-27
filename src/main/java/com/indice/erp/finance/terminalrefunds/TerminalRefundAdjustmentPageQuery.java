package com.indice.erp.finance.terminalrefunds;

import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundAdjustmentPageQuery {
    private final JdbcTemplate jdbc; private final TerminalRefundAdjustmentMapper mapper;
    public TerminalRefundAdjustmentPageQuery(JdbcTemplate jdbc, TerminalRefundAdjustmentMapper mapper) {
        this.jdbc = jdbc; this.mapper = mapper;
    }
    List<TerminalRefundAdjustment> page(long companyId, String state, Long beforeId, int limit) {
        var params = new ArrayList<Object>(); params.add(companyId);
        var where = new StringBuilder(" WHERE adjustment.company_id=?");
        if ("ATTENTION".equals(state)) where.append(" AND adjustment.state IN ('PENDING_REVIEW','FAILED','RECONCILIATION_REQUIRED')");
        else if (state != null) { where.append(" AND adjustment.state=?"); params.add(state); }
        if (beforeId != null) { where.append(" AND adjustment.id<?"); params.add(beforeId); }
        params.add(limit + 1);
        return jdbc.query(TerminalRefundAdjustmentSql.SELECT + where
            + " ORDER BY adjustment.id DESC LIMIT ?", mapper::map, params.toArray());
    }
    long count(long companyId, String state) {
        if ("ATTENTION".equals(state)) return count("""
            SELECT COUNT(*) FROM pos_terminal_refund_adjustments
            WHERE company_id=? AND state IN ('PENDING_REVIEW','FAILED','RECONCILIATION_REQUIRED')
            """, companyId);
        if (state == null) return count("SELECT COUNT(*) FROM pos_terminal_refund_adjustments WHERE company_id=?", companyId);
        return count("SELECT COUNT(*) FROM pos_terminal_refund_adjustments WHERE company_id=? AND state=?", companyId, state);
    }
    private long count(String sql, Object... params) {
        var value = jdbc.queryForObject(sql, Long.class, params); return value == null ? 0 : value;
    }
}
