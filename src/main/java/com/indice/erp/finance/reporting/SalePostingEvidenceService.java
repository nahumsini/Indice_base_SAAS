package com.indice.erp.finance.reporting;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Finance-owned, limited read contract: evidence of sale journals, never posting readiness. */
@Service
public class SalePostingEvidenceService {
    public record Evidence(String state,String number,LocalDate date,String reversalNumber) { }
    private final JdbcTemplate db;
    public SalePostingEvidenceService(JdbcTemplate db) { this.db=db; }
    public Map<Long,Evidence> read(long company,List<Long> authorizedSaleIds) {
        if(authorizedSaleIds.size()>200) throw new IllegalArgumentException("At most 200 sale IDs");
        var result=new LinkedHashMap<Long,Evidence>();
        authorizedSaleIds.forEach(id->result.put(id,new Evidence("UNPOSTED",null,null,null)));
        if(authorizedSaleIds.isEmpty()) return result;
        var args=new java.util.ArrayList<Object>(); args.add(company); args.addAll(authorizedSaleIds);
        db.query("""
            SELECT sale.id, entry.entry_number, entry.entry_date,
              (SELECT reversal.entry_number FROM finance_journal_entries reversal
               WHERE reversal.company_id=entry.company_id AND reversal.reversal_of_entry_id=entry.id
                 AND reversal.status='POSTED' ORDER BY reversal.id DESC LIMIT 1) reversal_number
            FROM sales_records sale JOIN finance_journal_entries entry
              ON entry.company_id=sale.company_id AND entry.source_module='sales' AND entry.source_type='SALE'
              AND entry.source_id=CAST(sale.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AND entry.status='POSTED'
            WHERE sale.company_id=? AND sale.id IN (
            """+String.join(",",java.util.Collections.nCopies(authorizedSaleIds.size(),"?"))+") ORDER BY entry.id",
            (org.springframework.jdbc.core.RowCallbackHandler) r->result.put(r.getLong("id"),new Evidence(r.getString("reversal_number")==null?"POSTED":"REVERSED",
                r.getString("entry_number"),r.getObject("entry_date",LocalDate.class),r.getString("reversal_number"))),args.toArray());
        return Map.copyOf(result);
    }
}
