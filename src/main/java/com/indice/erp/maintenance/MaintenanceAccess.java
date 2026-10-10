package com.indice.erp.maintenance;

import com.indice.erp.auth.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.hr.*;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.maintenance.MaintenanceDtos.*;

@Service
public class MaintenanceAccess {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final HrOperationalScopeService scopes;
    private final JdbcTemplate jdbc;
    public MaintenanceAccess(SessionAuthService auth,SessionCsrfService csrf,ModuleAccessService modules,
        TabPermissionAccessService tabs,HrOperationalScopeService scopes,JdbcTemplate jdbc){
        this.auth=auth;this.csrf=csrf;this.modules=modules;this.tabs=tabs;this.scopes=scopes;this.jdbc=jdbc;
    }
    public AuthSessionUser require(HttpSession session,String token,boolean write,String... required){
        var actor=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        actor=current(actor);requireTabs(actor,required);
        if(write)try{csrf.requireCsrf(session,token);}catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
        return actor;
    }
    public AuthSessionUser current(AuthSessionUser actor){
        var members=jdbc.query("SELECT id,role FROM user_companies WHERE company_id=? AND user_id=? AND status='active' ORDER BY id LIMIT 1",
            (r,n)->new AuthSessionUser(actor.userId(),actor.companyId(),r.getLong("id"),actor.userName(),r.getString("role")),actor.companyId(),actor.userId());
        if(members.isEmpty())throw new ResponseStatusException(HttpStatus.FORBIDDEN);return members.getFirst();
    }
    public void requireTabs(AuthSessionUser actor,String... required){
        if(!modules.canAccess(actor,"maintenance")||!tabs.canAccess(actor,new TabPermissionRequirement(Arrays.stream(required).map(t->"maintenance."+t).toList())))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    public AuthSessionUser lock(AuthSessionUser actor,String tab){
        jdbc.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());
        var current=current(actor);
        if(!modules.companyCanAccessForMutation(actor.companyId(),"maintenance"))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        requireTabs(current,tab);return current;
    }
    public boolean ownerAccess(AuthSessionUser actor,String module,String tab){return modules.canAccess(actor,module)&&tabs.canAccess(actor,new TabPermissionRequirement(List.of(module+"."+tab)));}
    public static boolean manager(AuthSessionUser actor){return Set.of("root","superadmin","admin","owner","dueno","manager","approver").contains(actor.role().toLowerCase(Locale.ROOT));}
    public static boolean administrator(AuthSessionUser actor){return Set.of("root","superadmin","admin","owner","dueno").contains(actor.role().toLowerCase(Locale.ROOT));}
    public static void manage(AuthSessionUser actor){if(!manager(actor))throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
    public static void administrate(AuthSessionUser actor){if(!administrator(actor))throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
    public Assignment assignment(AuthSessionUser actor){
        var rows=jdbc.query("SELECT wp.unit_id,wp.business_id FROM user_companies uc LEFT JOIN user_work_profiles wp ON wp.company_id=uc.company_id AND wp.user_company_id=uc.id WHERE uc.company_id=? AND uc.user_id=? AND uc.status='active' ORDER BY uc.id LIMIT 1",
            (r,n)->new Assignment(r.getObject(1,Long.class),r.getObject(2,Long.class)),actor.companyId(),actor.userId());
        return rows.isEmpty()?new Assignment(null,null):rows.getFirst();
    }
    public HrOperationalScope scope(AuthSessionUser actor,boolean asset){
        if(manager(actor))return scopes.resolve(actor);
        if(!asset)return HrOperationalScope.unassigned();
        var a=assignment(actor);return a.businessId()!=null?HrOperationalScope.businessOffice(a.unitId(),a.businessId()):HrOperationalScope.unitHeadquarters(a.unitId());
    }
    public record Filter(String sql,List<Object> args) {}
    public Filter filter(AuthSessionUser actor,String alias,String kind){
        if(!manager(actor)&&!kind.equals("ASSET"))return new Filter(" AND "+alias+(kind.equals("REQUEST")?".requester_id=?":".assignee_id=?"),List.of(actor.userId()));
        var scope=scope(actor,true);return new Filter(scope.assignmentPredicate(alias+".unit_id",alias+".business_id",alias+".company_id"),scope.assignmentParameters());
    }
    public void validateAssignment(AuthSessionUser actor,Long unit,Long business){
        manage(actor);
        if(unit!=null&&jdbc.queryForObject("SELECT COUNT(*) FROM units WHERE id=? AND company_id=?",Long.class,unit,actor.companyId())!=1)throw new IllegalArgumentException("maintenance_unit_invalid");
        if(business!=null&&jdbc.queryForObject("SELECT COUNT(*) FROM businesses WHERE id=? AND company_id=? AND (? IS NULL OR unit_id=?)",Long.class,business,actor.companyId(),unit,unit)!=1)throw new IllegalArgumentException("maintenance_business_invalid");
        scopes.requireAssignmentInScope(actor,unit,business);
    }
    public Page<Choice> organization(AuthSessionUser actor,boolean business,Long unit,String search,int page,int size){
        manage(actor);var scope=scopes.resolve(actor);var args=new ArrayList<Object>(List.of(actor.companyId(),"%"+MaintenanceRepository.escape(search)+"%"));
        String table=business?"businesses":"units",where=" WHERE company_id=? AND name LIKE ? AND status='active'";
        if(business&&unit!=null){where+=" AND unit_id=?";args.add(unit);}
        if(scope.type()==HrOperationalScope.Type.UNASSIGNED)where+=" AND 1=0";
        else if(!scope.isCorporateOffice()){
            if(business&&scope.type()==HrOperationalScope.Type.BUSINESS_OFFICE){where+=" AND id=?";args.add(scope.businessId());}
            else{where+=business?" AND unit_id=?":" AND id=?";args.add(scope.unitId());}
        }
        long total=jdbc.queryForObject("SELECT COUNT(*) FROM "+table+where,Long.class,args.toArray());args.add(size);args.add((page-1)*size);
        return new Page<>(jdbc.query("SELECT id,name FROM "+table+where+" ORDER BY name,id LIMIT ? OFFSET ?",(r,n)->new Choice(r.getLong(1),r.getString(2)),args.toArray()),total,page,size);
    }
    public void assignee(AuthSessionUser actor,Long user,Long unit,Long business){
        if(user==null)return;
        if(jdbc.queryForObject("SELECT COUNT(*) FROM maintenance_technicians WHERE company_id=? AND user_id=? AND active=0",Long.class,actor.companyId(),user)>0)throw new IllegalArgumentException("maintenance_assignee_inactive");
        var users=jdbc.query("SELECT uc.id,uc.role,u.full_name FROM user_companies uc JOIN users u ON u.id=uc.user_id LEFT JOIN user_work_profiles wp ON wp.company_id=uc.company_id AND wp.user_company_id=uc.id WHERE uc.company_id=? AND uc.user_id=? AND uc.status='active' AND (? IS NULL OR wp.unit_id=?) AND (? IS NULL OR wp.business_id=?) ORDER BY uc.id LIMIT 1",
            (r,n)->new AuthSessionUser(user,actor.companyId(),r.getLong("id"),r.getString("full_name"),r.getString("role")),actor.companyId(),user,unit,unit,business,business);
        if(users.isEmpty())throw new IllegalArgumentException("maintenance_assignee_invalid");
        requireTabs(users.getFirst(),"orders");
    }
}
