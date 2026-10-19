package com.indice.erp.finance.receivables;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.notifications.NotificationSignalSource;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ReceivablesNotificationSource implements NotificationSignalSource {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final FinanceAccessService access;
    private final FinanceBusinessTimeZoneResolver zones;
    private final Clock clock;
    public ReceivablesNotificationSource(JdbcTemplate db,ModuleAccessService modules,TabPermissionAccessService tabs,
            FinanceAccessService access,FinanceBusinessTimeZoneResolver zones,Clock clock) {
        this.db=db;this.modules=modules;this.tabs=tabs;this.access=access;this.zones=zones;this.clock=clock;
    }
    public String module() {return "receivables";}
    public boolean supports(String type) {return "receivable_installment".equals(type);}
    public boolean canConfigure(AuthSessionUser user,String event) {
        return Set.of("receivable_due_today","receivable_overdue").contains(event) && modules.canAccess(user,module())
            && tabs.canAccess(user,TabPermissionRequirement.one("receivables.accounts-receivable")) && access.resolveContext(user).isPresent();
    }
    public List<Signal> current(AuthSessionUser user) {
        var result=new ArrayList<Signal>();
        for(var event:List.of("receivable_due_today","receivable_overdue")) {
            if(!canConfigure(user,event)) continue;
            var query=query(user,event,null);
            result.addAll(db.query(query.sql()+" ORDER BY installment.due_date,installment.id LIMIT 200",(rs,n)->
                new Signal("receivable_installment",rs.getLong("id"),event,"receivable:"+rs.getLong("id")+":"+event+":"+rs.getDate("due_date"),
                    "Collection needs attention",rs.getString("sale_number"),"/receivables/accounts-receivable"),query.params().toArray()));
        }
        return result;
    }
    public boolean visible(AuthSessionUser user,String type,long id,String event) {
        if(!supports(type)||!canConfigure(user,event)) return false;
        var query=query(user,event,id);
        return !db.query(query.sql()+" LIMIT 1",(rs,n)->rs.getLong("id"),query.params().toArray()).isEmpty();
    }
    private Query query(AuthSessionUser user,String event,Long id) {
        var context=access.resolveContext(user).orElseThrow();
        var params=new ArrayList<Object>();params.add(user.companyId());
        String sql="""
            SELECT installment.id,installment.due_date,account.sale_number FROM finance_receivable_installments installment
            JOIN finance_receivable_accounts account ON account.company_id=installment.company_id AND account.id=installment.receivable_id
            WHERE installment.company_id=? AND account.deleted_at IS NULL
              AND account.status NOT IN ('CANCELLED','PAID','CLOSED') AND account.balance_amount>0
              AND installment.status NOT IN ('CANCELLED','PAID') AND installment.balance_amount>0
            """;
        sql+=" AND "+FinanceSqlSupport.scopePredicate("account",context.scope());
        switch(context.scope().type()) {case UNIT_HEADQUARTERS->params.add(context.scope().unitId());case BUSINESS_OFFICE->params.add(context.scope().businessId());default->{} }
        sql+=" AND installment.due_date "+(event.equals("receivable_due_today")?"=":"<")+" ?";
        params.add(LocalDate.now(clock.withZone(zones.resolve(user.companyId()))));
        if(id!=null){sql+=" AND installment.id=?";params.add(id);}
        return new Query(sql,params);
    }
    private record Query(String sql,List<Object> params) { }
}
