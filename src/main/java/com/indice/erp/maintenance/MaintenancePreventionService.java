package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.core.type.TypeReference;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.maintenance.MaintenanceDtos.*;
import static com.indice.erp.maintenance.MaintenancePolicy.*;
import static com.indice.erp.maintenance.MaintenanceRepository.time;

@Service
public class MaintenancePreventionService {
    private final MaintenanceRepository db;
    private final MaintenanceAccess access;
    private final MaintenanceService service;
    public MaintenancePreventionService(MaintenanceRepository db,MaintenanceAccess access,MaintenanceService service){this.db=db;this.access=access;this.service=service;}
    private RowMapper<Plan> row(){return (r,n)->new Plan(r.getLong("id"),r.getLong("asset_id"),r.getString("asset_name"),r.getString("title"),r.getString("description"),r.getString("priority"),r.getDate("anchor_date").toLocalDate(),r.getString("frequency"),r.getInt("interval_count"),r.getString("timezone"),r.getInt("lead_days"),r.getInt("next_cycle"),r.getDate("next_date").toLocalDate(),db.parse(r.getString("checklist"),new TypeReference<List<Step>>(){}),r.getBoolean("evidence_required"),r.getBoolean("active"),r.getString("currency"),r.getBigDecimal("estimated_amount"),r.getLong("version"));}
    private static final String SELECT="SELECT p.*,a.name asset_name FROM maintenance_plans p JOIN maintenance_assets a ON a.company_id=p.company_id AND a.id=p.asset_id";
    public Plan plan(AuthSessionUser actor,long id){MaintenanceAccess.manage(actor);var f=access.filter(actor,"a","ASSET");var args=new ArrayList<Object>(List.of(actor.companyId(),id));args.addAll(f.args());return db.one(db.jdbc().query(SELECT+" WHERE p.company_id=? AND p.id=?"+f.sql(),row(),args.toArray()));}
    public Page<Plan> plans(AuthSessionUser actor,String search,int page,int size){return plans(actor,search,page,size,"next","asc");}
    public Page<Plan> plans(AuthSessionUser actor,String search,int page,int size,String sort,String direction){MaintenanceAccess.manage(actor);var f=access.filter(actor,"a","ASSET");var args=new ArrayList<Object>(List.of(actor.companyId(),"%"+MaintenanceRepository.escape(search)+"%"));args.addAll(f.args());String where=" WHERE p.company_id=? AND p.title LIKE ?"+f.sql();long count=db.jdbc().queryForObject("SELECT COUNT(*) FROM maintenance_plans p JOIN maintenance_assets a ON a.company_id=p.company_id AND a.id=p.asset_id"+where,Long.class,args.toArray());args.add(size);args.add((page-1)*size);return new Page<>(db.jdbc().query(SELECT+where+MaintenanceSort.clause("plans",sort,direction)+" LIMIT ? OFFSET ?",row(),args.toArray()),count,page,size);}
    @Transactional public Plan create(AuthSessionUser actor,PlanInput input,String key){
        actor=access.lock(actor,"preventive");MaintenanceAccess.manage(actor);Long prior=service.replay(actor,"PLAN",key,input);if(prior!=null)return plan(actor,prior);
        var asset=db.asset(actor,input.assetId());require(asset.active(),"maintenance_asset_inactive");priority(input.priority());currency(input.currency());var zone=ZoneId.of(input.timezone());cycle(input.anchorDate(),input.frequency(),input.intervalCount(),1);
        require(!input.anchorDate().isBefore(LocalDate.now(zone))&&input.anchorDate().isBefore(LocalDate.now(zone).plusYears(10)),"maintenance_plan_anchor_invalid");require(input.checklist().stream().noneMatch(Step::done),"maintenance_procedure_invalid");
        long id=db.insert("INSERT INTO maintenance_plans(company_id,asset_id,title,description,priority,anchor_date,frequency,interval_count,timezone,lead_days,next_date,checklist,evidence_required,currency,estimated_amount,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",actor.companyId(),input.assetId(),input.title().trim(),input.description().trim(),input.priority(),input.anchorDate(),input.frequency(),input.intervalCount(),input.timezone(),input.leadDays(),input.anchorDate(),db.json(input.checklist()),input.evidenceRequired(),input.currency(),money(input.estimatedAmount()),actor.userId());
        service.remember(actor,"PLAN",key,input,id);db.audit(actor,"PLAN",id,"PLAN_CREATED","");return plan(actor,id);
    }
    @Transactional public Plan toggle(AuthSessionUser actor,long id,Toggle input){
        actor=access.lock(actor,"preventive");MaintenanceAccess.manage(actor);var plan=plan(actor,id);version(plan.version(),input.expectedVersion());require(!input.active()||db.asset(actor,plan.assetId()).active(),"maintenance_asset_inactive");
        db.jdbc().update("UPDATE maintenance_plans SET active=?,version=version+1 WHERE company_id=? AND id=?",input.active(),actor.companyId(),id);db.audit(actor,"PLAN",id,input.active()?"PLAN_RESUMED":"PLAN_PAUSED",input.reason());return plan(actor,id);
    }
    /** One approved plan per transaction; current creator permissions and organizational scope are rechecked. */
    @Transactional public int generate(long company,long planId,Instant now){
        var creators=db.jdbc().queryForList("SELECT created_by FROM maintenance_plans WHERE company_id=? AND id=? AND active=1",Long.class,company,planId);if(creators.isEmpty())return 0;
        var actor=access.lock(new AuthSessionUser(creators.getFirst(),company,"","user"),"preventive");MaintenanceAccess.manage(actor);
        var plan=plan(actor,planId);if(!plan.active())return 0;var asset=db.asset(actor,plan.assetId());if(!asset.active())return 0;
        var horizon=now.atZone(ZoneId.of(plan.timezone())).toLocalDate().plusDays(plan.leadDays());int index=plan.nextCycle(),count=0;LocalDate next=plan.nextDate();
        while(!next.isAfter(horizon)&&count<30){
            var due=next.plusDays(1).atStartOfDay(ZoneId.of(plan.timezone())).toInstant().minusSeconds(1);
            var existing=db.jdbc().queryForObject("SELECT COUNT(*) FROM maintenance_orders WHERE company_id=? AND plan_id=? AND plan_cycle=?",Long.class,company,planId,index);
            if(existing==0){
                var input=new OrderInput(plan.assetId(),plan.title(),plan.description(),"PREVENTIVE",plan.priority(),"",null,due,null,null,plan.timezone(),plan.checklist(),plan.evidenceRequired(),false,plan.currency(),plan.estimatedAmount(),"",null);
                long order=service.insertOrder(actor,input,asset.unitId(),asset.businessId(),null,planId,index);db.audit(actor,"ORDER",order,"PREVENTIVE_GENERATED",next.toString());
            }
            index++;count++;next=cycle(plan.anchorDate(),plan.frequency(),plan.intervalCount(),index);
        }
        if(count>0)db.jdbc().update("UPDATE maintenance_plans SET next_cycle=?,next_date=?,version=version+1 WHERE company_id=? AND id=?",index,next,company,planId);
        return count;
    }
    public Metrics metrics(AuthSessionUser actor,Instant from,Instant to){
        MaintenanceAccess.manage(actor);require(from.isBefore(to)&&!to.isAfter(from.plusSeconds(366*86400L)),"maintenance_period_invalid");
        var f=access.filter(actor,"o","ORDER");var args=new ArrayList<Object>();args.add(time(from));args.add(time(to));args.add(time(from));args.add(time(to));args.add(time(from));args.add(time(to));args.add(actor.companyId());args.addAll(f.args());
        var counts=db.jdbc().queryForMap("SELECT COUNT(CASE WHEN o.status NOT IN ('CLOSED','CANCELLED') THEN 1 END) open_count,COUNT(CASE WHEN o.status NOT IN ('CLOSED','CANCELLED') AND o.due_at<UTC_TIMESTAMP(6) THEN 1 END) overdue,COUNT(CASE WHEN o.status NOT IN ('CLOSED','CANCELLED') AND o.priority='CRITICAL' THEN 1 END) critical,COUNT(CASE WHEN o.order_type='PREVENTIVE' AND o.status<>'CANCELLED' AND o.original_due_at>=? AND o.original_due_at<? THEN 1 END) preventive_due,COUNT(CASE WHEN o.order_type='PREVENTIVE' AND o.status='CLOSED' AND o.closed_at<=o.original_due_at AND o.original_due_at>=? AND o.original_due_at<? THEN 1 END) preventive_on_time,AVG(CASE WHEN o.status='CLOSED' AND o.closed_at>=? AND o.closed_at<? AND o.started_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND,o.started_at,o.closed_at)/3600.0 END) repair_hours FROM maintenance_orders o WHERE o.company_id=?"+f.sql(),args.toArray());
        var requestScope=access.filter(actor,"r","REQUEST");var rp=new ArrayList<Object>(List.of(actor.companyId(),time(from),time(to)));rp.addAll(requestScope.args());
        Double response=db.jdbc().queryForObject("SELECT AVG(TIMESTAMPDIFF(SECOND,r.created_at,r.response_at)/3600.0) FROM maintenance_requests r WHERE r.company_id=? AND r.response_at>=? AND r.response_at<?"+requestScope.sql(),Double.class,rp.toArray());
        var assetScope=access.filter(actor,"a","ASSET");var dp=new ArrayList<Object>(List.of(time(from),time(to),actor.companyId(),time(to),time(from)));dp.addAll(assetScope.args());
        Double downtime=db.jdbc().queryForObject("SELECT SUM(TIMESTAMPDIFF(SECOND,GREATEST(d.started_at,?),LEAST(COALESCE(d.ended_at,UTC_TIMESTAMP(6)),?)))/3600.0 FROM maintenance_outages d JOIN maintenance_assets a ON a.company_id=d.company_id AND a.id=d.asset_id WHERE d.company_id=? AND d.started_at<? AND COALESCE(d.ended_at,UTC_TIMESTAMP(6))>?"+assetScope.sql(),Double.class,dp.toArray());
        return new Metrics(from,to,number(counts,"open_count"),number(counts,"overdue"),number(counts,"critical"),number(counts,"preventive_due"),number(counts,"preventive_on_time"),response,decimal(counts.get("repair_hours")),downtime);
    }
    private static long number(Map<String,Object> row,String key){return ((Number)row.get(key)).longValue();}
    private static Double decimal(Object value){return value==null?null:((Number)value).doubleValue();}
}
