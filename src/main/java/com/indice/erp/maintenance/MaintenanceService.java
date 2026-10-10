package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.maintenance.MaintenanceDtos.*;
import static com.indice.erp.maintenance.MaintenancePolicy.*;
import static com.indice.erp.maintenance.MaintenanceRepository.time;

@Service
public class MaintenanceService {
    private final MaintenanceRepository db;
    private final MaintenanceAccess access;
    private final com.indice.erp.scheduling.SchedulingResourceAvailabilityService resources;
    private final com.indice.erp.hr.permissions.HrSchedulingAvailabilityService hr;
    private final MaintenanceBusyWindowService busy;
    private final com.indice.erp.hr.assets.HrAssetMaintenanceContract assets;
    public MaintenanceService(MaintenanceRepository db,MaintenanceAccess access,
        com.indice.erp.scheduling.SchedulingResourceAvailabilityService resources,
        com.indice.erp.hr.permissions.HrSchedulingAvailabilityService hr,MaintenanceBusyWindowService busy,
        com.indice.erp.hr.assets.HrAssetMaintenanceContract assets){this.db=db;this.access=access;this.resources=resources;this.hr=hr;this.busy=busy;this.assets=assets;}
    String fingerprint(Object value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(db.json(value).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    Long replay(AuthSessionUser actor,String operation,String key,Object body){
        require(key!=null&&key.matches("[A-Za-z0-9_-]{16,80}"),"maintenance_retry_key_required");
        var rows=db.jdbc().queryForList("SELECT entity_id,fingerprint FROM maintenance_replays WHERE company_id=? AND actor_id=? AND operation=? AND request_key=?",actor.companyId(),actor.userId(),operation,key);
        if(rows.isEmpty())return null;require(fingerprint(body).equals(rows.getFirst().get("fingerprint")),"maintenance_retry_payload_changed");return ((Number)rows.getFirst().get("entity_id")).longValue();
    }
    void remember(AuthSessionUser actor,String operation,String key,Object body,long id){db.jdbc().update("INSERT INTO maintenance_replays(company_id,actor_id,operation,request_key,fingerprint,entity_id) VALUES(?,?,?,?,?,?)",actor.companyId(),actor.userId(),operation,key,fingerprint(body),id);}
    @Transactional public Settings settings(AuthSessionUser actor,Settings input){
        actor=access.lock(actor,"configuration");MaintenanceAccess.administrate(actor);var old=db.settings(actor.companyId());version(old.version(),input.version());ZoneId.of(input.timezone());currency(input.currency());
        require(input.categories().stream().distinct().count()==input.categories().size()&&input.specialties().stream().distinct().count()==input.specialties().size(),"maintenance_duplicate_setting");
        for(var procedure:input.procedures())require(procedure.steps().stream().noneMatch(Step::done),"maintenance_procedure_invalid");
        db.jdbc().update("INSERT INTO maintenance_settings(company_id,timezone,currency,hourly_rate,critical_hours,high_hours,normal_hours,low_hours,categories,specialties,procedures,evidence_required,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1) ON DUPLICATE KEY UPDATE timezone=VALUES(timezone),currency=VALUES(currency),hourly_rate=VALUES(hourly_rate),critical_hours=VALUES(critical_hours),high_hours=VALUES(high_hours),normal_hours=VALUES(normal_hours),low_hours=VALUES(low_hours),categories=VALUES(categories),specialties=VALUES(specialties),procedures=VALUES(procedures),evidence_required=VALUES(evidence_required),version=version+1",actor.companyId(),input.timezone(),input.currency(),money(input.hourlyRate()),input.criticalHours(),input.highHours(),input.normalHours(),input.lowHours(),db.json(input.categories()),db.json(input.specialties()),db.json(input.procedures()),input.evidenceRequired());
        db.audit(actor,"SETTINGS",actor.companyId(),"SETTINGS_UPDATED","");return db.settings(actor.companyId());
    }
    @Transactional public Asset asset(AuthSessionUser actor,Long id,AssetInput input,String key){
        actor=access.lock(actor,"assets");MaintenanceAccess.manage(actor);Asset old=id==null?null:db.asset(actor,id);if(old!=null)version(old.version(),input.expectedVersion());
        priority(input.criticality());require(Set.of("EQUIPMENT","LOCATION").contains(input.assetType()),"maintenance_asset_type_invalid");access.validateAssignment(actor,input.unitId(),input.businessId());
        if(input.hrAssetId()!=null){var linked=assets.read(actor,input.hrAssetId());require(Objects.equals(linked.unitId(),input.unitId())&&input.assetType().equals("EQUIPMENT"),"maintenance_hr_asset_scope_invalid");}
        if(old!=null)require(Objects.equals(old.hrAssetId(),input.hrAssetId())&&Objects.equals(old.unitId(),input.unitId())&&Objects.equals(old.businessId(),input.businessId()),"maintenance_asset_identity_immutable");
        if(id==null){Long prior=replay(actor,"ASSET",key,input);if(prior!=null)return db.asset(actor,prior);
            id=db.insert("INSERT INTO maintenance_assets(company_id,name,asset_type,hr_asset_id,unit_id,business_id,location,criticality,notes,active,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)",actor.companyId(),input.name().trim(),input.assetType(),input.hrAssetId(),input.unitId(),input.businessId(),input.location().trim(),input.criticality(),input.notes().trim(),input.active(),actor.userId());remember(actor,"ASSET",key,input,id);
        }else{
            if(!input.active())require(db.jdbc().queryForObject("SELECT COUNT(*) FROM maintenance_orders WHERE company_id=? AND asset_id=? AND status NOT IN ('CLOSED','CANCELLED')",Long.class,actor.companyId(),id)==0&&db.jdbc().queryForObject("SELECT COUNT(*) FROM maintenance_plans WHERE company_id=? AND asset_id=? AND active=1",Long.class,actor.companyId(),id)==0,"maintenance_asset_in_use");
            db.jdbc().update("UPDATE maintenance_assets SET name=?,location=?,criticality=?,notes=?,active=?,version=version+1 WHERE company_id=? AND id=?",input.name().trim(),input.location().trim(),input.criticality(),input.notes().trim(),input.active(),actor.companyId(),id);
        }
        db.audit(actor,"ASSET",id,old==null?"ASSET_CREATED":"ASSET_UPDATED","");return db.asset(actor,id);
    }
    @Transactional public RequestDetail report(AuthSessionUser actor,RequestInput input,String key){
        actor=access.lock(actor,"requests");priority(input.priority());Long prior=replay(actor,"REQUEST",key,input);if(prior!=null)return db.requestDetail(actor,prior);
        Asset asset=input.assetId()==null?null:db.asset(actor,input.assetId());require(asset==null||asset.active(),"maintenance_asset_inactive");
        var assignment=asset==null?access.assignment(actor):new Assignment(asset.unitId(),asset.businessId());
        require(asset!=null||!input.location().isBlank(),"maintenance_location_required");
        long id=db.insert("INSERT INTO maintenance_requests(company_id,asset_id,unit_id,business_id,requester_id,title,description,location,priority,category) VALUES(?,?,?,?,?,?,?,?,?,?)",actor.companyId(),input.assetId(),assignment.unitId(),assignment.businessId(),actor.userId(),input.title().trim(),input.description().trim(),input.location().trim(),input.priority(),input.category().trim());
        remember(actor,"REQUEST",key,input,id);db.audit(actor,"REQUEST",id,"REQUEST_CREATED","");return db.requestDetail(actor,id);
    }
    @Transactional public RequestDetail triage(AuthSessionUser actor,long id,Triage input){
        actor=access.lock(actor,"requests");MaintenanceAccess.manage(actor);var request=db.request(actor,id);
        if(input.accept()&&request.status().equals("ACCEPTED"))return db.requestDetail(actor,id);
        version(request.version(),input.expectedVersion());require(request.status().equals("NEW"),"maintenance_request_already_reviewed");
        if(input.accept()){
            access.requireTabs(actor,"orders");if(request.assetId()!=null)require(db.asset(actor,request.assetId()).active(),"maintenance_asset_inactive");var settings=db.settings(actor.companyId());
            int hours=switch(request.priority()){case "CRITICAL"->settings.criticalHours();case "HIGH"->settings.highHours();case "LOW"->settings.lowHours();default->settings.normalHours();};
            var deadline=request.createdAt().plusSeconds(hours*3600L);
            var order=new OrderInput(request.assetId(),request.title(),request.description(),"CORRECTIVE",request.priority(),request.category(),null,deadline,null,null,settings.timezone(),List.of(),settings.evidenceRequired(),false,settings.currency(),java.math.BigDecimal.ZERO,"",null);
            long orderId=insertOrder(actor,order,request.unitId(),request.businessId(),id,null,null);db.audit(actor,"ORDER",orderId,"REQUEST_ACCEPTED",input.reason());
        }else require(!input.reason().isBlank(),"maintenance_reason_required");
        db.jdbc().update("UPDATE maintenance_requests SET status=?,response_at=UTC_TIMESTAMP(6),version=version+1 WHERE company_id=? AND id=?",input.accept()?"ACCEPTED":"REJECTED",actor.companyId(),id);db.audit(actor,"REQUEST",id,input.accept()?"REQUEST_ACCEPTED":"REQUEST_REJECTED",input.reason());return db.requestDetail(actor,id);
    }
    private void validate(AuthSessionUser actor,OrderInput input,Long id,Long unit,Long business){
        priority(input.priority());currency(input.currency());ZoneId.of(input.timezone());date(input.dueAt());
        require(Set.of("CORRECTIVE","PREVENTIVE","INSPECTION").contains(input.orderType()),"maintenance_order_type_invalid");
        require(input.checklist().stream().noneMatch(Step::done),"maintenance_procedure_invalid");
        access.assignee(actor,input.assigneeId(),unit,business);
        require((input.scheduledStart()==null)==(input.scheduledEnd()==null),"maintenance_schedule_invalid");
        if(input.scheduledStart()!=null){
            date(input.scheduledStart());date(input.scheduledEnd());require(input.assigneeId()!=null&&input.scheduledStart().isBefore(input.scheduledEnd())&&!input.scheduledEnd().isAfter(input.scheduledStart().plusSeconds(86400)),"maintenance_schedule_invalid");
            String email=db.jdbc().queryForObject("SELECT email FROM users WHERE id=?",String.class,input.assigneeId());resources.lock(email);
            var first=input.scheduledStart().atZone(ZoneId.of(input.timezone())).toLocalDate();var last=input.scheduledEnd().minusNanos(1).atZone(ZoneId.of(input.timezone())).toLocalDate();
            require(!hr.unavailable(actor.companyId(),input.assigneeId(),first,last)&&!resources.busyWithoutMaintenance(email,input.scheduledStart(),input.scheduledEnd())&&!busy.busy(email,input.scheduledStart(),input.scheduledEnd(),id),"maintenance_schedule_conflict");
        }
    }
    long insertOrder(AuthSessionUser actor,OrderInput input,Long unit,Long business,Long request,Long plan,Integer cycle){
        long id=db.insert("INSERT INTO maintenance_orders(company_id,asset_id,request_id,plan_id,plan_cycle,unit_id,business_id,title,description,order_type,priority,category,status,assignee_id,due_at,original_due_at,scheduled_start,scheduled_end,timezone,diagnosis,resolution,checklist,evidence_required,blocking,currency,estimated_amount,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'','',?,?,?,?,?,?)",actor.companyId(),input.assetId(),request,plan,cycle,unit,business,input.title().trim(),input.description().trim(),input.orderType(),input.priority(),input.category().trim(),input.assigneeId()==null?"OPEN":"ASSIGNED",input.assigneeId(),time(input.dueAt()),time(input.dueAt()),time(input.scheduledStart()),time(input.scheduledEnd()),input.timezone(),db.json(input.checklist()),input.evidenceRequired(),input.blocking(),input.currency(),money(input.estimatedAmount()),actor.userId());
        if(input.blocking()&&input.assetId()!=null)outage(actor,input.assetId());return id;
    }
    @Transactional public OrderDetail create(AuthSessionUser actor,OrderInput input,String key){
        actor=access.lock(actor,"orders");MaintenanceAccess.manage(actor);Long prior=replay(actor,"ORDER",key,input);if(prior!=null)return db.detail(actor,prior);
        Asset asset=input.assetId()==null?null:db.asset(actor,input.assetId());require(asset==null||asset.active(),"maintenance_asset_inactive");var a=asset==null?access.assignment(actor):new Assignment(asset.unitId(),asset.businessId());access.validateAssignment(actor,a.unitId(),a.businessId());validate(actor,input,null,a.unitId(),a.businessId());
        require(!input.blocking()||asset!=null,"maintenance_blocking_asset_required");long id=insertOrder(actor,input,a.unitId(),a.businessId(),null,null,null);remember(actor,"ORDER",key,input,id);db.audit(actor,"ORDER",id,"ORDER_CREATED","");return db.detail(actor,id);
    }
    @Transactional public OrderDetail edit(AuthSessionUser actor,long id,OrderInput input){
        actor=access.lock(actor,"orders");MaintenanceAccess.manage(actor);var old=db.order(actor,id);version(old.version(),input.expectedVersion());require(!TERMINAL.contains(old.status()),"maintenance_order_closed");
        require(Objects.equals(old.assetId(),input.assetId())&&old.currency().equals(input.currency())&&old.orderType().equals(input.orderType()),"maintenance_order_identity_immutable");
        validate(actor,input,id,old.unitId(),old.businessId());
        require(old.dueAt().equals(input.dueAt())&&Objects.equals(old.scheduledStart(),input.scheduledStart())&&Objects.equals(old.scheduledEnd(),input.scheduledEnd())||!input.reason().isBlank(),"maintenance_reschedule_reason_required");
        require(!input.blocking()||old.assetId()!=null,"maintenance_blocking_asset_required");
        require(old.status().equals("OPEN")||old.status().equals("ASSIGNED")||input.assigneeId()!=null,"maintenance_assignee_required");
        String status=Set.of("OPEN","ASSIGNED").contains(old.status())?(input.assigneeId()==null?"OPEN":"ASSIGNED"):old.status();
        // Procedure requirements are frozen at creation; editing planning cannot bypass closure gates.
        db.jdbc().update("UPDATE maintenance_orders SET title=?,description=?,priority=?,category=?,assignee_id=?,due_at=?,scheduled_start=?,scheduled_end=?,timezone=?,blocking=?,estimated_amount=?,status=?,version=version+1 WHERE company_id=? AND id=?",input.title().trim(),input.description().trim(),input.priority(),input.category().trim(),input.assigneeId(),time(input.dueAt()),time(input.scheduledStart()),time(input.scheduledEnd()),input.timezone(),input.blocking(),money(input.estimatedAmount()),status,actor.companyId(),id);
        if(input.blocking()&&old.assetId()!=null)outage(actor,old.assetId());
        db.audit(actor,"ORDER",id,"ORDER_PLANNED",input.reason()+" ["+old.dueAt()+" -> "+input.dueAt()+"]");return db.detail(actor,id);
    }
    @Transactional public OrderDetail progress(AuthSessionUser actor,long id,Progress input){
        actor=access.lock(actor,"orders");var old=db.order(actor,id);version(old.version(),input.expectedVersion());require(Set.of("IN_PROGRESS","WAITING_PARTS","WAITING_VENDOR").contains(old.status()),"maintenance_execution_required");
        require(input.completed().size()==old.checklist().size()&&input.completed().stream().noneMatch(Objects::isNull),"maintenance_checklist_invalid");var steps=new ArrayList<Step>();for(int i=0;i<old.checklist().size();i++){var step=old.checklist().get(i);steps.add(new Step(step.label(),step.required(),input.completed().get(i)));}
        db.jdbc().update("UPDATE maintenance_orders SET diagnosis=?,resolution=?,checklist=?,version=version+1 WHERE company_id=? AND id=?",input.diagnosis().trim(),input.resolution().trim(),db.json(steps),actor.companyId(),id);db.audit(actor,"ORDER",id,"PROGRESS_SAVED","");return db.detail(actor,id);
    }
    @Transactional public OrderDetail transition(AuthSessionUser actor,long id,Transition input){
        actor=access.lock(actor,"orders");var old=db.order(actor,id);version(old.version(),input.expectedVersion());MaintenancePolicy.transition(old,input.status(),MaintenanceAccess.manager(actor),input.reason(),db.attachments(actor.companyId(),"ORDER",id).size());
        if(input.status().equals("IN_PROGRESS"))require(old.assigneeId()!=null,"maintenance_assignee_required");
        db.jdbc().update("UPDATE maintenance_orders SET status=?,started_at=CASE WHEN ?='IN_PROGRESS' THEN COALESCE(started_at,UTC_TIMESTAMP(6)) ELSE started_at END,closed_at=CASE WHEN ?='CLOSED' THEN UTC_TIMESTAMP(6) WHEN ?='OPEN' THEN NULL ELSE closed_at END,scheduled_start=CASE WHEN ?='OPEN' THEN NULL ELSE scheduled_start END,scheduled_end=CASE WHEN ?='OPEN' THEN NULL ELSE scheduled_end END,assignee_id=CASE WHEN ?='OPEN' THEN NULL ELSE assignee_id END,version=version+1 WHERE company_id=? AND id=?",input.status(),input.status(),input.status(),input.status(),input.status(),input.status(),input.status(),actor.companyId(),id);
        if(input.status().equals("OPEN")&&old.blocking()&&old.assetId()!=null)outage(actor,old.assetId());db.audit(actor,"ORDER",id,"STATUS_"+input.status(),input.reason());return db.detail(actor,id);
    }
    private void outage(AuthSessionUser actor,long asset){db.jdbc().update("INSERT INTO maintenance_outages(company_id,asset_id,started_at) SELECT ?,?,UTC_TIMESTAMP(6) WHERE NOT EXISTS(SELECT 1 FROM maintenance_outages WHERE company_id=? AND asset_id=? AND ended_at IS NULL)",actor.companyId(),asset,actor.companyId(),asset);}
    @Transactional public Asset restore(AuthSessionUser actor,long id,VersionReason input){
        actor=access.lock(actor,"assets");MaintenanceAccess.manage(actor);var asset=db.asset(actor,id);version(asset.version(),input.expectedVersion());
        require(db.jdbc().queryForObject("SELECT COUNT(*) FROM maintenance_orders WHERE company_id=? AND asset_id=? AND blocking=1 AND status NOT IN ('CLOSED','CANCELLED')",Long.class,actor.companyId(),id)==0,"maintenance_other_fault_open");
        require(db.jdbc().update("UPDATE maintenance_outages SET ended_at=UTC_TIMESTAMP(6),restored_by=?,reason=? WHERE company_id=? AND asset_id=? AND ended_at IS NULL",actor.userId(),input.reason(),actor.companyId(),id)==1,"maintenance_asset_already_available");
        db.jdbc().update("UPDATE maintenance_assets SET version=version+1 WHERE company_id=? AND id=?",actor.companyId(),id);db.audit(actor,"ASSET",id,"ASSET_RESTORED",input.reason());return db.asset(actor,id);
    }
}
