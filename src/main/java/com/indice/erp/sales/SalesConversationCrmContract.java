package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** CRM-owned port: only explicit chat commands select/create records; native Sales remains authoritative. */
@Service
public class SalesConversationCrmContract {
    public record Scope(Long unitId,Long businessId) { }
    public record Contact(long id,String name,String companyName,String phone,boolean phoneMatches) { @Override public String toString(){return "Contact[redacted]";} }
    public record Opportunity(long id,long contactId,String name,String stage,Long ownerMembershipId) { @Override public String toString(){return "Opportunity[redacted]";} }
    public record Flows(List<SalesAssistantContracts.Flow> items) { }
    private final JdbcTemplate db;private final SalesService sales;private final OpportunityFlowService flows;
    private final ModuleAccessService modules;private final TabPermissionAccessService tabs;
    public SalesConversationCrmContract(JdbcTemplate db,SalesService sales,OpportunityFlowService flows,ModuleAccessService modules,TabPermissionAccessService tabs){this.db=db;this.sales=sales;this.flows=flows;this.modules=modules;this.tabs=tabs;}
    public boolean contactsAllowed(AuthSessionUser a){return modules.canAccess(a,"crm")&&tabs.canAccess(a,TabPermissionRequirement.one("crm.contacts"));}
    public boolean opportunitiesAllowed(AuthSessionUser a){return modules.canAccess(a,"crm")&&tabs.canAccess(a,TabPermissionRequirement.one("crm.leads"));}
    private void permission(AuthSessionUser a,boolean opportunity,boolean write){
        if(!(opportunity?opportunitiesAllowed(a):contactsAllowed(a))||write&&!modules.companyCanAccessForMutation(a.companyId(),"crm"))throw new SecurityException("CRM authority required");
    }
    private String predicate(Scope s,List<Object> args){if(s.businessId()!=null){args.add(s.businessId());return " AND business_id=?";}if(s.unitId()!=null){args.add(s.unitId());return " AND unit_id=?";}return "";}
    public List<Contact> contacts(AuthSessionUser a,Scope scope,String q,String peer){permission(a,false,false);
        var args=new ArrayList<Object>(List.of(a.companyId()));String where=" WHERE company_id=? AND deleted_at IS NULL AND status='active'"+predicate(scope,args);
        if(q!=null&&!q.isBlank()){if(q.length()>120)throw new IllegalArgumentException("Search too long");where+=" AND (contact_person LIKE ? ESCAPE '!' OR company_name LIKE ? ESCAPE '!' OR phone LIKE ? ESCAPE '!')";String term="%"+q.replace("!","!!").replace("%","!%").replace("_","!_")+"%";args.addAll(List.of(term,term,term));}
        args.add(peer.replace("+",""));return db.query("SELECT id,contact_person,company_name,phone FROM sales_contacts"+where+" ORDER BY (REGEXP_REPLACE(phone,'[^0-9]','')=?) DESC,contact_person,id LIMIT 100",(r,n)->new Contact(r.getLong(1),Objects.toString(r.getString(2),""),r.getString(3),Objects.toString(r.getString(4),""),peer.equals(canonical(r.getString(4)))),args.toArray()).stream().sorted(Comparator.comparing(Contact::phoneMatches).reversed().thenComparing(Contact::name)).toList();
    }
    public Contact contact(AuthSessionUser a,Scope scope,long id){permission(a,false,false);var args=new ArrayList<Object>(List.of(a.companyId(),id));
        return db.query("SELECT id,contact_person,company_name,phone FROM sales_contacts WHERE company_id=? AND id=? AND deleted_at IS NULL AND status='active'"+predicate(scope,args),(r,n)->new Contact(r.getLong(1),r.getString(2),r.getString(3),r.getString(4),false),args.toArray()).stream().findFirst().orElseThrow(NoSuchElementException::new);
    }
    public List<Opportunity> opportunities(AuthSessionUser a,Scope scope,Long contact,String q){permission(a,true,false);var args=new ArrayList<Object>(List.of(a.companyId()));String where=" WHERE company_id=? AND deleted_at IS NULL AND status='active'"+predicate(scope,args);if(contact!=null){where+=" AND contact_id=?";args.add(contact);}
        if(q!=null&&!q.isBlank()){if(q.length()>120)throw new IllegalArgumentException("Search too long");where+=" AND opportunity_name LIKE ? ESCAPE '!'";args.add("%"+q.replace("!","!!").replace("%","!%").replace("_","!_")+"%");}
        return db.query("SELECT id,COALESCE(contact_id,0),opportunity_name,stage,owner_user_company_id FROM sales_opportunities"+where+" ORDER BY updated_at DESC,id DESC LIMIT 100",(r,n)->new Opportunity(r.getLong(1),r.getLong(2),r.getString(3),r.getString(4),r.getObject(5,Long.class)),args.toArray());
    }
    public Opportunity opportunity(AuthSessionUser a,Scope scope,long id){permission(a,true,false);var args=new ArrayList<Object>(List.of(a.companyId(),id));return db.query("SELECT id,COALESCE(contact_id,0),opportunity_name,stage,owner_user_company_id FROM sales_opportunities WHERE company_id=? AND id=? AND deleted_at IS NULL AND status='active'"+predicate(scope,args),(r,n)->new Opportunity(r.getLong(1),r.getLong(2),r.getString(3),r.getString(4),r.getObject(5,Long.class)),args.toArray()).stream().findFirst().orElseThrow(NoSuchElementException::new);}
    public Flows flows(AuthSessionUser a){permission(a,true,false);return new Flows(flows.assistantFlows(a.companyId()));}
    public Contact createContact(AuthSessionUser a,Scope scope,String name,String company,String email,String peer){permission(a,false,true);var p=base(a,scope);p.put("companyName",company==null||company.isBlank()?name:company);p.put("contactPerson",name);p.put("email",Objects.toString(email,""));p.put("phone",peer);p.put("source","other");
        var result=sales.create(a.companyId(),a.userId(),"contacts",p);return contact(a,scope,((Number)result.get("id")).longValue());
    }
    public Opportunity createOpportunity(AuthSessionUser a,Scope scope,long contact,String name,Long flow,String stage,String currency,BigDecimal amount){permission(a,true,true);contact(a,scope,contact);var p=base(a,scope);p.put("contactId",contact);p.put("opportunityName",name);p.put("currency",currency);p.put("estimatedValue",amount);
        if(flow!=null)p.put("flowId",flow);if(stage!=null&&!stage.isBlank())p.put("stage",stage);
        var result=sales.create(a.companyId(),a.userId(),"opportunities",p);return opportunity(a,scope,((Number)result.get("id")).longValue());
    }
    private LinkedHashMap<String,Object> base(AuthSessionUser a,Scope s){var p=new LinkedHashMap<String,Object>();p.put("unitId",s.unitId());p.put("businessId",s.businessId());p.put("status","active");p.put("ownerUserCompanyId",a.userCompanyId());p.put("ownerName",db.queryForObject("SELECT u.full_name FROM user_companies uc JOIN users u ON u.id=uc.user_id WHERE uc.company_id=? AND uc.id=?",String.class,a.companyId(),a.userCompanyId()));return p;}
    private static String canonical(String phone){try{if(phone==null||!phone.startsWith("+"))return "";var util=PhoneNumberUtil.getInstance();var p=util.parse(phone,null);return util.isValidNumber(p)?util.format(p,PhoneNumberUtil.PhoneNumberFormat.E164):"";}catch(Exception e){return "";}}
}
