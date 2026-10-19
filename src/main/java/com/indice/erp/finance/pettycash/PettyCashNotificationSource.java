package com.indice.erp.finance.pettycash;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.notifications.NotificationSignalSource;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PettyCashNotificationSource implements NotificationSignalSource {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final FinanceAccessService access;
    public PettyCashNotificationSource(JdbcTemplate db,ModuleAccessService modules,TabPermissionAccessService tabs,FinanceAccessService access) {
        this.db=db;this.modules=modules;this.tabs=tabs;this.access=access;
    }
    public String module() { return "petty_cash"; }
    public boolean supports(String type) { return Set.of("fund_balance","fund_receipt").contains(type); }
    public boolean canConfigure(AuthSessionUser user,String event) {
        String tab=switch(event) {case "petty_cash_low_balance"->"cash";case "petty_cash_receipt_pending"->"control";default->null;};
        return tab!=null && modules.canAccess(user,module()) && tabs.canAccess(user,TabPermissionRequirement.one(module()+"."+tab)) && access.resolveContext(user).isPresent();
    }
    public List<Signal> current(AuthSessionUser user) {
        var result=new ArrayList<Signal>();
        for(var event:List.of("petty_cash_low_balance","petty_cash_receipt_pending")) {
            if(!canConfigure(user,event)) continue;
            var query=query(user,event,null);
            result.addAll(db.query(query.sql()+" ORDER BY signal_id DESC LIMIT 200",(rs,n)->
                new Signal(event.equals("petty_cash_low_balance")?"fund_balance":"fund_receipt",rs.getLong("signal_id"),event,
                    "fund:"+event+":"+rs.getLong("signal_id"),"Fund needs attention",rs.getString("reference"),
                    "/petty-cash/"+(event.equals("petty_cash_low_balance")?"cash":"control")+"?fundId="+rs.getLong("fund_id")),query.params().toArray()));
        }
        return result;
    }
    public boolean visible(AuthSessionUser user,String type,long id,String event) {
        if(!supports(type) || !canConfigure(user,event) || !type.equals(event.equals("petty_cash_low_balance")?"fund_balance":"fund_receipt")) return false;
        var query=query(user,event,id);
        return !db.query(query.sql()+" LIMIT 1",(rs,n)->rs.getLong("signal_id"),query.params().toArray()).isEmpty();
    }
    private Query query(AuthSessionUser user,String event,Long id) {
        var context=access.resolveContext(user).orElseThrow();
        var params=new ArrayList<Object>(); params.add(user.companyId());
        boolean balance=event.equals("petty_cash_low_balance");
        String sql=balance
            ? "SELECT fund.id signal_id,fund.id fund_id,fund.name reference FROM finance_petty_cash_funds fund WHERE fund.company_id=? AND fund.status='LOW_BALANCE'"
            : "SELECT receipt.id signal_id,fund.id fund_id,fund.name reference FROM finance_petty_cash_settlement_lines receipt JOIN finance_petty_cash_funds fund ON fund.id=receipt.petty_cash_fund_id AND fund.company_id=receipt.company_id WHERE receipt.company_id=? AND receipt.deleted_at IS NULL AND receipt.status='RECEIPT_ATTACHED' AND fund.status<>'CLOSED'";
        sql+=" AND fund.deleted_at IS NULL AND "+FinanceSqlSupport.scopePredicate("fund",context.scope());
        switch(context.scope().type()) {case UNIT_HEADQUARTERS->params.add(context.scope().unitId());case BUSINESS_OFFICE->params.add(context.scope().businessId());default->{} }
        if(!Set.of("root","superadmin","admin","owner","dueno").contains(user.role())) {sql+=" AND fund.responsible_user_id=?";params.add(user.userId());}
        if(id!=null) {sql+=balance?" AND fund.id=?":" AND receipt.id=?";params.add(id);}
        return new Query(sql,params);
    }
    private record Query(String sql,List<Object> params) { }
}
