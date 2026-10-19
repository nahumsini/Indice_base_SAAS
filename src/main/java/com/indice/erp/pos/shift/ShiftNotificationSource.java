package com.indice.erp.pos.shift;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.notifications.NotificationSignalSource;
import com.indice.erp.pos.PosAccessService;
import com.indice.erp.pos.PosSqlSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ShiftNotificationSource implements NotificationSignalSource {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final PosAccessService access;
    public ShiftNotificationSource(JdbcTemplate db,ModuleAccessService modules,TabPermissionAccessService tabs,PosAccessService access) {
        this.db=db;this.modules=modules;this.tabs=tabs;this.access=access;
    }
    public String module() { return "point_of_sale"; }
    public boolean supports(String type) { return "cash_shift".equals(type); }
    public boolean canConfigure(AuthSessionUser user,String event) {
        return Set.of("pos_shift_opened","pos_shift_closed","pos_shift_difference").contains(event)
            && modules.canAccess(user,"pos") && tabs.canAccess(user,TabPermissionRequirement.one("pos.cortes")) && access.resolveContext(user).isPresent();
    }
    public List<Signal> current(AuthSessionUser user) {
        var result=new ArrayList<Signal>();
        for(var event:List.of("pos_shift_opened","pos_shift_closed","pos_shift_difference")) {
            if(!canConfigure(user,event)) continue;
            var query=query(user,event,null);
            result.addAll(db.query(query.sql()+" ORDER BY shift.id DESC LIMIT 200",(rs,n)->
                new Signal("cash_shift",rs.getLong("id"),event,"pos:shift:"+rs.getLong("id")+":"+event,
                    "Cash shift", "#"+rs.getLong("id"),"/point-of-sale/cortes"),query.params().toArray()));
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
        var params=new ArrayList<Object>(); params.add(user.companyId());
        String sql="SELECT shift.id FROM pos_shifts shift WHERE shift.company_id=? AND shift.deleted_at IS NULL AND "+PosSqlSupport.scopePredicate("shift",context.scope());
        PosSqlSupport.appendScopeParams(params,context.scope());
        if(!Set.of("root","superadmin","admin","owner","dueno","manager","approver").contains(user.role())) {
            sql+=" AND shift.opened_by_user_id=?";params.add(user.userId());
        }
        sql+=switch(event) {
            case "pos_shift_opened"->" AND shift.status IN ('OPEN','CLOSING')";
            case "pos_shift_difference"->" AND shift.status='CLOSED' AND COALESCE(shift.over_short_amount,0)<>0";
            default->" AND shift.status='CLOSED' AND COALESCE(shift.over_short_amount,0)=0";
        };
        if(id!=null) {sql+=" AND shift.id=?";params.add(id);}
        else if(!event.equals("pos_shift_opened")) sql+=" AND shift.closed_at>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY)";
        return new Query(sql,params);
    }
    private record Query(String sql,List<Object> params) { }
}
