package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.tasks.ProcessTaskMeetingContract;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Typed owner adapter shared by delegated meeting tools; no attendance, voting or lifecycle inference. */
@Service
public class MeetingAssistantService {
    public static final Set<String> READS=Set.of("list_meetings","get_meeting","get_meeting_agreements","get_meeting_agreement_performance");
    public static final Set<String> ACTIONS=Set.of("save_meeting_minutes","create_meeting_agreement","delegate_meeting_agreement_task");
    public record Query(Long meetingId,Instant from,Instant to,String search,Integer page,Integer pageSize){ }
    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    public record Change(Long meetingId,Long agreementId,String title,Long assigneeId,LocalDate dueDate,
        Boolean followupEnabled,String minutes,String decisions,String reason,Long expectedVersion){
        @Override public String toString(){return "MeetingChange[protected]";}
        @com.fasterxml.jackson.annotation.JsonAnySetter public void reject(String field,com.fasterxml.jackson.databind.JsonNode value){throw new IllegalArgumentException("Unknown meeting change field.");}
    }
    public record AgreementDraft(String title,Member assignee,LocalDate dueDate,boolean followupEnabled){@Override public String toString(){return "AgreementDraft[protected]";}}
    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    public record ChangeView(String meetingTitle,String minutes,String decisions,AgreementItem agreement,AgreementDraft proposedAgreement){@Override public String toString(){return "MeetingChangeView[protected]";}}
    public record Prepared(String action,Change change,ChangeView before,ChangeView after){@Override public String toString(){return "PreparedMeetingChange[protected]";}}
    public record Result(String kind,long id,long meetingId){ }
    private final MeetingRepository repository;private final MeetingService meetings;private final MeetingAccessService access;
    private final MeetingAgreementPerformanceService performance;private final ProcessTaskMeetingContract tasks;
    public MeetingAssistantService(MeetingRepository repository,MeetingService meetings,MeetingAccessService access,MeetingAgreementPerformanceService performance,ProcessTaskMeetingContract tasks){this.repository=repository;this.meetings=meetings;this.access=access;this.performance=performance;this.tasks=tasks;}
    public void require(AuthSessionUser actor,String tool){
        if(!READS.contains(tool)&&!ACTIONS.contains(tool))throw new IllegalArgumentException();
        access.requireDelegated(actor,tab(tool));
        if(tool.equals("delegate_meeting_agreement_task")&&!tasks.allowed(actor))throw new SecurityException();
    }
    public static String tab(String tool){return tool.contains("agreement")?"agreements":"meetings";}
    @Transactional(readOnly=true)
    public Object read(AuthSessionUser actor,String tool,Query query){
        require(actor,tool);var q=query==null?new Query(null,null,null,null,null,null):query;
        if(!tool.equals("list_meetings")){
            long id=positive(q.meetingId());var meeting=repository.meeting(actor,id,false);
            return switch(tool){
                case "get_meeting"->repository.detail(actor,id);
                case "get_meeting_agreement_performance"->performance.performance(actor,id);
                case "get_meeting_agreements"->{int page=q.page()==null?1:q.page(),size=q.pageSize()==null?25:q.pageSize();filters(q.search(),page,size);yield repository.agreements(actor,LocalDate.of(2000,1,1),LocalDate.of(2000,1,2),q.search()==null?"":q.search().trim(),"","",0,"due","asc",LocalDate.now(ZoneId.of(meeting.timezone())),page,size,id);}
                default->throw new IllegalArgumentException();};
        }
        if(q.from()==null||q.to()==null||!q.from().isBefore(q.to())||q.to().isAfter(q.from().plusSeconds(366*86400L)))throw new IllegalArgumentException("A bounded meeting date range is required.");
        int page=q.page()==null?1:q.page(),size=q.pageSize()==null?25:q.pageSize();filters(q.search(),page,size);
        return repository.meetings(actor,q.from(),q.to(),q.search()==null?"":q.search().trim(),"",page,size);
    }
    private static void filters(String search,int page,int size){if(search!=null&&search.length()>180||page<1||page>100000||size<1||size>100)throw new IllegalArgumentException();}
    @Transactional
    public Prepared prepare(AuthSessionUser actor,String action,Change c){
        require(actor,action);meetings.lock(actor);if(c==null||c.expectedVersion()==null||c.expectedVersion()<1)throw new IllegalArgumentException("Current version required.");
        c=new Change(c.meetingId(),c.agreementId(),c.title()==null?null:c.title().trim(),c.assigneeId(),c.dueDate(),c.followupEnabled(),c.minutes(),c.decisions(),c.reason()==null?null:c.reason().trim(),c.expectedVersion());
        if(action.equals("delegate_meeting_agreement_task")){
            var agreement=repository.agreement(actor,positive(c.agreementId()),false);MeetingService.owner(actor,agreement.meetingOwnerId());MeetingService.version(agreement.version(),c.expectedVersion());
            var context=repository.meeting(actor,agreement.meetingId(),false);
            if(c.meetingId()!=null&&c.meetingId()!=context.id()||!agreement.status().equals("OPEN")||!repository.agreementDetail(actor,agreement.id()).canLinkTask())throw new IllegalStateException();
            assignee(actor,context,positive(c.assigneeId()));due(c.dueDate());
            if(c.reason()==null||c.reason().length()>2000||((agreement.assigneeId()!=c.assigneeId()||!agreement.dueDate().equals(c.dueDate()))&&c.reason().trim().length()<3))throw new IllegalArgumentException("Reason required for reassignment or rescheduling.");
            tasks.prepare(actor,agreement.title(),c.assigneeId(),c.dueDate());
            return new Prepared(action,c,new ChangeView(context.title(),null,null,agreement,null),new ChangeView(context.title(),null,null,null,new AgreementDraft(agreement.title(),new Member(c.assigneeId(),assigneeName(actor,context,c.assigneeId())),c.dueDate(),agreement.followupEnabled())));
        }
        var context=repository.meeting(actor,positive(c.meetingId()),false);MeetingService.version(context.version(),c.expectedVersion());
        if(action.equals("save_meeting_minutes")){
            if(!MeetingAccessService.administrator(actor)&&actor.userId()!=context.ownerId()&&repository.planning(actor.companyId(),context.id()).minutesOwner().id()!=actor.userId())throw new SecurityException();
            if(!Set.of("PLANNED","IN_PROGRESS").contains(context.status()))throw new IllegalStateException();
            if(c.minutes()==null||c.minutes().length()>20000||c.decisions()==null||c.decisions().length()>10000)throw new IllegalArgumentException();
            var before=repository.detail(actor,context.id());return new Prepared(action,c,new ChangeView(context.title(),before.minutes(),before.decisions(),null,null),new ChangeView(context.title(),c.minutes(),c.decisions(),null,null));
        }
        MeetingService.owner(actor,context.ownerId());if(context.status().equals("CANCELLED"))throw new IllegalStateException();
        if(c.title()==null||c.title().isBlank()||c.title().length()>240)throw new IllegalArgumentException();
        assignee(actor,context,positive(c.assigneeId()));due(c.dueDate());
        return new Prepared(action,c,new ChangeView(context.title(),null,null,null,null),new ChangeView(context.title(),null,null,null,new AgreementDraft(c.title().trim(),new Member(c.assigneeId(),assigneeName(actor,context,c.assigneeId())),c.dueDate(),!Boolean.FALSE.equals(c.followupEnabled()))));
    }
    @Transactional
    public Result execute(AuthSessionUser actor,String action,Change change,String key){
        meetings.lock(actor);prepare(actor,action,change);
        if(action.equals("save_meeting_minutes")){meetings.minutes(actor,change.meetingId(),new MinutesRequest(change.minutes(),change.decisions(),change.expectedVersion()));return new Result("meeting",change.meetingId(),change.meetingId());}
        if(action.equals("create_meeting_agreement")){var saved=meetings.agreement(actor,new AgreementRequest(change.meetingId(),change.title(),change.assigneeId(),change.dueDate(),change.followupEnabled()),key);return new Result("agreement",saved.id(),saved.meetingId());}
        var saved=meetings.delegateTask(actor,change.agreementId(),new DelegateTaskRequest(change.expectedVersion(),change.assigneeId(),change.dueDate(),change.reason()));return new Result("agreement",saved.agreement().id(),saved.agreement().meetingId());
    }
    public Object result(AuthSessionUser actor,String action,Result saved){
        require(actor,action);
        if(saved.kind().equals("meeting"))return repository.detail(actor,saved.id());
        var agreement=repository.agreement(actor,saved.id(),false);MeetingService.owner(actor,agreement.meetingOwnerId());return repository.agreementDetail(actor,saved.id());
    }
    private String assigneeName(AuthSessionUser actor,MeetingItem meeting,long id){return id==meeting.ownerId()?meeting.ownerName():repository.participants(actor.companyId(),meeting.id()).stream().filter(p->p.id()==id).findFirst().orElseThrow(IllegalArgumentException::new).name();}
    private void assignee(AuthSessionUser actor,MeetingItem meeting,long id){meetings.member(actor.companyId(),id);if(id!=meeting.ownerId()&&repository.participants(actor.companyId(),meeting.id()).stream().noneMatch(p->p.id()==id))throw new IllegalArgumentException("Assignee must participate in this meeting.");}
    private static void due(LocalDate due){if(due==null||due.isBefore(LocalDate.of(2000,1,1))||due.isAfter(LocalDate.of(2100,1,1)))throw new IllegalArgumentException();}
    private static long positive(Long id){if(id==null||id<1)throw new IllegalArgumentException("Positive record ID required.");return id;}
}
