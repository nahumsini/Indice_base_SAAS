package com.indice.erp.hr.assistant;

import static com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.hr.incentives.HrIncentiveService;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAssistantIncentivesService {
    public static final Set<String> ACTIONS=Set.of("create_hr_incentive","cancel_hr_incentive");
    private final HrIncentiveService owner;
    private final HrOperationalScopeService scopes;
    private final JdbcTemplate jdbc;
    public HrAssistantIncentivesService(HrIncentiveService owner,HrOperationalScopeService scopes,JdbcTemplate jdbc){this.owner=owner;this.scopes=scopes;this.jdbc=jdbc;}
    public IncentiveView detail(AuthSessionUser user,long id) {
        var row=owner.getIncentive(user,id);
        var audience=owner.assistantAudience(user,id);
        if(audience.isEmpty()&&!scopes.resolve(user).isCorporateOffice())throw new NoSuchElementException("Incentive not found in the authorized scope.");
        for(var target:audience)requireTarget(user,target.type(),target.userCompanyId(),target.unitId(),target.businessId());
        var applications=owner.assistantSavedApplications(user,id).stream().map(a->new IncentiveApplication(a.userCompanyId(),name(user,a.userCompanyId()),a.amount(),a.currency(),a.exchangeRate(),a.status())).toList();
        return view(row,applications);
    }
    public Page<IncentiveView> list(AuthSessionUser user,PageRequest request) {
        var window=HrAssistantPages.window(user,"list_hr_incentives",request);
        if(request!=null&&(request.unitId()!=null||request.businessId()!=null))throw new IllegalArgumentException("Incentives follow their audience scope; organizational filters are not supported.");
        var filters=new LinkedHashMap<String,String>();if(request!=null){if(request.query()!=null)filters.put("search",request.query());if(request.status()!=null)filters.put("status",request.status());}
        var result=owner.listIncentives(user,filters);var visible=new ArrayList<IncentiveView>();
        if(result.get("rows") instanceof List<?> rows)for(var item:rows) {
            var row=(Map<?,?>)item;
            try {visible.add(detail(user,((Number)row.get("id")).longValue()));}
            catch(com.indice.erp.hr.HrAccessDeniedException|NoSuchElementException ignored) { }
        }
        int start=(int)Math.min((long)(window.page()-1)*window.size(),visible.size());
        return window.result(visible.subList(start,Math.min(start+window.size(),visible.size())),visible.size());
    }
    public Prepared prepare(AuthSessionUser user,String action,Change request,HrAssistantService views) {
        boolean create=action.equals("create_hr_incentive");
        if(!ACTIONS.contains(action)||request==null||(request.incentive()!=null||request.payroll()!=null)!=create||(request.id()==null)!=create||request.id()!=null&&request.id()<=0
            ||request.attendance()!=null||request.payroll()!=null||request.employee()!=null||request.employees()!=null||request.asset()!=null||request.announcement()!=null||request.termination()!=null||request.assignment()!=null||request.record()!=null||request.permission()!=null)throw new IllegalArgumentException("Invalid incentive action fields.");
        var before=new Result(List.of(),null,null);IncentiveView after;IncentiveChange normalized=null;
        if(create) {
            var input=request.incentive();
            if(input.currency()==null||!input.currency().matches("[A-Z]{3}")||input.startDate()==null||!Set.of("all","employees","units","businesses").contains(input.scopeType()==null?"":input.scopeType()))throw new IllegalArgumentException("Explicit incentive currency, start date and audience required.");
            if(input.name()==null||input.name().isBlank()||input.name().length()>160||input.amount()==null||input.amount().signum()<=0||input.amount().compareTo(new BigDecimal("999999999.99"))>0)throw new IllegalArgumentException("Valid incentive name and amount required.");
            if(input.status()!=null&&!Set.of("active","scheduled","paused").contains(input.status()))throw new IllegalArgumentException("Unsupported incentive status.");
            if(input.type()!=null&&!Set.of("manual","kpi").contains(input.type()))throw new IllegalArgumentException("Unsupported incentive type.");
            if(input.applicationMode()!=null&&!Set.of("next_payroll","specific_date").contains(input.applicationMode()))throw new IllegalArgumentException("Unsupported application mode.");
            validateAudience(user,input);
            var draft=owner.validateAssistantCreate(user,payload(input));
            if(draft.targets().size()>500)throw new IllegalArgumentException("Use an explicit audience of at most 500 employees for one confirmed incentive.");
            var applications=owner.assistantApplications(draft).stream().map(a->new IncentiveApplication(a.userCompanyId(),name(user,a.userCompanyId()),a.amount(),a.currency(),a.exchangeRate(),draft.status().equals("paused")?"not_applied":"approved")).toList();
            normalized=new IncentiveChange(draft.name(),draft.description(),draft.incentiveType(),draft.amount(),draft.currency(),draft.status(),draft.effectiveStartDate(),draft.effectiveEndDate(),draft.applicationMode(),draft.scopeType(),draft.employeeIds(),draft.unitIds(),draft.businessIds(),draft.sourceReferenceType(),draft.sourceReferenceId());
            after=new IncentiveView(0,"",draft.name(),draft.description(),draft.incentiveType(),draft.amount(),draft.currency(),draft.status(),draft.effectiveStartDate().toString(),draft.effectiveEndDate()==null?"":draft.effectiveEndDate().toString(),draft.applicationMode(),draft.scopeType(),draft.status().equals("paused")?0:applications.size(),0,applications);
        } else {
            var current=detail(user,request.id());before=new Result(List.of(),null,null,null,null,false,current);
            after=new IncentiveView(current.id(),current.code(),current.name(),current.description(),current.type(),current.amount(),current.currency(),"paused",current.startDate(),current.endDate(),current.applicationMode(),current.scopeSummary(),current.eligibleCount(),current.appliedCount(),current.applications().stream().map(a->new IncentiveApplication(a.userCompanyId(),a.employeeName(),a.amount(),a.currency(),a.exchangeRate(),a.status().equals("approved")?"cancelled":a.status())).toList());
        }
        var change=new Change(request.id(),null,null,null,null,null,null,null,null,normalized);
        return new Prepared(action,change,create?null:views.version(before),before,new Result(List.of(),null,null,null,null,false,after));
    }
    public Result execute(AuthSessionUser user,Prepared prepared) {
        long id;
        if(prepared.action().equals("create_hr_incentive")) {
            var expected=prepared.after().incentive().applications().stream().map(a->new HrIncentiveService.AssistantApplication(a.userCompanyId(),a.amount(),a.currency(),a.exchangeRate())).toList();
            var row=owner.createAssistantIncentive(user,payload(prepared.change().incentive()),expected);id=((Number)row.get("id")).longValue();
        } else {id=prepared.change().id();owner.cancelIncentive(user,id);}
        return current(user,id);
    }
    public Result current(AuthSessionUser user,long id){return new Result(List.of(),null,null,null,null,false,detail(user,id));}
    private void validateAudience(AuthSessionUser user,IncentiveChange input) {
        var employees=input.employeeIds()==null?List.<Long>of():input.employeeIds();var units=input.unitIds()==null?List.<Long>of():input.unitIds();var businesses=input.businessIds()==null?List.<Long>of():input.businessIds();
        if(!input.scopeType().equals("employees")&&!employees.isEmpty()||!input.scopeType().equals("units")&&!units.isEmpty()||!input.scopeType().equals("businesses")&&!businesses.isEmpty())throw new IllegalArgumentException("Audience fields must match scopeType.");
        if(input.scopeType().equals("all")){requireTarget(user,"all",null,null,null);return;}
        var ids=input.scopeType().equals("employees")?employees:input.scopeType().equals("units")?units:businesses;
        if(ids.isEmpty()||ids.size()>100||new HashSet<>(ids).size()!=ids.size()||ids.stream().anyMatch(id->id==null||id<=0))throw new IllegalArgumentException("Audience requires 1 to 100 unique authorized destinations.");
        for(var id:ids)requireTarget(user,input.scopeType().equals("employees")?"employee":input.scopeType().equals("units")?"unit":"business",input.scopeType().equals("employees")?id:null,input.scopeType().equals("units")?id:null,input.scopeType().equals("businesses")?id:null);
    }
    private void requireTarget(AuthSessionUser user,String type,Long employee,Long unit,Long business) {
        if(type.equals("all")){if(!scopes.resolve(user).isCorporateOffice())throw new com.indice.erp.hr.HrAccessDeniedException("Company-wide incentives require corporate HR scope.");return;}
        if(type.equals("employee")) {
            if(employee==null||jdbc.queryForObject("SELECT COUNT(*) FROM user_companies WHERE company_id=? AND id=?",Long.class,user.companyId(),employee)==0)throw new NoSuchElementException("Employee not found.");
            scopes.requireUserInScope(user,employee);return;
        }
        if(type.equals("business")) {
            var rows=jdbc.queryForList("SELECT unit_id FROM businesses WHERE company_id=? AND id=?",Long.class,user.companyId(),business);
            if(rows.isEmpty())throw new NoSuchElementException("Business not found.");unit=rows.getFirst();
        } else if(!type.equals("unit"))throw new IllegalArgumentException("Unsupported incentive audience.");
        if(unit==null||jdbc.queryForObject("SELECT COUNT(*) FROM units WHERE company_id=? AND id=?",Long.class,user.companyId(),unit)==0)throw new NoSuchElementException("Unit not found.");
        scopes.requireAssignmentInScope(user,unit,business);
    }
    private String name(AuthSessionUser user,long id) {
        var rows=jdbc.queryForList("SELECT COALESCE(NULLIF(u.full_name,''),CONCAT('Employee ',uc.id)) FROM user_companies uc JOIN users u ON u.id=uc.user_id WHERE uc.company_id=? AND uc.id=?",String.class,user.companyId(),id);return rows.isEmpty()?"":rows.getFirst();
    }
    private static IncentiveView view(Map<String,Object> row,List<IncentiveApplication> applications) {
        return new IncentiveView(number(row.get("id")),text(row.get("incentive_code")),text(row.get("name")),text(row.get("description")),text(row.get("incentive_type")),new BigDecimal(row.get("amount").toString()),text(row.get("currency_code")),text(row.get("status")),text(row.get("effective_start_date")),text(row.get("effective_end_date")),text(row.get("application_mode")),text(row.get("scope_summary")),number(row.get("eligible_count")),number(row.get("applied_count")),applications);
    }
    private static Map<String,Object> payload(IncentiveChange input) {
        var result=new LinkedHashMap<String,Object>();put(result,"name",input.name());put(result,"description",input.description());put(result,"incentive_type",input.type());put(result,"amount",input.amount());put(result,"currency_code",input.currency());put(result,"status",input.status());put(result,"effective_start_date",input.startDate());put(result,"effective_end_date",input.endDate());put(result,"application_mode",input.applicationMode());put(result,"scope_type",input.scopeType());put(result,"target_user_company_ids",input.employeeIds());put(result,"target_unit_ids",input.unitIds());put(result,"target_business_ids",input.businessIds());put(result,"source_reference_type",input.sourceReferenceType());put(result,"source_reference_id",input.sourceReferenceId());return result;
    }
    private static void put(Map<String,Object> result,String key,Object value){HrAssistantPayload.put(result,key,value);}
    private static String text(Object value){return value==null?"":value.toString();}
    private static long number(Object value){return value instanceof Number n?n.longValue():0;}
}
