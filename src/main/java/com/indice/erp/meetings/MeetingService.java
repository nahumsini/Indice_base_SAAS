package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeetingService {
    private final MeetingRepository repository;
    private final ModuleAccessService modules;
    private final ObjectMapper mapper;
    public MeetingService(MeetingRepository repository,ModuleAccessService modules,ObjectMapper mapper){this.repository=repository;this.modules=modules;this.mapper=mapper;}
    void lock(AuthSessionUser actor){
        repository.jdbc().queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());
        if(!modules.companyCanAccessForMutation(actor.companyId(),"control_minutas"))throw new SecurityException();
        member(actor.companyId(),actor.userId());
    }
    void member(long company,long user){
        if(repository.jdbc().query("SELECT user_id FROM user_companies WHERE company_id=? AND user_id=? AND status='active' FOR SHARE",(r,n)->r.getLong(1),company,user).isEmpty())throw new IllegalArgumentException("Active company member required.");
    }
    static void owner(AuthSessionUser actor,long owner){if(!MeetingAccessService.administrator(actor)&&actor.userId()!=owner)throw new SecurityException();}
    static void version(long current,Long expected){if(expected==null||expected!=current)throw new IllegalStateException();}
    String fingerprint(Object body){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8)));}catch(Exception impossible){throw new IllegalStateException("Cannot fingerprint request.",impossible);}}
    Long replay(AuthSessionUser actor,String type,String key,String hash){
        if(key==null||!key.matches("[A-Za-z0-9_-]{16,80}"))throw new IllegalArgumentException("Request key required.");
        var rows=repository.jdbc().queryForList("SELECT entity_id,fingerprint FROM meeting_create_replays WHERE company_id=? AND actor_id=? AND entity_type=? AND request_key=?",actor.companyId(),actor.userId(),type,key);
        if(rows.isEmpty())return null;if(!hash.equals(rows.getFirst().get("fingerprint")))throw new IllegalStateException();return ((Number)rows.getFirst().get("entity_id")).longValue();
    }
    void remember(AuthSessionUser actor,String type,String key,String hash,long id){repository.jdbc().update("INSERT INTO meeting_create_replays(company_id,actor_id,request_key,entity_type,entity_id,fingerprint) VALUES(?,?,?,?,?,?)",actor.companyId(),actor.userId(),key,type,id,hash);}
    void audit(AuthSessionUser actor,long meeting,Long agreement,String action,String reason){repository.jdbc().update("INSERT INTO meeting_audit(company_id,meeting_id,agreement_id,action,actor_id,reason) VALUES(?,?,?,?,?,?)",actor.companyId(),meeting,agreement,action,actor.userId(),reason);}
    void validate(AuthSessionUser actor,MeetingRequest body){
        if(body.title()==null||body.title().isBlank()||body.title().length()>180||!Set.of("BOARD","WORKING","PROJECT").contains(body.meetingType()))throw new IllegalArgumentException();
        ZoneId.of(body.timezone());
        if(body.startAt()==null||body.endAt()==null||!body.startAt().isBefore(body.endAt())||body.endAt().isAfter(body.startAt().plusSeconds(12*3600))||body.startAt().isBefore(Instant.parse("2000-01-01T00:00:00Z"))||body.startAt().isAfter(Instant.parse("2100-01-01T00:00:00Z")))throw new IllegalArgumentException();
        if(body.agenda()==null||body.agenda().length()>10000||body.location()==null||body.location().length()>240||body.participantIds()==null||body.participantIds().size()>100)throw new IllegalArgumentException();
        owner(actor,body.ownerId());member(actor.companyId(),body.ownerId());
        for(Long id:body.participantIds()){if(id==null||id<=0)throw new IllegalArgumentException();member(actor.companyId(),id);}
        if(body.objective()!=null&&body.objective().length()>1000||body.expectedResult()!=null&&body.expectedResult().length()>1000)throw new IllegalArgumentException();
        if(body.minutesOwnerId()!=null){member(actor.companyId(),body.minutesOwnerId());if(body.minutesOwnerId()!=body.ownerId()&&!body.participantIds().contains(body.minutesOwnerId()))throw new MeetingPlanningException("meeting_minutes_owner_invalid");}
        if(body.reminderMinutes()!=null&&!Set.of(0,15,30,60,1440).contains(body.reminderMinutes()))throw new IllegalArgumentException();
    }
    private void savePlanning(AuthSessionUser actor,long id,MeetingRequest body,PlanningMetadata prior,long oldOwner){
        repository.jdbc().update("UPDATE meeting_records SET objective=?,expected_result=?,minutes_owner_id=?,reminder_minutes=? WHERE company_id=? AND id=?",
            body.objective()!=null?body.objective().trim():prior==null?"":prior.objective(),body.expectedResult()!=null?body.expectedResult().trim():prior==null?"":prior.expectedResult(),
            body.minutesOwnerId()!=null?body.minutesOwnerId():prior==null||prior.minutesOwner().id()==oldOwner?body.ownerId():prior.minutesOwner().id(),body.reminderMinutes()!=null?body.reminderMinutes():prior==null?0:prior.reminderMinutes(),actor.companyId(),id);
    }
    private void participants(AuthSessionUser actor,long id,MeetingRequest body){
        var retained=new HashSet<>(body.participantIds());retained.add(body.ownerId());
        var assigned=repository.jdbc().queryForList("SELECT assignee_id FROM meeting_agreements WHERE company_id=? AND meeting_id=? AND status='OPEN'",Long.class,actor.companyId(),id);
        if(!retained.containsAll(assigned))throw new IllegalStateException();
        repository.jdbc().update("DELETE FROM meeting_participants WHERE company_id=? AND meeting_id=?",actor.companyId(),id);
        for(long user:new TreeSet<>(body.participantIds()))repository.jdbc().update("INSERT INTO meeting_participants(company_id,meeting_id,user_id) VALUES(?,?,?)",actor.companyId(),id,user);
    }
    @Transactional public MeetingDetail create(AuthSessionUser actor,MeetingRequest body,String key){
        lock(actor);validate(actor,body);String hash=fingerprint(body);Long old=replay(actor,"MEETING",key,hash);
        if(old!=null)return repository.detail(actor,old);
        long id=repository.insert("INSERT INTO meeting_records(company_id,title,meeting_type,start_at,end_at,timezone,owner_id,agenda,location,minutes,decisions,created_by) VALUES(?,?,?,?,?,?,?,?,?,'','',?)",actor.companyId(),body.title().trim(),body.meetingType(),Timestamp.from(body.startAt()),Timestamp.from(body.endAt()),body.timezone(),body.ownerId(),body.agenda().trim(),body.location().trim(),actor.userId());
        participants(actor,id,body);savePlanning(actor,id,body,null,body.ownerId());remember(actor,"MEETING",key,hash,id);audit(actor,id,null,"MEETING_CREATED","");return repository.detail(actor,id);
    }
    @Transactional public MeetingDetail edit(AuthSessionUser actor,long id,MeetingRequest body){
        lock(actor);var row=repository.meeting(actor,id,true);owner(actor,row.ownerId());version(row.version(),body.expectedVersion());validate(actor,body);
        var prior=repository.planning(actor.companyId(),id);
        long minutesOwner=body.minutesOwnerId()!=null?body.minutesOwnerId():prior.minutesOwner().id()==row.ownerId()?body.ownerId():prior.minutesOwner().id();
        if(minutesOwner!=body.ownerId()&&!body.participantIds().contains(minutesOwner))throw new MeetingPlanningException("meeting_minutes_owner_invalid");
        if(!row.status().equals("PLANNED"))throw new IllegalStateException();participants(actor,id,body);
        repository.jdbc().update("UPDATE meeting_records SET title=?,meeting_type=?,start_at=?,end_at=?,timezone=?,owner_id=?,agenda=?,location=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",body.title().trim(),body.meetingType(),Timestamp.from(body.startAt()),Timestamp.from(body.endAt()),body.timezone(),body.ownerId(),body.agenda().trim(),body.location().trim(),actor.companyId(),id);
        savePlanning(actor,id,body,prior,row.ownerId());audit(actor,id,null,"MEETING_UPDATED","");return repository.detail(actor,id);
    }
    @Transactional public MeetingDetail minutes(AuthSessionUser actor,long id,MinutesRequest body){
        lock(actor);var row=repository.meeting(actor,id,true);
        if(!MeetingAccessService.administrator(actor)&&actor.userId()!=row.ownerId()&&actor.userId()!=repository.planning(actor.companyId(),id).minutesOwner().id())throw new SecurityException();
        version(row.version(),body.expectedVersion());
        if(!Set.of("PLANNED","IN_PROGRESS").contains(row.status()))throw new IllegalStateException();
        if(body.minutes()==null||body.decisions()==null||body.minutes().length()>20000||body.decisions().length()>10000)throw new IllegalArgumentException();
        repository.jdbc().update("UPDATE meeting_records SET minutes=?,decisions=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",body.minutes().trim(),body.decisions().trim(),actor.companyId(),id);
        audit(actor,id,null,"MINUTES_SAVED","");return repository.detail(actor,id);
    }
    @Transactional public MeetingDetail transition(AuthSessionUser actor,long id,TransitionRequest body){
        lock(actor);var row=repository.meeting(actor,id,true);owner(actor,row.ownerId());version(row.version(),body.expectedVersion());
        boolean valid=row.status().equals("PLANNED")&&Set.of("IN_PROGRESS","CANCELLED").contains(body.status())||row.status().equals("IN_PROGRESS")&&Set.of("COMPLETED","CANCELLED").contains(body.status());
        if(!valid||body.status().equals("COMPLETED")&&!row.hasMinutes())throw new IllegalStateException();
        if(body.reason()==null||body.reason().length()>2000||body.status().equals("CANCELLED")&&body.reason().trim().length()<3)throw new IllegalArgumentException();
        repository.jdbc().update("UPDATE meeting_records SET status=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",body.status(),actor.companyId(),id);
        audit(actor,id,null,"MEETING_"+body.status(),body.reason().trim());return repository.detail(actor,id);
    }
    @Transactional public AgreementItem agreement(AuthSessionUser actor,AgreementRequest body,String key){
        lock(actor);var meeting=repository.meeting(actor,body.meetingId(),true);owner(actor,meeting.ownerId());
        if(body.title()==null||body.title().isBlank()||body.title().length()>240||body.dueDate()==null||body.dueDate().isBefore(LocalDate.of(2000,1,1))||body.dueDate().isAfter(LocalDate.of(2100,1,1)))throw new IllegalArgumentException();
        String hash=fingerprint(body);Long old=replay(actor,"AGREEMENT",key,hash);if(old!=null)return repository.agreement(actor,old,false);
        if(meeting.status().equals("CANCELLED"))throw new IllegalStateException();member(actor.companyId(),body.assigneeId());
        if(meeting.ownerId()!=body.assigneeId()&&repository.participants(actor.companyId(),meeting.id()).stream().noneMatch(p->p.id()==body.assigneeId()))throw new IllegalArgumentException();
        long id=repository.insert("INSERT INTO meeting_agreements(company_id,meeting_id,title,assignee_id,due_date) VALUES(?,?,?,?,?)",actor.companyId(),body.meetingId(),body.title().trim(),body.assigneeId(),java.sql.Date.valueOf(body.dueDate()));
        remember(actor,"AGREEMENT",key,hash,id);audit(actor,body.meetingId(),id,"AGREEMENT_CREATED","");return repository.agreement(actor,id,false);
    }
    @Transactional public AgreementItem agreementStatus(AuthSessionUser actor,long id,TransitionRequest body){
        lock(actor);var row=repository.agreement(actor,id,true);version(row.version(),body.expectedVersion());
        if(!row.status().equals("OPEN")||!Set.of("DONE","CANCELLED").contains(body.status()))throw new IllegalStateException();
        if(!MeetingAccessService.administrator(actor)&&actor.userId()!=row.meetingOwnerId()&&!(body.status().equals("DONE")&&actor.userId()==row.assigneeId()))throw new SecurityException();
        if(body.reason()==null||body.reason().trim().length()<3||body.reason().length()>2000)throw new IllegalArgumentException();
        repository.jdbc().update("UPDATE meeting_agreements SET status=?,resolution=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",body.status(),body.reason().trim(),actor.companyId(),id);
        audit(actor,row.meetingId(),id,"AGREEMENT_"+body.status(),body.reason().trim());return repository.agreement(actor,id,false);
    }
}
