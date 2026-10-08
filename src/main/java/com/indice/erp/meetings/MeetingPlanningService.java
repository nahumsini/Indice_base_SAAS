package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import static com.indice.erp.meetings.MeetingPlanningDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeetingPlanningService {
    private final MeetingRepository repository;
    private final MeetingService meetings;
    private final MeetingRecurrencePlanner planner;
    private final ObjectMapper mapper;
    public MeetingPlanningService(MeetingRepository repository,MeetingService meetings,MeetingRecurrencePlanner planner,ObjectMapper mapper){this.repository=repository;this.meetings=meetings;this.planner=planner;this.mapper=mapper;}

    @Transactional(readOnly=true)
    public PlanPreview preview(AuthSessionUser actor,PlanRequest body){
        validatePlan(actor,body);
        var result=planner.preview(body);
        var occurrences=result.occurrences().stream().map(o->new Occurrence(o.number(),o.startAt(),o.endAt(),conflicts(actor,body.meeting(),o.startAt(),o.endAt(),0))).toList();
        return new PlanPreview(occurrences,result.count(),result.timezone(),result.monthlyClamp(),result.overlapUsesEarlierOffset());
    }
    private void validatePlan(AuthSessionUser actor,PlanRequest body){
        meetings.validate(actor,body.meeting());
        if(body.meeting().objective()==null||body.meeting().objective().isBlank()||body.meeting().expectedResult()==null||body.meeting().expectedResult().isBlank())throw new MeetingPlanningException("meeting_purpose_required");
        if(body.meeting().startAt().isBefore(Instant.now().minusSeconds(60)))throw new MeetingPlanningException("meeting_start_past");
        if(body.saveFlowName()!=null&&body.saveFlowName().length()>120)throw new IllegalArgumentException();
    }
    private int conflicts(AuthSessionUser actor,MeetingRequest body,Instant start,Instant end,long excludingSeries){
        var people=new TreeSet<>(body.participantIds());people.add(body.ownerId());
        String ids=String.join(",",people.stream().map(String::valueOf).toList());
        return repository.jdbc().queryForObject("SELECT COUNT(*) FROM meeting_records m WHERE m.company_id=? AND m.status IN ('PLANNED','IN_PROGRESS') AND m.start_at<? AND m.end_at>? AND (?=0 OR COALESCE(m.series_id,0)<>?) AND (m.owner_id IN ("+ids+") OR EXISTS(SELECT 1 FROM meeting_participants p WHERE p.company_id=m.company_id AND p.meeting_id=m.id AND p.user_id IN ("+ids+")))",Integer.class,actor.companyId(),Timestamp.from(end),Timestamp.from(start),excludingSeries,excludingSeries);
    }
    @Transactional
    public PlanResult create(AuthSessionUser actor,PlanRequest body,String key){
        meetings.lock(actor);
        String hash=meetings.fingerprint(body);Long old=meetings.replay(actor,"PLAN",key,hash);
        if(old!=null)return result(actor,old);
        var preview=preview(actor,body);
        if(!body.allowConflicts()&&preview.occurrences().stream().anyMatch(o->o.conflicts()>0))throw new MeetingPlanningException("meeting_conflicts_confirm");
        Long flow=null,series=null;var m=body.meeting();
        if(body.saveFlowName()!=null&&!body.saveFlowName().isBlank()){
            if(repository.jdbc().queryForObject("SELECT COUNT(*) FROM meeting_flows WHERE company_id=? AND archived_at IS NULL",Integer.class,actor.companyId())>=100)throw new MeetingPlanningException("meeting_flow_limit");
            var settings=new FlowSettings(m.title(),m.meetingType(),m.objective(),m.expectedResult(),m.ownerId(),m.minutesOwnerId()==null?m.ownerId():m.minutesOwnerId(),m.participantIds(),m.agenda(),m.location(),(int)Duration.between(m.startAt(),m.endAt()).toMinutes(),m.reminderMinutes()==null?0:m.reminderMinutes());
            flow=repository.insert("INSERT INTO meeting_flows(company_id,name,settings_json,created_by) VALUES(?,?,?,?)",actor.companyId(),body.saveFlowName().trim(),json(settings),actor.userId());
            audit(actor,"FLOW",flow,"FLOW_CREATED");
        }
        if(body.recurrence()!=null){
            var r=body.recurrence();series=repository.insert("INSERT INTO meeting_series(company_id,title,frequency,interval_value,occurrence_count,timezone,owner_id,created_by) VALUES(?,?,?,?,?,?,?,?)",actor.companyId(),m.title(),r.frequency(),r.interval(),r.count(),m.timezone(),m.ownerId(),actor.userId());
            audit(actor,"SERIES",series,"SERIES_CREATED");
        }
        long first=0;
        for(var o:preview.occurrences()){
            String occurrenceKey=UUID.nameUUIDFromBytes((key+"_"+o.number()).getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
            var item=meetings.create(actor,at(m,o.startAt(),o.endAt(),null),occurrenceKey);
            long id=item.meeting().id();if(first==0)first=id;
            repository.jdbc().update("UPDATE meeting_records SET series_id=?,flow_id=?,occurrence_number=? WHERE company_id=? AND id=?",series,flow,series==null?null:o.number(),actor.companyId(),id);
        }
        meetings.remember(actor,"PLAN",key,hash,first);
        return new PlanResult(first,series,preview.count(),flow);
    }
    private PlanResult result(AuthSessionUser actor,long id){
        var detail=repository.detail(actor,id);Long series=detail.planning().seriesId();
        Long flow=repository.jdbc().queryForObject("SELECT flow_id FROM meeting_records WHERE company_id=? AND id=?",Long.class,actor.companyId(),id);
        int count=series==null?1:repository.jdbc().queryForObject("SELECT occurrence_count FROM meeting_series WHERE company_id=? AND id=?",Integer.class,actor.companyId(),series);
        return new PlanResult(id,series,count,flow);
    }
    @Transactional(readOnly=true)
    public List<FlowItem> flows(AuthSessionUser actor){
        return repository.jdbc().query("SELECT id,name,settings_json,version FROM meeting_flows WHERE company_id=? AND archived_at IS NULL"+(MeetingAccessService.administrator(actor)?"":" AND created_by="+actor.userId())+" ORDER BY name,id LIMIT 100",(r,n)->new FlowItem(r.getLong(1),r.getString(2),flow(r.getString(3)),r.getLong(4)),actor.companyId());
    }
    @Transactional
    public void archiveFlow(AuthSessionUser actor,long id,long version){
        meetings.lock(actor);
        var versions=repository.jdbc().queryForList("SELECT version FROM meeting_flows WHERE company_id=? AND id=? AND archived_at IS NULL"+(MeetingAccessService.administrator(actor)?"":" AND created_by="+actor.userId())+" FOR UPDATE",Long.class,actor.companyId(),id);
        if(versions.isEmpty())throw new NoSuchElementException();MeetingService.version(versions.getFirst(),version);
        repository.jdbc().update("UPDATE meeting_flows SET archived_at=UTC_TIMESTAMP(6),archived_by=?,version=version+1 WHERE company_id=? AND id=?",actor.userId(),actor.companyId(),id);
        audit(actor,"FLOW",id,"FLOW_ARCHIVED");
    }
    private static String seriesScope(AuthSessionUser actor){return MeetingAccessService.administrator(actor)?"":" AND s.owner_id="+actor.userId();}
    @Transactional(readOnly=true)
    public Page<SeriesItem> series(AuthSessionUser actor,int page){
        if(page<1||page>10000)throw new IllegalArgumentException();
        var db=repository.jdbc();String where=" WHERE s.company_id=?"+seriesScope(actor);
        long total=db.queryForObject("SELECT COUNT(*) FROM meeting_series s"+where,Long.class,actor.companyId());
        var items=db.query("SELECT s.*,MIN(CASE WHEN m.status='PLANNED' AND m.start_at>UTC_TIMESTAMP(6) THEN m.start_at END) next_at,COUNT(CASE WHEN m.status='PLANNED' AND m.start_at>UTC_TIMESTAMP(6) THEN 1 END) future_planned FROM meeting_series s LEFT JOIN meeting_records m ON m.company_id=s.company_id AND m.series_id=s.id"+where+" GROUP BY s.id ORDER BY s.id DESC LIMIT 25 OFFSET ?",
            (r,n)->new SeriesItem(r.getLong("id"),r.getString("title"),r.getString("frequency"),r.getInt("interval_value"),r.getInt("occurrence_count"),r.getString("timezone"),r.getBoolean("reminders_paused"),r.getString("status"),r.getLong("version"),r.getTimestamp("next_at")==null?null:r.getTimestamp("next_at").toInstant(),r.getInt("future_planned")),actor.companyId(),(page-1)*25);
        return new Page<>(items,total,page,25);
    }
    private void requireSeries(AuthSessionUser actor,long id,long version){
        var versions=repository.jdbc().queryForList("SELECT s.version FROM meeting_series s WHERE s.company_id=? AND s.id=?"+seriesScope(actor)+" FOR UPDATE",Long.class,actor.companyId(),id);
        if(versions.isEmpty())throw new NoSuchElementException();MeetingService.version(versions.getFirst(),version);
    }
    @Transactional
    public void command(AuthSessionUser actor,long id,SeriesCommand body){
        meetings.lock(actor);requireSeries(actor,id,body.expectedVersion());
        if(!Set.of("PAUSE_REMINDERS","RESUME_REMINDERS","CANCEL_FUTURE").contains(body.action())||body.reason()==null||body.reason().length()>2000)throw new IllegalArgumentException();
        if(!"ACTIVE".equals(repository.jdbc().queryForObject("SELECT status FROM meeting_series WHERE company_id=? AND id=?",String.class,actor.companyId(),id)))throw new IllegalStateException();
        var upcoming=repository.jdbc().queryForList("SELECT id FROM meeting_records WHERE company_id=? AND series_id=? AND status='PLANNED' AND start_at>UTC_TIMESTAMP(6) ORDER BY start_at,id FOR UPDATE",Long.class,actor.companyId(),id);
        if(body.action().equals("CANCEL_FUTURE")){
            if(body.reason().trim().length()<3)throw new IllegalArgumentException();
            for(long meeting:upcoming){var row=repository.meeting(actor,meeting,true);meetings.transition(actor,meeting,new TransitionRequest("CANCELLED",body.reason(),row.version()));}
            repository.jdbc().update("UPDATE meeting_series SET status='CANCELLED',reminders_paused=1,version=version+1 WHERE company_id=? AND id=?",actor.companyId(),id);
        }else{
            repository.jdbc().update("UPDATE meeting_series SET reminders_paused=?,version=version+1 WHERE company_id=? AND id=?",body.action().equals("PAUSE_REMINDERS"),actor.companyId(),id);
            for(long meeting:upcoming)meetings.audit(actor,meeting,null,body.action(),"");
        }
        audit(actor,"SERIES",id,body.action());
    }
    private List<MeetingItem> futureRows(AuthSessionUser actor,long pivot){
        var row=repository.meeting(actor,pivot,true);MeetingService.owner(actor,row.ownerId());
        var meta=repository.planning(actor.companyId(),pivot);
        if(meta.seriesId()==null||!row.status().equals("PLANNED")||!row.startAt().isAfter(Instant.now()))throw new IllegalStateException();
        var ids=repository.jdbc().queryForList("SELECT id FROM meeting_records WHERE company_id=? AND series_id=? AND start_at>=? AND status='PLANNED' ORDER BY start_at,id FOR UPDATE",Long.class,actor.companyId(),meta.seriesId(),Timestamp.from(row.startAt()));
        return ids.stream().map(id->repository.meeting(actor,id,true)).toList();
    }
    private List<MeetingRequest> futureRequests(AuthSessionUser actor,long pivot,MeetingRequest body,List<MeetingItem> rows){
        var original=repository.meeting(actor,pivot,false);ZoneId zone=ZoneId.of(body.timezone());
        var anchor=original.startAt().atZone(ZoneId.of(original.timezone()));var target=body.startAt().atZone(zone);
        long shift=ChronoUnit.DAYS.between(anchor.toLocalDate(),target.toLocalDate());long duration=Duration.between(body.startAt(),body.endAt()).getSeconds();
        return rows.stream().map(row->{var date=row.startAt().atZone(ZoneId.of(row.timezone())).toLocalDate().plusDays(shift);var local=LocalDateTime.of(date,target.toLocalTime());var offsets=zone.getRules().getValidOffsets(local);if(offsets.isEmpty())throw new MeetingPlanningException("meeting_time_gap");var start=local.toInstant(offsets.getFirst());if(!start.isAfter(Instant.now()))throw new MeetingPlanningException("meeting_start_past");return at(body,start,start.plusSeconds(duration),row.version());}).toList();
    }
    @Transactional
    public PlanPreview previewFuture(AuthSessionUser actor,long pivot,FutureEdit body){
        meetings.lock(actor);meetings.validate(actor,body.meeting());
        var meta=repository.planning(actor.companyId(),repository.meeting(actor,pivot,false).id());requireSeries(actor,meta.seriesId()==null?0:meta.seriesId(),body.expectedSeriesVersion());
        var rows=futureRows(actor,pivot);var requests=futureRequests(actor,pivot,body.meeting(),rows);var result=new ArrayList<Occurrence>();
        for(int i=0;i<requests.size();i++){var m=requests.get(i);result.add(new Occurrence(i+1,m.startAt(),m.endAt(),conflicts(actor,m,m.startAt(),m.endAt(),meta.seriesId())));}
        return new PlanPreview(result,result.size(),body.meeting().timezone(),false,false);
    }
    @Transactional
    public MeetingDetail editFuture(AuthSessionUser actor,long pivot,FutureEdit body){
        meetings.lock(actor);var row=repository.meeting(actor,pivot,true);MeetingService.version(row.version(),body.meeting().expectedVersion());
        var meta=repository.planning(actor.companyId(),pivot);requireSeries(actor,meta.seriesId()==null?0:meta.seriesId(),body.expectedSeriesVersion());
        var rows=futureRows(actor,pivot);var requests=futureRequests(actor,pivot,body.meeting(),rows);
        if(requests.stream().anyMatch(m->conflicts(actor,m,m.startAt(),m.endAt(),meta.seriesId())>0))throw new MeetingPlanningException("meeting_future_conflict");
        for(int i=0;i<rows.size();i++)meetings.edit(actor,rows.get(i).id(),requests.get(i));
        repository.jdbc().update("UPDATE meeting_series SET title=?,timezone=?,owner_id=?,version=version+1 WHERE company_id=? AND id=?",body.meeting().title(),body.meeting().timezone(),body.meeting().ownerId(),actor.companyId(),meta.seriesId());
        audit(actor,"SERIES",meta.seriesId(),"FUTURE_PLANNING_UPDATED");
        return repository.detail(actor,pivot);
    }
    private static MeetingRequest at(MeetingRequest m,Instant start,Instant end,Long version){return new MeetingRequest(m.title(),m.meetingType(),start,end,m.timezone(),m.ownerId(),m.participantIds(),m.agenda(),m.location(),version,m.objective(),m.expectedResult(),m.minutesOwnerId(),m.reminderMinutes());}
    private void audit(AuthSessionUser actor,String type,long id,String action){repository.jdbc().update("INSERT INTO meeting_workflow_audit(company_id,entity_type,entity_id,action,actor_id) VALUES(?,?,?,?,?)",actor.companyId(),type,id,action,actor.userId());}
    private String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception impossible){throw new IllegalStateException("Cannot serialize flow settings.");}}
    private FlowSettings flow(String value){try{return mapper.readValue(value,FlowSettings.class);}catch(Exception invalid){throw new IllegalStateException("Flow settings unavailable.");}}
}
