package com.indice.erp.hr.assistant;

import static com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.permissions.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class HrAssistantPermissionsService {
    public static final Set<String> ACTIONS=Set.of("create_my_hr_permission","withdraw_my_hr_permission","approve_hr_permission","reject_hr_permission");
    public static final Set<String> READS=Set.of("list_my_hr_permissions","get_my_hr_permission","list_hr_permissions","get_hr_permission");
    private final HrPermissionSecurityService security;
    private final HrPermissionQueryService queries;
    private final HrPermissionCommandService commands;
    private final HrPermissionSelfDeleteService withdrawals;
    public HrAssistantPermissionsService(HrPermissionSecurityService security,HrPermissionQueryService queries,HrPermissionCommandService commands,HrPermissionSelfDeleteService withdrawals) {
        this.security=security;this.queries=queries;this.commands=commands;this.withdrawals=withdrawals;
    }
    public PermissionView detail(AuthSessionUser user,long id,boolean management) {
        var actor=security.delegatedActor(user,management);
        return view(map((management?queries.getManagement(actor,id):queries.getOwn(actor,id)).get("permission")));
    }
    public Page<PermissionView> list(AuthSessionUser user,String tool,PageRequest request) {
        boolean management=tool.equals("list_hr_permissions");
        var actor=security.delegatedActor(user,management);
        var window=HrAssistantPages.window(user,tool,request);
        if(request!=null&&(request.unitId()!=null||request.businessId()!=null))throw new IllegalArgumentException("Permission scope follows current HR assignments; organizational overrides are unsupported.");
        var filters=new LinkedHashMap<String,String>();if(request!=null){if(request.query()!=null)filters.put("search",request.query());if(request.status()!=null)filters.put("status",request.status());}
        var result=management?queries.listManagement(actor,filters):queries.listOwn(actor,filters);
        var rows=rows(result.get("items")).stream().map(HrAssistantPermissionsService::view).toList();
        int start=(int)Math.min((long)(window.page()-1)*window.size(),rows.size());
        return window.result(rows.subList(start,Math.min(start+window.size(),rows.size())),rows.size());
    }
    public Prepared prepare(AuthSessionUser user,String action,Change request,HrAssistantService projections) {
        if(!ACTIONS.contains(action)||request==null||request.attendance()!=null||request.payroll()!=null||request.incentive()!=null||request.payroll()!=null||request.employee()!=null||request.employees()!=null||request.asset()!=null||request.announcement()!=null||request.record()!=null||request.assignment()!=null||request.termination()!=null
            ||(request.id()==null)!=action.equals("create_my_hr_permission")||request.id()!=null&&request.id()<=0)throw new IllegalArgumentException("Invalid permission action fields.");
        boolean create=action.equals("create_my_hr_permission"),withdraw=action.equals("withdraw_my_hr_permission");
        if((request.permission()!=null)!=!withdraw)throw new IllegalArgumentException("Permission details required only for create or review.");
        var actor=security.delegatedActor(user,!create&&!withdraw);
        var before=new Result(List.of(),null,null);
        PermissionChange normalized=null;PermissionView after;
        if(create) {
            if(request.permission().reviewNotes()!=null)throw new IllegalArgumentException("Review notes belong to administrative review.");
            var draft=commands.validateAssistantOwn(actor,payload(request.permission()));
            normalized=new PermissionChange(draft.type(),draft.payrollTreatment(),draft.startDate(),draft.endDate(),draft.halfDay(),draft.reason(),null);
            after=new PermissionView(0,"",actor.userCompanyId(),actor.userName(),draft.type(),draft.payrollTreatment(),draft.startDate().toString(),draft.endDate().toString(),draft.requestedDays(),draft.halfDay(),"pending",draft.reason(),"","","",List.of());
        } else {
            var current=detail(user,request.id(),!withdraw);
            if(!"pending".equals(current.status()))throw new IllegalArgumentException("Only pending permission requests can be changed.");
            before=new Result(List.of(),null,null,null,current,false);
            String notes="";
            if(!withdraw) {
                var change=request.permission();
                if(change.type()!=null||change.payrollTreatment()!=null||change.startDate()!=null||change.endDate()!=null||change.halfDay()!=null||change.reason()!=null)throw new IllegalArgumentException("Review accepts only reviewNotes.");
                notes=commands.validateAssistantReview(actor,request.id(),payload(change));
                normalized=new PermissionChange(null,null,null,null,null,null,notes);
            }
            after=new PermissionView(current.id(),current.folio(),current.userCompanyId(),current.employeeName(),current.type(),current.payrollTreatment(),current.startDate(),current.endDate(),current.days(),current.halfDay(),withdraw?"withdrawn":action.equals("approve_hr_permission")?"approved":"rejected",current.reason(),notes==null?"":notes,current.reviewedAt(),actor.userName(),current.attachments());
        }
        var change=new Change(request.id(),null,null,null,null,null,null,null,normalized);
        return new Prepared(action,change,create?null:projections.version(before),before,new Result(List.of(),null,null,null,after,withdraw));
    }
    public Result execute(AuthSessionUser user,Prepared prepared) {
        var action=prepared.action();var change=prepared.change();
        var actor=security.delegatedActor(user,action.startsWith("approve_")||action.startsWith("reject_"));
        if(action.equals("withdraw_my_hr_permission")) {
            withdrawals.deleteOwnPending(actor,change.id());
            return prepared.after();
        }
        var response=switch(action) {
            case "create_my_hr_permission" -> commands.createOwn(actor,payload(change.permission()));
            case "approve_hr_permission" -> commands.approve(actor,change.id(),payload(change.permission()));
            case "reject_hr_permission" -> commands.reject(actor,change.id(),payload(change.permission()));
            default -> throw new IllegalArgumentException("Unsupported permission action.");
        };
        return new Result(List.of(),null,null,null,view(map(response.get("permission"))),false);
    }
    public Result current(AuthSessionUser user,String action,long id){return new Result(List.of(),null,null,null,detail(user,id,!action.contains("_my_")),false);}
    public void requireResultAccess(AuthSessionUser user,Result result) {
        if(result.withdrawn()) {
            security.delegatedActor(user,false);
            if(result.permission().userCompanyId()!=user.userCompanyId())throw new SecurityException("Own permission required.");
        } else {
            boolean own=result.permission().userCompanyId()==user.userCompanyId();
            detail(user,result.permission().id(),!own);
        }
    }
    private static Map<String,Object> payload(PermissionChange input) {
        var result=new LinkedHashMap<String,Object>();put(result,"type",input.type());put(result,"payroll_treatment",input.payrollTreatment());put(result,"start_date",input.startDate());put(result,"end_date",input.endDate());put(result,"half_day",input.halfDay());put(result,"reason",input.reason());put(result,"review_notes",input.reviewNotes());return result;
    }
    private static PermissionView view(Map<String,Object> row) {
        var employee=map(row.get("employee"));var reviewer=map(row.get("reviewedBy"));
        return new PermissionView(number(row.get("id")),text(row.get("folio")),number(employee.get("id")),text(employee.get("name")),text(row.get("type")),text(row.get("payrollTreatment")),text(row.get("startDate")),text(row.get("endDate")),row.get("days")==null?BigDecimal.ZERO:new BigDecimal(row.get("days").toString()),Boolean.TRUE.equals(row.get("halfDay")),text(row.get("status")),text(row.get("reason")),text(row.get("reviewNotes")),text(row.get("reviewedAt")),text(reviewer.get("name")),rows(row.get("attachments")).stream().map(a->new DocumentView(number(a.get("id")),"permission_attachment",text(a.get("fileName")),text(a.get("mimeType")),number(a.get("sizeBytes")))).toList());
    }
    private static void put(Map<String,Object> map,String key,Object value){HrAssistantPayload.put(map,key,value);}
    private static long number(Object value){return value instanceof Number n?n.longValue():0;}
    private static String text(Object value){return value==null?"":value.toString();}
    private static Map<String,Object> map(Object value){var result=new LinkedHashMap<String,Object>();if(value instanceof Map<?,?> source)source.forEach((key,item)->result.put(String.valueOf(key),item));return result;}
    private static List<Map<String,Object>> rows(Object value){return value instanceof List<?> list?list.stream().map(HrAssistantPermissionsService::map).toList():List.of();}
}
