package com.indice.erp.finance.reporting;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.kpis.KpiRequestAccessService;
import com.indice.erp.notifications.NotificationSignalSource;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportNotificationSource implements NotificationSignalSource {
    private final JdbcTemplate db;
    private final KpiRequestAccessService access;
    public ReportNotificationSource(JdbcTemplate db,KpiRequestAccessService access) {this.db=db;this.access=access;}
    public String module() {return "kpis";}
    public boolean supports(String type) {return List.of("automated_report_run","automated_report_rule").contains(type);}
    public boolean canConfigure(AuthSessionUser user,String event) {
        if(!List.of("kpi_report_ready","kpi_report_attention").contains(event)) return false;
        try {access.central(user,"automated-reports",null,null);return true;} catch(ResponseStatusException denied) {return false;}
    }
    public List<Signal> current(AuthSessionUser user) {
        var result=new ArrayList<Signal>();
        for(var event:List.of("kpi_report_ready","kpi_report_attention")) {
            if(!canConfigure(user,event)) continue;
            for(var row:rows(user,event,null)) if(permitted(user,row)) result.add(new Signal(
                event.equals("kpi_report_ready")?"automated_report_run":"automated_report_rule",row.id(),event,
                "kpi:"+event+":"+row.id()+":"+row.version(),"Automatic report",row.title(),"/kpis/automated-reports"));
        }
        return result;
    }
    public boolean visible(AuthSessionUser user,String type,long id,String event) {
        if(!supports(type)||!canConfigure(user,event)||!type.equals(event.equals("kpi_report_ready")?"automated_report_run":"automated_report_rule")) return false;
        return rows(user,event,id).stream().anyMatch(row->permitted(user,row));
    }
    private boolean permitted(AuthSessionUser user,Row row) {
        try {
            for(String tab:List.of("automated-reports",row.type().equals("ACCOUNTING")?"accounting-reports":"kpis")) {
                var selection=access.central(user,tab,row.unit(),row.business());
                if(!Objects.equals(selection.unitId(),row.unit())||!Objects.equals(selection.businessId(),row.business())) return false;
            }
            return true;
        } catch(ResponseStatusException denied) {return false;}
    }
    private List<Row> rows(AuthSessionUser user,String event,Long id) {
        boolean ready=event.equals("kpi_report_ready");
        var params=new ArrayList<Object>();params.add(user.companyId());params.add(user.userId());
        String sql=ready?"""
            SELECT run.id,run.report_type,run.unit_id,run.business_id,rule.title,0 version
            FROM kpi_automated_report_runs run JOIN kpi_automated_report_rules rule ON rule.company_id=run.company_id AND rule.id=run.rule_id
            WHERE run.company_id=? AND rule.created_by_user_id=?
            """:"""
            SELECT rule.id,rule.report_type,rule.unit_id,rule.business_id,rule.title,rule.version
            FROM kpi_automated_report_rules rule WHERE rule.company_id=? AND rule.created_by_user_id=?
              AND rule.status='paused' AND rule.last_error_code='REVIEW_REQUIRED'
            """;
        if(id!=null) {sql+=ready?" AND run.id=?":" AND rule.id=?";params.add(id);}
        else if(ready) sql+=" AND run.created_at>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY)";
        sql+=" ORDER BY "+(ready?"run.id":"rule.id")+" DESC LIMIT 200";
        return db.query(sql,(rs,n)->new Row(rs.getLong("id"),rs.getString("report_type"),rs.getObject("unit_id",Long.class),rs.getObject("business_id",Long.class),rs.getString("title"),rs.getInt("version")),params.toArray());
    }
    private record Row(long id,String type,Long unit,Long business,String title,int version) { }
}
