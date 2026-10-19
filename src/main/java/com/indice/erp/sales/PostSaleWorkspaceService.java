package com.indice.erp.sales;

import static com.indice.erp.sales.PostSaleWorkspaceDtos.*;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PostSaleWorkspaceService {
    static class Conflict extends RuntimeException { }
    static final List<Stage> DEFAULT_STAGES=List.of(new Stage("pending","Pending","BLUE"),
        new Stage("coordination","Coordination","AQUA"),new Stage("delivery","Delivery / service","YELLOW"),
        new Stage("verification","Customer verification","VIOLET"),new Stage("completed","Completed","GREEN"));
    private final PostSaleWorkspaceRepository repo;
    private final org.springframework.jdbc.core.JdbcTemplate db;
    private final SalesService sales;
    private final FinanceBusinessTimeZoneResolver zones;
    private final Clock clock;
    PostSaleWorkspaceService(PostSaleWorkspaceRepository repo,SalesService sales,FinanceBusinessTimeZoneResolver zones,Clock clock,org.springframework.jdbc.core.JdbcTemplate db) {
        this.db=db;
        this.repo=repo;this.sales=sales;this.zones=zones;this.clock=clock;
    }
    static String kind(String kind) {
        if(kind==null||!Set.of("won","lost").contains(kind)) throw new IllegalArgumentException(); return kind;
    }
    static String text(String value,int max,boolean required) {
        String clean=value==null?"":value.trim();
        if(clean.length()>max||(required&&clean.isEmpty())) throw new IllegalArgumentException();return clean;
    }
    String hash(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(repo.encode(value).getBytes(StandardCharsets.UTF_8))); }
        catch(Exception ex) { throw new IllegalArgumentException(); }
    }
    static void key(String key) { if(key==null||!UUID.fromString(key).toString().equals(key)) throw new IllegalArgumentException(); }
    List<Flow> flows(long company) {
        var rows=new ArrayList<Flow>();rows.add(new Flow(0,"Delivery and service",0,false,DEFAULT_STAGES));rows.addAll(repo.flows(company));return rows;
    }
    Flow flow(long company,long id) { return flows(company).stream().filter(f->f.id()==id).findFirst().orElseThrow(NoSuchElementException::new); }
    @Transactional(readOnly=true)
    Workspace workspace(long company,String kind,String search,Long owner,Long flow,String stage,int page,int size,boolean canReactivate) {
        return workspace(company,kind,search,owner,flow,stage,page,size,canReactivate,new WorkspaceSort("nextAction","asc"));
    }
    @Transactional(readOnly=true)
    Workspace workspace(long company,String kind,String search,Long owner,Long flow,String stage,int page,int size,boolean canReactivate,WorkspaceSort sort) {
        kind(kind);if(page<1||page>100000||size<1||size>100||search!=null&&search.length()>200)throw new IllegalArgumentException();
        if(sort==null||kind.equals("won")&&sort.column().equals("lossReason"))throw new IllegalArgumentException();
        var today=LocalDate.now(clock.withZone(zones.resolve(company)));
        var q=repo.source(company,kind,search,owner,flow,stage);
        var availableFlows=flows(company);
        return new Workspace(repo.items(q,kind,page,size,sort,availableFlows),repo.counts(q,kind,today),page,size,availableFlows,repo.owners(company),today.toString(),zones.resolve(company).getId(),canReactivate);
    }
    Detail detail(long company,String kind,long source) {
        var item=repo.item(company,kind(kind),source);
        return new Detail(item,item.workId()==null?List.of():repo.history(company,item.workId()));
    }
    @Transactional
    Flow saveFlow(long company,long user,Long id,SaveFlow request) {
        repo.lockCompany(company);repo.actor(company,user);key(request.requestKey());
        String name=text(request.name(),160,true);
        var stages=request.stages();
        if(stages==null||stages.size()<2||stages.size()>12)throw new IllegalArgumentException();
        var keys=new HashSet<String>();var clean=new ArrayList<Stage>();
        for(var stage:stages) {
            if(stage==null||stage.key()==null||!stage.key().matches("[a-z][a-z0-9_]{0,49}")||!keys.add(stage.key())
                ||stage.colorToken()==null||!Set.of("BLUE","AQUA","GREEN","YELLOW","CORAL","VIOLET","SLATE").contains(stage.colorToken()))throw new IllegalArgumentException();
            clean.add(new Stage(stage.key(),text(stage.label(),80,true),stage.colorToken()));
        }
        if(!clean.getLast().key().equals("completed"))throw new IllegalArgumentException();
        String requestHash=hash(request);
        if(id==null) {
            var prior=db.query("SELECT id,creation_hash FROM sales_post_sale_flows WHERE company_id=? AND creation_key=?",
                (rs,n)->Map.entry(rs.getLong(1),rs.getString(2)),company,request.requestKey());
            if(!prior.isEmpty()) {if(!prior.getFirst().getValue().equals(requestHash))throw new Conflict();return flow(company,prior.getFirst().getKey());}
            if(request.archived()||repo.flows(company).stream().filter(f->!f.archived()).count()>=10)throw new IllegalArgumentException();
            db.update("""
                INSERT INTO sales_post_sale_flows(company_id,name,stages_json,creation_key,creation_hash,created_by_user_id,updated_by_user_id)
                VALUES(?,?,CAST(? AS JSON),?,?,?,?)
                """,company,name,repo.encode(clean),request.requestKey(),requestHash,user,user);
            long created=db.queryForObject("SELECT id FROM sales_post_sale_flows WHERE company_id=? AND creation_key=?",Long.class,company,request.requestKey());
            return flow(company,created);
        }
        if(id==0)throw new IllegalArgumentException();
        var current=flow(company,id);
        if(request.version()==null||request.version()!=current.version()) {
            if(request.version()!=null&&request.version()+1==current.version()&&current.name().equals(name)&&current.stages().equals(clean)&&current.archived()==request.archived())return current;
            throw new Conflict();
        }
        var used=db.query("SELECT DISTINCT stage_key FROM sales_post_sale_work WHERE company_id=? AND flow_id=?",(rs,n)->rs.getString(1),company,id);
        if(!keys.containsAll(used)||request.archived()&&!used.isEmpty())throw new Conflict();
        db.update("UPDATE sales_post_sale_flows SET name=?,stages_json=CAST(? AS JSON),archived=?,version=version+1,updated_by_user_id=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",
            name,repo.encode(clean),request.archived(),user,company,id);
        return flow(company,id);
    }
    private void lockSource(long company,String kind,long source) {
        String table=kind(kind).equals("won")?"sales_records":"sales_opportunities";
        if(db.query("SELECT id FROM "+table+" WHERE company_id=? AND id=? AND deleted_at IS NULL FOR UPDATE",(rs,n)->rs.getLong(1),company,source).isEmpty())throw new NoSuchElementException();
    }
    private boolean replay(long company,Item current,String key,String hash) {
        if(current.workId()==null)return false;
        var saved=db.queryForMap("SELECT last_request_key,last_request_hash FROM sales_post_sale_work WHERE company_id=? AND id=?",company,current.workId());
        if(!key.equals(saved.get("last_request_key")))return false;
        if(!hash.equals(saved.get("last_request_hash")))throw new Conflict();return true;
    }
    @Transactional
    Detail save(long company,long user,String kind,long source,SaveWork request) {
        kind(kind);key(request.requestKey());repo.lockCompany(company);lockSource(company,kind,source);
        String actor=repo.actor(company,user);var current=repo.item(company,kind,source);String requestHash=hash(request);
        if(replay(company,current,request.requestKey(),requestHash))return detail(company,kind,source);
        if(current.version()!=request.version()||current.recoveredOpportunityId()!=null)throw new Conflict();
        if(request.ownerId()==null||repo.owners(company).stream().noneMatch(o->o.id()==request.ownerId()))throw new IllegalArgumentException();
        String action=text(request.nextAction(),240,request.nextActionDate()!=null);
        String notes=text(request.notes(),8000,false);String loss=text(request.lossReason(),500,kind.equals("lost"));
        if(request.nextActionDate()!=null&&(request.nextActionDate().getYear()<2000||request.nextActionDate().getYear()>2200))throw new IllegalArgumentException();
        long flowId=kind.equals("won")&&request.flowId()!=null?request.flowId():0;
        String stageKey="pending";
        if(kind.equals("won")) {
            var flow=flow(company,flowId);
            if(flow.archived())throw new Conflict();
            stageKey=text(request.stageKey(),50,true);String selected=stageKey;
            if(flow.stages().stream().noneMatch(s->s.key().equals(selected)))throw new IllegalArgumentException();
        }
        String status=request.paused()?"paused":request.nextActionDate()==null?"unscheduled":"scheduled";
        if(kind.equals("won")&&request.paused())throw new IllegalArgumentException();
        if(current.workId()==null) {
            db.update("""
                INSERT INTO sales_post_sale_work(company_id,source_kind,source_id,flow_id,stage_key,owner_user_company_id,next_action,next_action_date,notes,loss_reason,
                 recovery_status,last_request_key,last_request_hash,created_by_user_id,updated_by_user_id)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,company,kind,source,flowId==0?null:flowId,stageKey,request.ownerId(),action,request.nextActionDate(),notes,loss,status,request.requestKey(),requestHash,user,user);
        } else {
            db.update("""
                UPDATE sales_post_sale_work SET flow_id=?,stage_key=?,owner_user_company_id=?,next_action=?,next_action_date=?,notes=?,loss_reason=?,recovery_status=?,
                last_request_key=?,last_request_hash=?,version=version+1,updated_by_user_id=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?
                """,flowId==0?null:flowId,stageKey,request.ownerId(),action,request.nextActionDate(),notes,loss,status,request.requestKey(),requestHash,user,company,current.workId());
        }
        var saved=repo.item(company,kind,source);
        repo.event(company,saved.workId(),user,actor,"updated",Map.of("stageKey",stageKey,"flowId",flowId,"nextAction",action,
            "nextActionDate",request.nextActionDate()==null?"":request.nextActionDate().toString(),"notes",notes,"lossReason",loss,"ownerId",request.ownerId(),"recoveryStatus",status));
        cancelNotifications(company,saved.workId());
        return detail(company,kind,source);
    }
    @Transactional
    Detail reactivate(long company,long user,long source,Reactivate request) {
        key(request.requestKey());repo.lockCompany(company);lockSource(company,"lost",source);
        var actor=repo.actor(company,user);var current=repo.item(company,"lost",source);String requestHash=hash(request);
        if(replay(company,current,request.requestKey(),requestHash))return detail(company,"lost",source);
        if(current.workId()==null||current.version()!=request.version()||current.recoveredOpportunityId()!=null)throw new Conflict();
        if(current.ownerId()==null||repo.owners(company).stream().noneMatch(o->o.id()==current.ownerId()))throw new IllegalArgumentException();
        var previous=sales.get(company,"opportunities",source);
        var payload=new LinkedHashMap<String,Object>();
        for(String field:List.of("contactId","unitId","businessId","companyName","contactPerson","phone","email","currency"))
            if(previous.get(field)!=null)payload.put(field,previous.get(field));
        payload.put("flowId",request.flowId()==null?previous.get("flowId"):request.flowId());
        payload.put("opportunityName",text(request.opportunityName(),220,true));
        payload.put("source","post_sale_opportunity");payload.put("status","active");
        payload.put("ownerUserCompanyId",current.ownerId());payload.put("ownerName",current.ownerName());
        payload.put("estimatedValue",java.math.BigDecimal.ZERO);
        payload.put("nextAction","follow_up");payload.put("nextActionAt",LocalDate.now(clock.withZone(zones.resolve(company))).toString());
        payload.put("notes",current.notes());
        payload.put("customFields",Map.of("recoveredFromOpportunityId",source,"postSaleWorkId",current.workId(),"previousLossReason",current.lossReason()));
        var created=sales.create(company,user,"opportunities",payload);
        long id=((Number)created.get("id")).longValue();
        db.update("""
            UPDATE sales_post_sale_work SET recovered_opportunity_id=?,recovery_status='recovered',version=version+1,
            last_request_key=?,last_request_hash=?,updated_by_user_id=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?
            """,id,request.requestKey(),requestHash,user,company,current.workId());
        repo.event(company,current.workId(),user,actor,"reactivated",Map.of("opportunityId",id,"opportunityName",payload.get("opportunityName")));
        cancelNotifications(company,current.workId());return detail(company,"lost",source);
    }
    void cancelNotifications(long company,long work) {
        db.update("UPDATE app_notifications SET status='cancelled' WHERE company_id=? AND source_module='sales' AND source_type='post_sale_work' AND source_id=? AND status<>'cancelled'",company,work);
    }
}
