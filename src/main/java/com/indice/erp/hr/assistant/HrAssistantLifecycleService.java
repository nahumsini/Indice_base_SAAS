package com.indice.erp.hr.assistant;

import static com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.assets.HrAssetService;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.hr.records.HrRecordService;
import com.indice.erp.hr.announcements.*;
import java.util.*;
import org.springframework.stereotype.Service;

/** Delegated lifecycle preparation. Each domain owner performs its own validation and mutation. */
@Service
public class HrAssistantLifecycleService {
    public static final Set<String> ACTIONS=Set.of("terminate_employee","update_hr_asset","reassign_hr_asset","change_hr_asset_status",
        "update_announcement","mark_announcement_read","mark_announcement_unread","create_hr_record","update_hr_record");
    private final HrUserService people;
    private final HrAssetService assets;
    private final HrRecordService records;
    private final HrAssistantRecordsService recordViews;
    private final HrAnnouncementSecurityService security;
    private final AnnEditSvc edits;
    private final AnnReadSvc reads;
    public HrAssistantLifecycleService(HrUserService people,HrAssetService assets,HrRecordService records,HrAssistantRecordsService recordViews,
            HrAnnouncementSecurityService security,AnnEditSvc edits,AnnReadSvc reads) {
        this.people=people;this.assets=assets;this.records=records;this.recordViews=recordViews;this.security=security;this.edits=edits;this.reads=reads;
    }
    public Prepared prepare(AuthSessionUser user,String action,Change request,HrAssistantService views) {
        requireFields(action,request);
        var empty=new Result(List.of(),null,null);
        Result before=empty,after;
        Change normalized=request;
        switch(action) {
            case "terminate_employee" -> {
                if(request.id().equals(user.userCompanyId()))throw new IllegalArgumentException("Cannot terminate the operator's own membership.");
                var person=views.employee(user,request.id());
                if("terminated".equals(person.status()))throw new IllegalArgumentException("Employee is already terminated.");
                var draft=people.validateAssistantTermination(user,request.id(),terminationPayload(request.termination()));
                normalized=new Change(request.id(),null,null,null,null,new TerminationChange(draft.exitDate(),draft.lastWorkingDay(),draft.reasonType(),draft.reasonCode(),draft.summary()),null,null);
                before=new Result(List.of(person),null,null);
                after=new Result(List.of(new EmployeeView(person.userCompanyId(),person.employeeCode(),person.name(),person.email(),person.phone(),person.position(),person.department(),person.unitId(),person.unitName(),person.businessId(),person.businessName(),
                    "terminated",person.registrationCountry(),person.salaryCurrency(),person.salary(),person.payPeriod(),person.salaryType(),person.hourlyRate(),person.hireDate(),person.contractType(),person.contractStartDate(),person.contractEndDate(),person.documents())),null,null);
            }
            case "update_hr_asset" -> {
                before=new Result(List.of(),views.asset(user,request.id()),null);
                var draft=assets.validateAssistantUpdate(user,request.id(),assetUpdatePayload(request.asset()));
                var change=new AssetChange(draft.assetCode(),draft.assetType(),draft.name(),draft.model(),draft.serialNumber(),null,draft.unitId(),null,null,draft.valueAmount(),draft.valueCurrency(),draft.notes());
                normalized=new Change(request.id(),null,null,change,null);
                after=new Result(List.of(),assetAfter(before.asset(),draft.name(),draft.assetCode(),draft.assetType(),draft.model(),draft.serialNumber(),draft.unitId(),draft.responsibleUserCompanyId(),draft.status(),draft.valueAmount(),draft.valueCurrency(),draft.notes(),views,user),null);
            }
            case "reassign_hr_asset","change_hr_asset_status" -> {
                before=new Result(List.of(),views.asset(user,request.id()),null);
                var draft=assets.validateAssistantAssignment(user,request.id(),assignmentPayload(request.assignment()),"reassign_hr_asset".equals(action));
                normalized=new Change(request.id(),null,null,null,null,null,new AssetAssignment(draft.responsibleUserCompanyId(),draft.unitId(),draft.status(),draft.effectiveAt(),draft.notes(),draft.changeReason()),null);
                var old=before.asset();
                after=new Result(List.of(),assetAfter(old,old.name(),old.assetCode(),old.assetType(),old.model(),old.serialNumber(),draft.unitId(),draft.responsibleUserCompanyId(),draft.status(),old.valueAmount(),old.valueCurrency(),old.notes(),views,user),null);
            }
            case "update_announcement" -> {
                before=new Result(List.of(),null,views.announcement(user,request.id()));
                var input=request.announcement();
                var draft=edits.validateAssistantUpdate(security.delegatedActor(user),request.id(),HrAssistantService.announcementPayload(input));
                var change=new AnnouncementChange(draft.title(),draft.type(),draft.content(),draft.audienceType(),draft.status(),draft.scheduledFor(),input.unitIds(),input.userCompanyIds(),input.departmentNames());
                normalized=new Change(request.id(),null,null,null,change);
                after=new Result(List.of(),null,new AnnouncementView(request.id(),draft.title(),draft.type(),draft.content(),draft.audienceType(),views.audienceSummary(user,change),draft.status(),draft.scheduledFor()==null?null:draft.scheduledFor().toString(),before.announcement().deliveryCount(),before.announcement().readCount(),before.announcement().read(),before.announcement().attachmentCount()));
            }
            case "mark_announcement_read","mark_announcement_unread" -> {
                var old=views.announcement(user,request.id());
                before=new Result(List.of(),null,old);
                after=new Result(List.of(),null,new AnnouncementView(old.id(),old.title(),old.type(),old.content(),old.audienceType(),old.audienceSummary(),old.status(),old.scheduledFor(),old.deliveryCount(),old.readCount(),"mark_announcement_read".equals(action),old.attachmentCount()));
            }
            case "create_hr_record","update_hr_record" -> {
                if(request.id()!=null)before=new Result(List.of(),null,null,recordViews.detail(user,request.id()));
                var draft=records.validateAssistantChange(user,request.id(),recordPayload(request.record()));
                var change=new RecordChange(draft.userCompanyId(),draft.type(),draft.severity(),draft.status(),draft.title(),draft.description(),draft.actionsTaken(),draft.eventDate(),draft.witnesses().stream().map(w->new Witness(w.userCompanyId(),w.name())).toList());
                normalized=new Change(request.id(),null,null,null,null,null,null,change);
                var person=views.employee(user,draft.userCompanyId());
                after=new Result(List.of(),null,null,new RecordView(request.id()==null?0:request.id(),request.id()==null?"":before.record().folio(),person.userCompanyId(),person.name(),person.unitId(),person.unitName(),person.businessId(),person.businessName(),draft.type(),draft.severity()==null?"":draft.severity(),draft.status(),draft.title(),draft.description(),draft.actionsTaken()==null?"":draft.actionsTaken(),draft.eventDate().toString(),request.id()==null?List.of():before.record().attachments(),request.id()==null?List.of():before.record().history(),change.witnesses()));
            }
            default -> throw new IllegalArgumentException("Unsupported HR lifecycle.");
        }
        return new Prepared(action,normalized,request.id()==null?null:views.version(before),before,after);
    }
    public Result current(AuthSessionUser user,String action,long id,HrAssistantService views) {
        if(action.contains("employee"))return new Result(List.of(views.employee(user,id)),null,null);
        if(action.contains("asset"))return new Result(List.of(),views.asset(user,id),null);
        if(action.contains("announcement"))return new Result(List.of(),null,views.announcement(user,id));
        return new Result(List.of(),null,null,recordViews.detail(user,id));
    }
    public Result execute(AuthSessionUser user,Prepared prepared,HrAssistantService views) {
        var change=prepared.change();
        switch(prepared.action()) {
            case "terminate_employee" -> people.terminateUser(user,change.id(),terminationPayload(change.termination()));
            case "update_hr_asset" -> assets.updateAsset(user,change.id(),assetUpdatePayload(change.asset()));
            case "reassign_hr_asset" -> assets.reassignAsset(user,change.id(),assignmentPayload(change.assignment()));
            case "change_hr_asset_status" -> assets.changeStatus(user,change.id(),assignmentPayload(change.assignment()));
            case "update_announcement" -> edits.update(security.delegatedActor(user),change.id(),HrAssistantService.announcementPayload(change.announcement()));
            case "mark_announcement_read" -> reads.markRead(security.delegatedActor(user),change.id());
            case "mark_announcement_unread" -> reads.markUnread(security.delegatedActor(user),change.id());
            case "create_hr_record" -> {
                var created=records.createRecord(user,recordPayload(change.record()));
                var row=(Map<?,?>)created.get("record");
                return new Result(List.of(),null,null,recordViews.detail(user,((Number)row.get("id")).longValue()));
            }
            case "update_hr_record" -> records.updateRecord(user,change.id(),recordPayload(change.record()));
            default -> throw new IllegalArgumentException("Unsupported HR lifecycle.");
        }
        return current(user,prepared.action(),change.id(),views);
    }
    private static AssetView assetAfter(AssetView old,String name,String code,String type,String model,String serial,Long unit,Long responsible,String status,java.math.BigDecimal value,String currency,String notes,HrAssistantService views,AuthSessionUser user) {
        return new AssetView(old.id(),code,name,type,model,serial,unit,views.referenceName(user.companyId(),"units",unit),responsible,views.employeeName(user.companyId(),responsible),status,value,currency,notes,old.photoCount());
    }
    private static void requireFields(String action,Change request) {
        if(request==null||!ACTIONS.contains(action))throw new IllegalArgumentException("HR lifecycle details required.");
        boolean asset=action.equals("update_hr_asset"),assignment=Set.of("reassign_hr_asset","change_hr_asset_status").contains(action),record=action.endsWith("hr_record"),termination=action.equals("terminate_employee"),announcement=action.equals("update_announcement");
        if(request.attendance()!=null||request.payroll()!=null||request.incentive()!=null||request.payroll()!=null||request.permission()!=null||request.employee()!=null||request.employees()!=null||(request.asset()!=null)!=asset||(request.assignment()!=null)!=assignment||(request.record()!=null)!=record||(request.termination()!=null)!=termination||(request.announcement()!=null)!=announcement
            ||(request.id()!=null)!=!action.equals("create_hr_record")||request.id()!=null&&request.id()<=0)throw new IllegalArgumentException("Fields do not belong to this HR lifecycle.");
    }
    private static Map<String,Object> terminationPayload(TerminationChange input) {
        var result=new LinkedHashMap<String,Object>();put(result,"exit_date",input.exitDate());put(result,"last_working_day",input.lastWorkingDay());put(result,"reason_type",input.reasonType());put(result,"specific_reason",input.specificReason());put(result,"summary",input.summary());return result;
    }
    private static Map<String,Object> assetUpdatePayload(AssetChange input) {
        if(input.status()!=null||input.responsibleUserCompanyId()!=null||input.assignedAt()!=null)throw new IllegalArgumentException("Use the separate asset assignment/status lifecycle.");
        var result=new LinkedHashMap<String,Object>();put(result,"asset_code",input.assetCode());put(result,"asset_type",input.assetType());put(result,"name",input.name());put(result,"model",input.model());put(result,"serial_number",input.serialNumber());put(result,"unit_id",input.unitId());put(result,"value_amount",input.valueAmount());put(result,"value_currency",input.valueCurrency());put(result,"notes",input.notes());return result;
    }
    private static Map<String,Object> assignmentPayload(AssetAssignment input) {
        var result=new LinkedHashMap<String,Object>();put(result,"responsible_user_company_id",input.responsibleUserCompanyId());put(result,"unit_id",input.unitId());put(result,"status",input.status());put(result,"assigned_at",input.effectiveAt());put(result,"changed_at",input.effectiveAt());put(result,"notes",input.notes());put(result,"change_reason",input.changeReason());return result;
    }
    private static Map<String,Object> recordPayload(RecordChange input) {
        var result=new LinkedHashMap<String,Object>();put(result,"user_company_id",input.userCompanyId());put(result,"record_type",input.type());put(result,"severity",input.severity());put(result,"status",input.status());put(result,"title",input.title());put(result,"description",input.description());put(result,"actions_taken",input.actionsTaken());put(result,"event_date",input.eventDate());
        if(input.witnesses()!=null)result.put("witnesses",input.witnesses().stream().map(w->{var row=new LinkedHashMap<String,Object>();put(row,"user_company_id",w.userCompanyId());put(row,"name",w.name());return row;}).toList());return result;
    }
    private static void put(Map<String,Object> result,String key,Object value){HrAssistantPayload.put(result,key,value);}
}
