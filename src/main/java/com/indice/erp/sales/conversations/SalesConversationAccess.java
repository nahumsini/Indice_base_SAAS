package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import static org.springframework.http.HttpStatus.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Native permission ceilings plus explicit per-channel restrictions. No role implies chat access. */
@Service
public class SalesConversationAccess {
    public record Scope(Long unit,Long business) {
        public boolean contains(Scope target){return business!=null?business.equals(target.business):unit!=null?unit.equals(target.unit):true;}
    }
    private final SessionAuthService auth;private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;private final JdbcTemplate db;private final ObjectMapper json;
    public SalesConversationAccess(SessionAuthService auth,ModuleAccessService modules,TabPermissionAccessService tabs,JdbcTemplate db,ObjectMapper json){
        this.auth=auth;this.modules=modules;this.tabs=tabs;this.db=db;this.json=json;
    }
    public AuthSessionUser current(AuthSessionUser requested,boolean write) {
        var a=auth.scheduledActor(requested.userId(),requested.companyId()).orElseThrow(()->denied());
        require(!auth.isPublicDemoCompany(a.companyId())&&modules.canAccess(a,"crm"),FORBIDDEN,"conversation_access_denied");
        if(write)require(modules.companyCanAccessForMutation(a.companyId(),"crm"),FORBIDDEN,"conversation_access_denied");
        return a;
    }
    public Scope scope(AuthSessionUser a) {
        var scope=db.query("SELECT wp.unit_id,wp.business_id FROM user_companies uc LEFT JOIN user_work_profiles wp ON wp.company_id=uc.company_id AND wp.user_company_id=uc.id WHERE uc.company_id=? AND uc.id=? AND uc.user_id=? AND uc.status='active'",
            (r,n)->new Scope(r.getObject(1,Long.class),r.getObject(2,Long.class)),a.companyId(),a.userCompanyId(),a.userId()).stream().findFirst().orElseThrow(()->denied());
        require(scopeAvailable(a.companyId(),scope),FORBIDDEN,"conversation_scope_denied");return scope;
    }
    public boolean scopeAvailable(long company,Scope scope){
        if(scope.unit()!=null&&db.queryForObject("SELECT COUNT(*) FROM units WHERE company_id=? AND id=? AND status='active'",Integer.class,company,scope.unit())!=1)return false;
        return scope.business()==null||db.queryForObject("SELECT COUNT(*) FROM businesses b LEFT JOIN units u ON u.company_id=b.company_id AND u.id=b.unit_id AND u.status='active' WHERE b.company_id=? AND b.id=? AND b.status='active' AND (b.unit_id IS NULL OR u.id IS NOT NULL) AND (? IS NULL OR b.unit_id=?)",Integer.class,company,scope.business(),scope.unit(),scope.unit())==1;
    }
    public void manager(AuthSessionUser a) {
        require(tabs.canAccess(a,TabPermissionRequirement.one("crm.conversations_manage"))&&
            tabs.canAccess(a,TabPermissionRequirement.one("config_center.users"))&&
            Set.of("root","superadmin","admin","owner","dueno","dueño").contains(a.role()),FORBIDDEN,"conversation_management_denied");
    }
    public void tab(AuthSessionUser a){require(tabs.canAccess(a,TabPermissionRequirement.one("crm.conversations")),FORBIDDEN,"conversation_access_denied");}
    public Set<Capability> capabilities(AuthSessionUser requested,String connection) {
        var a=current(requested,false);tab(a);var actorScope=scope(a);
        var rows=db.query("SELECT m.capabilities,m.unit_id,m.business_id,c.unit_id AS connection_unit,c.business_id AS connection_business FROM sales_wa_members m JOIN sales_wa_connections c ON c.company_id=m.company_id AND c.id=m.connection_id WHERE m.company_id=? AND m.connection_id=? AND m.membership_id=? AND m.active=1 AND c.status<>'REVOKED'",
            (r,n)->{
                if(!scopeAvailable(a.companyId(),new Scope(r.getObject("connection_unit",Long.class),r.getObject("connection_business",Long.class)))||!Objects.equals(actorScope.unit(),r.getObject("unit_id",Long.class))||!Objects.equals(actorScope.business(),r.getObject("business_id",Long.class))||
                    !actorScope.contains(new Scope(r.getObject("connection_unit",Long.class),r.getObject("connection_business",Long.class))))return Set.<Capability>of();
                try{return json.readValue(r.getString("capabilities"),json.getTypeFactory().constructCollectionType(EnumSet.class,Capability.class));}
                catch(Exception e){return Set.<Capability>of();}
            },a.companyId(),connection,a.userCompanyId());
        return rows.isEmpty()?Set.of():rows.getFirst();
    }
    public Set<Capability> read(AuthSessionUser a,Conversation c) {
        var caps=capabilities(a,c.connectionId());
        boolean visible=c.assigneeMembershipId()==null?caps.contains(Capability.TAKE)&&caps.contains(Capability.READ_OWN):
            caps.contains(Capability.READ_ALL)||Objects.equals(c.assigneeMembershipId(),a.userCompanyId())&&caps.contains(Capability.READ_OWN);
        require(visible,NOT_FOUND,"conversation_unavailable");return caps;
    }
    public void operate(AuthSessionUser a,Conversation c,Capability capability,boolean owner) {
        var caps=read(a,c);require(caps.contains(capability)&&(!owner||Objects.equals(c.assigneeMembershipId(),a.userCompanyId())),FORBIDDEN,"conversation_action_denied");
    }
    public static void require(boolean valid,org.springframework.http.HttpStatus status,String code){if(!valid)throw new ResponseStatusException(status,code);}
    public static ResponseStatusException denied(){return new ResponseStatusException(FORBIDDEN,"conversation_access_denied");}
}
