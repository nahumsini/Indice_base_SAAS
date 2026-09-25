package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.FinanceApiException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundAdjustmentQuery {
    private final JdbcTemplate jdbc;
    private final TerminalRefundAdjustmentMapper mapper;
    public TerminalRefundAdjustmentQuery(JdbcTemplate jdbc, TerminalRefundAdjustmentMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }
    public List<TerminalRefundAdjustment> list(long companyId, String state) {
        var filter = state == null ? "" : " AND adjustment.state=?";
        var sql = TerminalRefundAdjustmentSql.SELECT + " WHERE adjustment.company_id=?" + filter
            + " ORDER BY adjustment.created_at DESC,adjustment.id DESC";
        return state == null ? jdbc.query(sql, mapper::map, companyId)
            : jdbc.query(sql, mapper::map, companyId, state);
    }

    public TerminalRefundAdjustment lock(long companyId, long id) {
        return jdbc.query(TerminalRefundAdjustmentSql.SELECT
            + " WHERE adjustment.company_id=? AND adjustment.id=? FOR UPDATE",
            mapper::map, companyId, id).stream().findFirst()
            .orElseThrow(() -> FinanceApiException.notFound("Terminal refund adjustment not found."));
    }

    public TerminalRefundAdjustment get(long companyId, long id) {
        return jdbc.query(TerminalRefundAdjustmentSql.SELECT
            + " WHERE adjustment.company_id=? AND adjustment.id=?", mapper::map,
            companyId, id).stream().findFirst()
            .orElseThrow(() -> FinanceApiException.notFound("Terminal refund adjustment not found."));
    }
}
