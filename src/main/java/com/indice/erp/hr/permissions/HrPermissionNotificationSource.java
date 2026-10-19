package com.indice.erp.hr.permissions;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.notifications.NotificationSignalSource;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrPermissionNotificationSource implements NotificationSignalSource {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final HrAccessService access;
    private final HrOperationalScopeService scopes;
    public HrPermissionNotificationSource(JdbcTemplate db, ModuleAccessService modules, TabPermissionAccessService tabs,
            HrAccessService access, HrOperationalScopeService scopes) {
        this.db=db; this.modules=modules; this.tabs=tabs; this.access=access; this.scopes=scopes;
    }
    public String module() { return "human_resources"; }
    public boolean supports(String type) { return "permission_request".equals(type); }
    public boolean canConfigure(AuthSessionUser user, String event) {
        if (!modules.canAccess(user,module()) || !tabs.canAccess(user,TabPermissionRequirement.one("human_resources.permissions"))) return false;
        return switch(event) {
            case "hr_permission_pending" -> access.canAccessManagementTab(user,HrAccessService.HrTab.PERMISSIONS);
            case "hr_permission_resolved" -> access.canAccessReadableTab(user.userCompanyId(),user.role(),HrAccessService.HrTab.PERMISSIONS);
            default -> false;
        };
    }
    public List<Signal> current(AuthSessionUser user) {
        var result=new ArrayList<Signal>();
        for (var event:List.of("hr_permission_pending","hr_permission_resolved")) {
            if (!canConfigure(user,event)) continue;
            var query=query(user,event,null);
            result.addAll(db.query(query.sql()+" ORDER BY r.updated_at DESC,r.id DESC LIMIT 200",(rs,n)->
                new Signal("permission_request",rs.getLong("id"),event,
                    "hr:permission:"+rs.getLong("id")+":"+rs.getString("status"),
                    "Permission request",rs.getString("request_number"),"/human-resources/permissions"),query.params().toArray()));
        }
        return result;
    }
    public boolean visible(AuthSessionUser user,String type,long id,String event) {
        if (!supports(type) || !canConfigure(user,event)) return false;
        var query=query(user,event,id);
        return !db.query(query.sql()+" LIMIT 1",(rs,n)->rs.getLong("id"),query.params().toArray()).isEmpty();
    }
    private Query query(AuthSessionUser user,String event,Long id) {
        var params=new ArrayList<Object>(); params.add(user.companyId());
        String sql="SELECT r.id,r.status,r.request_number FROM user_permission_requests r LEFT JOIN hr_users e ON e.company_id=r.company_id AND e.id=r.user_company_id WHERE r.company_id=?";
        if (event.equals("hr_permission_pending")) {
            var scope=scopes.resolve(user);
            sql+=" AND LOWER(r.status)='pending' AND r.user_company_id<>?";
            params.add(user.userCompanyId());
            sql+=scope.hrUserPredicate("e"); params.addAll(scope.hrUserParameters());
        } else {
            sql+=" AND r.user_company_id=? AND LOWER(r.status) IN ('approved','rejected')";
            params.add(user.userCompanyId());
            // Retain decision history; avoid a flood of old decisions when this feature is first enabled.
            if (id==null) sql+=" AND r.reviewed_at>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 DAY)";
        }
        if(id!=null) {sql+=" AND r.id=?";params.add(id);}
        return new Query(sql,params);
    }
    private record Query(String sql,List<Object> params) { }
}
