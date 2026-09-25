package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PosReturnRepository {
    private final JdbcTemplate jdbc;
    public PosReturnRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Optional<PosReturnRecord> find(PosContext context, String reference) {
        var args = new ArrayList<Object>();
        args.add(context.companyId()); args.add(reference);
        PosSqlSupport.appendScopeParams(args, context.scope());
        return jdbc.query(PosReturnSql.FIND + PosSqlSupport.scopePredicate("t", context.scope()),
            new PosReturnRowMapper(), args.toArray()).stream().findFirst();
    }
}
