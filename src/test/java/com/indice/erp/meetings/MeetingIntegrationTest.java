package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import static com.indice.erp.meetings.MeetingPlanningDtos.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.indice.erp.auth.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

@SpringBootTest(properties={"app.email.enabled=false","app.scheduling.reminder-initial-delay-ms=86400000","app.meetings.reminder-initial-delay-ms=86400000"})
@AutoConfigureMockMvc
class MeetingIntegrationTest {
    @Autowired MeetingRepository repository;
    @Autowired MeetingService service;
    @Autowired MeetingPlanningService planning;
    @Autowired MeetingReminderService reminders;
    @Autowired MeetingOperationalService operational;
    @Autowired MeetingAgreementPerformanceService performance;
    @Autowired com.indice.erp.ai.meetings.AiMeetingActionService aiActions;
    @Autowired com.indice.erp.ai.access.AiAccessTokenRepository aiTokens;
    @Autowired com.indice.erp.meetings.MeetingAssistantService assistant;

    @Autowired JdbcTemplate db;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private long company,other,user,participant,stranger;
    private AuthSessionUser actor,member,outsider;
    private Instant start;
    @BeforeEach void setup(){
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        company=repository.insert("INSERT INTO companies(name) VALUES(?)","Meetings synthetic "+UUID.randomUUID());
        other=repository.insert("INSERT INTO companies(name) VALUES(?)","Meetings synthetic other "+UUID.randomUUID());
        user=user("Synthetic owner",company,"superadmin");participant=user("Synthetic participant",company,"user");stranger=user("Synthetic outsider",company,"user");
        actor=new AuthSessionUser(user,company,"Synthetic owner","superadmin");member=new AuthSessionUser(participant,company,"Synthetic participant","user");outsider=new AuthSessionUser(stranger,company,"Synthetic outsider","user");
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'control_minutas','active','test')",company);
        start=LocalDate.now(ZoneOffset.UTC).plusDays(1).atTime(10,0).toInstant(ZoneOffset.UTC);
    }
    private long user(String name,long company,String role){long id=repository.insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-only',?)","meetings-"+UUID.randomUUID()+"@example.com",name);db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,?,'active','all')",company,id,role);return id;}
    private MeetingRequest request(){return new MeetingRequest("Synthetic working meeting","WORKING",start,start.plusSeconds(3600),"UTC",user,List.of(participant),"Review outcomes","Synthetic room",null);}
    private MeetingDetail create(){return service.create(actor,request(),UUID.randomUUID().toString());}
    private MockHttpSession session(long id,long tenant){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,id);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,tenant);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    @AfterEach void cleanup(){
        for(long tenant:new long[]{company,other})if(tenant>0)for(String table:List.of("ai_action_audit_events","ai_action_executions","ai_action_confirmations"))db.update("DELETE FROM "+table+" WHERE company_id=?",tenant);
        for(long tenant:new long[]{company,other})if(tenant>0)db.update("DELETE FROM meeting_agreement_task_links WHERE company_id=?",tenant);
        for(long tenant:new long[]{company,other})if(tenant>0)db.update("DELETE FROM process_tasks WHERE company_id=?",tenant);
        for(long tenant:new long[]{company,other})if(tenant>0){for(String table:List.of("meeting_agreement_revisions","meeting_create_replays","meeting_workflow_audit","meeting_reminder_receipts","meeting_audit","meeting_agreements","meeting_participants","meeting_records","meeting_series","meeting_flows"))db.update("DELETE FROM "+table+" WHERE company_id=?",tenant);db.update("DELETE FROM companies WHERE id=?",tenant);}
        for(long id:new long[]{user,participant,stranger})if(id>0)db.update("DELETE FROM users WHERE id=?",id);
    }
    @Test void identicalCreateRetryDoesNotDuplicateAndChangedPayloadConflicts(){
        String key=UUID.randomUUID().toString();var first=service.create(actor,request(),key);assertThat(service.create(actor,request(),key).meeting().id()).isEqualTo(first.meeting().id());
        var body=request();var changed=new MeetingRequest("Different",body.meetingType(),body.startAt(),body.endAt(),body.timezone(),body.ownerId(),body.participantIds(),body.agenda(),body.location(),null);
        assertThatThrownBy(()->service.create(actor,changed,key)).isInstanceOf(IllegalStateException.class);
        assertThat(repository.meetings(actor,start.minusSeconds(1),start.plusSeconds(86400),"","",1,25).total()).isEqualTo(1);
    }
    @Test void tenantAndObjectScopeProtectMeetingsAndParticipants(){
        var row=create();assertThat(repository.detail(member,row.meeting().id()).agenda()).isEqualTo("Review outcomes");
        assertThatThrownBy(()->repository.detail(outsider,row.meeting().id())).isInstanceOf(NoSuchElementException.class);
        assertThat(repository.meetings(outsider,start.minusSeconds(1),start.plusSeconds(86400),"","",1,25).total()).isZero();
        assertThatThrownBy(()->repository.detail(new AuthSessionUser(user,other,"Synthetic","superadmin"),row.meeting().id())).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->service.minutes(member,row.meeting().id(),new MinutesRequest("Not owner","",1))).isInstanceOf(SecurityException.class);
        long otherMember=user("Temporary synthetic",other,"user");
        try{var body=request();var invalid=new MeetingRequest(body.title(),body.meetingType(),body.startAt(),body.endAt(),body.timezone(),user,List.of(otherMember),"","",null);assertThatThrownBy(()->service.create(actor,invalid,UUID.randomUUID().toString())).isInstanceOf(IllegalArgumentException.class);}finally{db.update("DELETE FROM user_companies WHERE company_id=? AND user_id=?",other,otherMember);db.update("DELETE FROM users WHERE id=?",otherMember);}
    }
    @Test void minutesVersionLifecycleAndCancellationPreserveEvidence(){
        long id=create().meeting().id();service.transition(actor,id,new TransitionRequest("IN_PROGRESS","",1));
        assertThatThrownBy(()->service.transition(actor,id,new TransitionRequest("COMPLETED","",2))).isInstanceOf(IllegalStateException.class);
        service.minutes(actor,id,new MinutesRequest("Recorded outcomes","Next decision",2));
        assertThatThrownBy(()->service.minutes(actor,id,new MinutesRequest("Stale","",2))).isInstanceOf(IllegalStateException.class);
        var closed=service.transition(actor,id,new TransitionRequest("COMPLETED","",3));assertThat(closed.minutes()).isEqualTo("Recorded outcomes");assertThat(closed.meeting().version()).isEqualTo(4);
        assertThatThrownBy(()->service.edit(actor,id,request())).isInstanceOf(IllegalStateException.class);
        long cancelled=create().meeting().id();service.minutes(actor,cancelled,new MinutesRequest("Preserve evidence","",1));service.transition(actor,cancelled,new TransitionRequest("CANCELLED","Synthetic reason",2));
        assertThat(repository.detail(actor,cancelled).minutes()).isEqualTo("Preserve evidence");assertThat(repository.detail(actor,cancelled).history()).hasSize(3);
    }
    @Test void agreementAssignmentRetryCompletionAndRemovalGuardAreEnforced(){
        var meeting=create();long id=meeting.meeting().id();var body=new AgreementRequest(id,"Synthetic deliverable",participant,LocalDate.now(ZoneOffset.UTC).minusDays(1));String key=UUID.randomUUID().toString();
        var agreement=service.agreement(actor,body,key);assertThat(service.agreement(actor,body,key).id()).isEqualTo(agreement.id());
        assertThatThrownBy(()->service.agreement(actor,new AgreementRequest(id,"Invalid assignment",stranger,body.dueDate()),UUID.randomUUID().toString())).isInstanceOf(IllegalArgumentException.class);
        var edit=request();var remove=new MeetingRequest(edit.title(),edit.meetingType(),edit.startAt(),edit.endAt(),edit.timezone(),user,List.of(),"","",1L);
        assertThatThrownBy(()->service.edit(actor,id,remove)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->service.agreementStatus(member,agreement.id(),new TransitionRequest("CANCELLED","Not owner",1))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->service.agreementStatus(member,agreement.id(),new TransitionRequest("DONE","",1))).isInstanceOf(IllegalArgumentException.class);
        assertThat(service.agreementStatus(member,agreement.id(),new TransitionRequest("DONE","Delivered evidence",1)).status()).isEqualTo("DONE");
        assertThatThrownBy(()->service.agreementStatus(member,agreement.id(),new TransitionRequest("DONE","Repeat",1))).isInstanceOf(IllegalStateException.class);
        assertThat(repository.agreements(outsider,body.dueDate(),body.dueDate().plusDays(2),"","",1,25).total()).isZero();
    }
    @Test void backendMetricsFollowRecordScopeAndTimezone(){
        var m=create();service.agreement(actor,new AgreementRequest(m.meeting().id(),"Late deliverable",participant,LocalDate.now(ZoneOffset.UTC).minusDays(1)),UUID.randomUUID().toString());
        var metrics=repository.metrics(actor,start.minusSeconds(3*86400),start.plusSeconds(86400),ZoneId.of("UTC"));assertThat(metrics.planned()).isEqualTo(1);assertThat(metrics.openAgreements()).isEqualTo(1);assertThat(metrics.overdueAgreements()).isEqualTo(1);
        assertThat(repository.metrics(outsider,start.minusSeconds(3*86400),start.plusSeconds(86400),ZoneId.of("UTC")).openAgreements()).isZero();
    }
    @Test void httpRequiresEntitlementCsrfAndRejectsOtherCompanyObjects()throws Exception{
        var row=create();var s=session(user,company);
        mvc.perform(get("/api/v1/meetings/"+row.meeting().id()).session(s)).andExpect(status().isOk()).andExpect(jsonPath("$.meeting.id").value(row.meeting().id()));
        mvc.perform(post("/api/v1/meetings").session(s).header("Idempotency-Key",UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request()))).andExpect(status().isForbidden());
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'superadmin','active','all')",other,user);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'control_minutas','active','test')",other);
        mvc.perform(get("/api/v1/meetings/"+row.meeting().id()).session(session(user,other))).andExpect(status().isNotFound());
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='control_minutas'",company);
        mvc.perform(get("/api/v1/meetings/"+row.meeting().id()).session(s)).andExpect(status().isForbidden());
        assertThatThrownBy(()->service.minutes(actor,row.meeting().id(),new MinutesRequest("Blocked after revocation","",1))).isInstanceOf(SecurityException.class);
    }
    @Test void boundedValidationRejectsInvalidTimesBeforeAnyWrite(){
        var b=request();assertThatThrownBy(()->service.create(actor,new MeetingRequest(b.title(),b.meetingType(),start,start.minusSeconds(1),"UTC",user,List.of(),"","",null),UUID.randomUUID().toString())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.create(actor,new MeetingRequest(b.title(),b.meetingType(),start,start.plusSeconds(3600),"Invalid/Zone",user,List.of(),"","",null),UUID.randomUUID().toString())).isInstanceOf(DateTimeException.class);
        assertThat(repository.meetings(actor,start.minusSeconds(1),start.plusSeconds(86400),"","",1,25).total()).isZero();
    }
    @Test void realHttpAgreementOnlyPermissionDoesNotExposeMinutesMembersOrMetrics()throws Exception{
        var meeting=create();var agreement=service.agreement(actor,new AgreementRequest(meeting.meeting().id(),"Synthetic commitment",participant,LocalDate.now()),UUID.randomUUID().toString());
        long uc=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,participant);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'control_minutas','user')",uc);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'control_minutas','agreements',1)",uc);
        var s=session(participant,company);
        mvc.perform(get("/api/v1/meetings/agreements").session(s).param("from",LocalDate.now().minusDays(1).toString()).param("to",LocalDate.now().plusDays(2).toString())).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(agreement.id())).andExpect(jsonPath("$.items[0].minutes").doesNotExist());
        mvc.perform(get("/api/v1/meetings/"+meeting.meeting().id()).session(s)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/meetings/members").session(s)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/meetings/{id}/agreement-performance",meeting.meeting().id()).session(s)).andExpect(status().isOk()).andExpect(jsonPath("$.timezone").value("UTC")).andExpect(jsonPath("$.minutes").doesNotExist());
        mvc.perform(get("/api/v1/meetings/agreements/{id}/evidence",agreement.id()).session(s)).andExpect(status().isOk()).andExpect(jsonPath("$.deadlineBasis").value("CREATED"));
        mvc.perform(get("/api/v1/meetings/metrics").session(s).param("from",start.minusSeconds(86400).toString()).param("to",start.plusSeconds(86400).toString()).param("timezone","UTC")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/meetings/agreements/"+agreement.id()+"/status").session(s).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new TransitionRequest("DONE","Delivered synthetic evidence",1)))).andExpect(status().isOk());
        db.update("UPDATE user_company_tab_permissions SET can_view=0 WHERE user_company_id=?",uc);
        mvc.perform(get("/api/v1/meetings/agreement-assignees").session(s)).andExpect(status().isForbidden());
    }
    @Test void attentionFiltersSortingAndResponsibilityAreScopedToCompleteBackendSet(){
        var row=create();var old=request();var past=new MeetingRequest("Earlier synthetic meeting","WORKING",start.minusSeconds(7*86400),start.minusSeconds(7*86400-3600),"UTC",user,List.of(participant),"","",null);
        var second=service.create(actor,past,UUID.randomUUID().toString());
        Instant from=start.minusSeconds(10*86400),to=start.plusSeconds(2*86400);
        assertThat(repository.meetings(actor,from,to,"","","missingMinutes",user,"title","desc",1,25).items()).extracting(MeetingItem::id).containsExactly(second.meeting().id());
        assertThat(repository.meetings(actor,from,to,"","","awaitingClosure",user,"start","asc",1,25).total()).isEqualTo(1);
        assertThat(repository.meetings(actor,from,to,"","","",participant,"title","asc",1,25).total()).isZero();
        assertThatThrownBy(()->repository.meetings(actor,from,to,"","","",0,"title;DROP","asc",1,25)).isInstanceOf(IllegalArgumentException.class);
        service.agreement(actor,new AgreementRequest(row.meeting().id(),"Late",participant,LocalDate.now().minusDays(2)),UUID.randomUUID().toString());
        service.agreement(actor,new AgreementRequest(row.meeting().id(),"Future",participant,LocalDate.now().plusDays(2)),UUID.randomUUID().toString());
        assertThat(repository.agreements(actor,LocalDate.now().minusDays(5),LocalDate.now().plusDays(5),"","OPEN","overdueAgreements",participant,"due","asc",LocalDate.now(),1,25).items()).extracting(AgreementItem::title).containsExactly("Late");
    }
    @Test void concurrentIdenticalCreateRetriesProduceOneRecord()throws Exception{
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);String key=UUID.randomUUID().toString();var ready=new java.util.concurrent.CyclicBarrier(2);
        try{java.util.concurrent.Callable<Long> call=()->{ready.await(10,java.util.concurrent.TimeUnit.SECONDS);return service.create(actor,request(),key).meeting().id();};var first=pool.submit(call);var second=pool.submit(call);assertThat(first.get(20,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(second.get(20,java.util.concurrent.TimeUnit.SECONDS));assertThat(repository.meetings(actor,start.minusSeconds(1),start.plusSeconds(86400),"","",1,25).total()).isEqualTo(1);}finally{pool.shutdownNow();}
    }
    @Test void agreementContextIncludesOlderDatesAndEditsAreScopedAndVersioned(){
        var meeting=create();var due=LocalDate.now().minusMonths(3);
        var agreement=service.agreement(actor,new AgreementRequest(meeting.meeting().id(),"Historical obligation",participant,due),UUID.randomUUID().toString());
        assertThat(repository.agreements(actor,LocalDate.now(),LocalDate.now().plusDays(1),"","","",0,"due","asc",LocalDate.now(),1,25,meeting.meeting().id()).items()).extracting(AgreementItem::id).containsExactly(agreement.id());
        assertThat(repository.agreements(actor,LocalDate.now(),LocalDate.now().plusDays(1),"","","allOverdue",0,"due","asc",LocalDate.now(),1,25).total()).isEqualTo(1);
        assertThatThrownBy(()->repository.agreementDetail(outsider,agreement.id())).isInstanceOf(NoSuchElementException.class);
        var update=new AgreementUpdateRequest("Updated obligation",user,LocalDate.now().plusDays(2),"Reassigned with new deadline",1,false);
        assertThatThrownBy(()->service.updateAgreement(member,agreement.id(),update)).isInstanceOf(SecurityException.class);
        var edited=service.updateAgreement(actor,agreement.id(),update);assertThat(edited.assigneeId()).isEqualTo(user);assertThat(edited.followupEnabled()).isFalse();
        assertThatThrownBy(()->service.updateAgreement(actor,agreement.id(),update)).isInstanceOf(IllegalStateException.class);
        var noted=service.agreementNote(actor,agreement.id(),new NoteRequest("Progress evidence",edited.version()));
        assertThat(noted.history().getFirst().reason()).isEqualTo("Progress evidence");
    }
    @Test void addendaPreserveClosedMinutesAndRejectStaleVersions(){
        var meeting=create();long id=meeting.meeting().id();
        service.minutes(actor,id,new MinutesRequest("Original minutes","Original decisions",1));
        service.transition(actor,id,new TransitionRequest("IN_PROGRESS","",2));
        service.transition(actor,id,new TransitionRequest("COMPLETED","",3));
        var amended=service.addendum(actor,id,new NoteRequest("Additional signed clarification",4));
        assertThat(amended.minutes()).isEqualTo("Original minutes");assertThat(amended.decisions()).isEqualTo("Original decisions");
        assertThat(amended.history().getFirst().action()).isEqualTo("MINUTES_ADDENDUM");
        assertThatThrownBy(()->service.addendum(actor,id,new NoteRequest("Stale clarification",4))).isInstanceOf(IllegalStateException.class);
    }
    @Test void overdueFollowupSurvivesDisabledMeetingRemindersAndCancellation(){
        var meeting=create();long id=meeting.meeting().id();
        service.agreement(actor,new AgreementRequest(id,"Overdue owner obligation",user,LocalDate.now().minusDays(1)),UUID.randomUUID().toString());
        service.transition(actor,id,new TransitionRequest("CANCELLED","Meeting cancelled; obligation remains",1));
        reminders.dispatch(company,id);reminders.dispatch(company,id);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_reminder_receipts WHERE company_id=? AND signal_type='overdue_agreement'",Integer.class,company)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_reminder_receipts WHERE company_id=? AND signal_type='upcoming_meeting'",Integer.class,company)).isZero();
    }
    @Test void meetingChoicesFindOlderRecordsAndSearchBeyondFirstPage(){
        long selected=0;
        for(int i=0;i<106;i++){
            var body=new MeetingRequest("Synthetic choice "+i,"WORKING",start.minusSeconds((120-i)*86400L),start.minusSeconds((120-i)*86400L-3600),"UTC",user,List.of(participant),"","",null);
            long id=service.create(actor,body,UUID.randomUUID().toString()).meeting().id();if(i==0)selected=id;
        }
        assertThat(repository.choices(actor,"",0,5,25).items()).hasSize(6);
        assertThat(repository.choices(actor,"",selected,1,25).items()).extracting(MeetingChoice::id).containsExactly(selected);
        assertThat(repository.choices(actor,"choice 105",0,1,25).items()).hasSize(1);
        assertThat(repository.choices(outsider,"",selected,1,25).items()).isEmpty();
    }
    @Test void taskLinkUsesNativeOwnerAndIsUniqueAcrossRetries(){
        var meeting=create();var agreement=service.agreement(actor,new AgreementRequest(meeting.meeting().id(),"Deliver commitment",participant,LocalDate.now().plusDays(7)),UUID.randomUUID().toString());
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'processes','inactive','test')",company);
        assertThat(repository.agreementDetail(actor,agreement.id()).canLinkTask()).isFalse();
        assertThatThrownBy(()->service.createTask(actor,agreement.id(),1)).isInstanceOf(SecurityException.class);
        db.update("UPDATE company_module_entitlements SET status='active' WHERE company_id=? AND module_slug='processes'",company);
        var linked=service.createTask(actor,agreement.id(),1);assertThat(linked.task()).isNotNull();
        assertThat(service.createTask(actor,agreement.id(),1).task().id()).isEqualTo(linked.task().id());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM process_tasks WHERE company_id=?",Integer.class,company)).isEqualTo(1);
        service.agreementStatus(actor,agreement.id(),new TransitionRequest("DONE","Validated independently",linked.agreement().version()));
        assertThat(db.queryForObject("SELECT status FROM process_tasks WHERE company_id=? AND id=?",String.class,company,linked.task().id())).isEqualTo("pending");
    }
    @Test void seriesFollowupReusesExistingOpenAgreementsWithoutCopyingThem(){
        var series=planning.create(actor,new PlanRequest(rich(start,null),new Recurrence("WEEKLY",1,2),"",false),UUID.randomUUID().toString());
        long first=series.firstMeetingId(),second=db.queryForObject("SELECT id FROM meeting_records WHERE company_id=? AND series_id=? AND occurrence_number=2",Long.class,company,series.seriesId());
        var agreement=service.agreement(actor,new AgreementRequest(first,"Carry original obligation",participant,LocalDate.now().minusDays(2)),UUID.randomUUID().toString());
        assertThat(repository.agreements(actor,LocalDate.now(),LocalDate.now().plusDays(1),"","","",0,"due","asc",LocalDate.now(),1,25,second,true).items()).extracting(AgreementItem::id).containsExactly(agreement.id());
        assertThat(repository.agreements(actor,LocalDate.now(),LocalDate.now().plusDays(1),"","","",0,"due","asc",LocalDate.now(),1,25,second,false).items()).isEmpty();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_agreements WHERE company_id=?",Integer.class,company)).isEqualTo(1);
        assertThatThrownBy(()->repository.agreements(outsider,LocalDate.now(),LocalDate.now().plusDays(1),"","","",0,"due","asc",LocalDate.now(),1,25,second,true)).isInstanceOf(NoSuchElementException.class);
    }
    @Test void atomicDelegationReassignsAuditsPreservesOriginalDeadlineAndRetriesOnlyExactPayload(){
        var meeting=create();var due=LocalDate.now().minusDays(3);
        var agreement=service.agreement(actor,new AgreementRequest(meeting.meeting().id(),"Delegate concrete outcome",participant,due),UUID.randomUUID().toString());
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'processes','active','test')",company);
        var request=new DelegateTaskRequest(1,user,due.plusDays(10),"Owner accepted a new deadline");
        assertThatThrownBy(()->service.delegateTask(member,agreement.id(),request)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->service.delegateTask(actor,agreement.id(),new DelegateTaskRequest(1,stranger,due,"Invalid participant"))).isInstanceOf(IllegalArgumentException.class);
        assertThat(repository.agreement(actor,agreement.id(),false).version()).isEqualTo(1);
        var saved=service.delegateTask(actor,agreement.id(),request);
        assertThat(saved.task()).isNotNull();assertThat(saved.agreement().assigneeId()).isEqualTo(user);
        assertThat(service.delegateTask(actor,agreement.id(),request).task().id()).isEqualTo(saved.task().id());
        assertThatThrownBy(()->service.delegateTask(actor,agreement.id(),new DelegateTaskRequest(1,participant,due,"Changed retry"))).isInstanceOf(IllegalStateException.class);
        var evidence=performance.evidence(actor,agreement.id());assertThat(evidence.originalDueDate()).isEqualTo(due);assertThat(evidence.outcome()).isEqualTo("OVERDUE");
        assertThat(evidence.revisions()).hasSize(1);assertThat(evidence.revisions().getFirst().previousAssigneeName()).isEqualTo("Synthetic participant");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM process_tasks WHERE company_id=?",Integer.class,company)).isEqualTo(1);
        db.update("UPDATE process_tasks SET status='completed' WHERE company_id=? AND id=?",company,saved.task().id());
        assertThat(repository.agreement(actor,agreement.id(),false).status()).isEqualTo("OPEN");
        assertThat(performance.performance(actor,meeting.meeting().id()).overdue()).isEqualTo(1);
    }
    @Test void performanceUsesEndedOriginalDeadlinesAndConfirmedEvidenceWithoutManufacturingHistory(){
        var meeting=create();long id=meeting.meeting().id();var due=LocalDate.of(2026,10,20);
        for(int index=0;index<10;index++){
            var a=service.agreement(actor,new AgreementRequest(id,"Scored obligation "+index,participant,due),UUID.randomUUID().toString());
            if(index<9){service.agreementStatus(actor,a.id(),new TransitionRequest("DONE","Validated synthetic evidence",1));db.update("UPDATE meeting_agreements SET fulfilled_at=? WHERE company_id=? AND id=?",java.sql.Timestamp.from(Instant.parse(index<7?"2026-10-20T23:59:59Z":"2026-10-21T00:00:00Z")),company,a.id());}
        }
        var future=service.agreement(actor,new AgreementRequest(id,"Future obligation",participant,due.plusDays(10)),UUID.randomUUID().toString());
        var cancelled=service.agreement(actor,new AgreementRequest(id,"Cancelled obligation",participant,due),UUID.randomUUID().toString());service.agreementStatus(actor,cancelled.id(),new TransitionRequest("CANCELLED","Explicit cancellation",1));
        var legacy=service.agreement(actor,new AgreementRequest(id,"Legacy obligation",participant,due),UUID.randomUUID().toString());db.update("UPDATE meeting_agreements SET deadline_basis='ADOPTED' WHERE company_id=? AND id=?",company,legacy.id());
        var fixed=new MeetingAgreementPerformanceService(repository,Clock.fixed(Instant.parse("2026-10-23T12:00:00Z"),ZoneOffset.UTC));var score=fixed.performance(actor,id);
        assertThat(score.total()).isEqualTo(13);assertThat(score.eligible()).isEqualTo(10);assertThat(score.onTime()).isEqualTo(7);assertThat(score.late()).isEqualTo(2);assertThat(score.overdue()).isEqualTo(1);assertThat(score.upcoming()).isEqualTo(1);assertThat(score.cancelled()).isEqualTo(1);assertThat(score.historicalUnknown()).isEqualTo(1);assertThat(score.onTimePercent()).isEqualTo(70);
        assertThatThrownBy(()->fixed.performance(outsider,id)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->fixed.performance(new AuthSessionUser(user,other,"Other","superadmin"),id)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->fixed.evidence(outsider,future.id())).isInstanceOf(NoSuchElementException.class);
        assertThat(fixed.performance(actor,create().meeting().id()).onTimePercent()).isNull();
    }
    private com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken meetingToken(Set<String> scopes){
        long membership=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,user);
        var identity=new AuthSessionUser(user,company,membership,"Synthetic owner","superadmin");
        long id=aiTokens.insert(identity,"generic_mcp","Synthetic meeting tools","test",UUID.randomUUID().toString().replace("-","")+UUID.randomUUID().toString().replace("-",""),Instant.now().plusSeconds(3600),scopes);
        return new com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken(id,identity,scopes);
    }
    @Test void mcpMinutesPreviewIsImmutableVersionedPermissionedAndReplaySafe(){
        var meeting=create();var token=meetingToken(Set.of("meetings.read","meetings.manage"));
        var change=new MeetingAssistantService.Change(meeting.meeting().id(),null,null,null,null,null,"Reviewed discussion","Reviewed decision",null,1L);
        var preview=aiActions.preview(token,"save_meeting_minutes",change);assertThat(repository.detail(actor,meeting.meeting().id()).minutes()).isEmpty();
        var commit=new com.indice.erp.ai.meetings.AiMeetingActionService.Commit(preview.confirmationToken(),UUID.randomUUID().toString());
        assertThat(aiActions.commit(token,"save_meeting_minutes",commit).replayed()).isFalse();
        assertThat(aiActions.commit(token,"save_meeting_minutes",commit).replayed()).isTrue();
        assertThat(repository.detail(actor,meeting.meeting().id()).minutes()).isEqualTo("Reviewed discussion");
        assertThatThrownBy(()->aiActions.preview(token,"save_meeting_minutes",change)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->aiActions.commit(meetingToken(Set.of("meetings.manage")),"save_meeting_minutes",commit)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->aiActions.preview(meetingToken(Set.of("meetings.read")),"save_meeting_minutes",change)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->mapper.readValue("{\"confirmationToken\":\"example\",\"idempotencyKey\":\"example\",\"minutes\":\"replacement\"}",com.indice.erp.ai.meetings.AiMeetingActionService.Commit.class)).isInstanceOf(Exception.class);
    }
    @Test void mcpDelegationRequiresTaskConsentAndRechecksNativeOwnerScope(){
        var meeting=create();var agreement=service.agreement(actor,new AgreementRequest(meeting.meeting().id(),"MCP concrete obligation",participant,LocalDate.now().plusDays(2)),UUID.randomUUID().toString());
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'processes','active','test')",company);
        var change=new MeetingAssistantService.Change(null,agreement.id(),null,participant,agreement.dueDate(),null,null,null,"",1L);
        assertThatThrownBy(()->aiActions.preview(meetingToken(Set.of("meeting_agreements.manage")),"delegate_meeting_agreement_task",change)).isInstanceOf(SecurityException.class);
        var token=meetingToken(Set.of("meeting_agreements.manage","tasks.create","tasks.delegate"));var preview=aiActions.preview(token,"delegate_meeting_agreement_task",change);
        var request=new com.indice.erp.ai.meetings.AiMeetingActionService.Commit(preview.confirmationToken(),UUID.randomUUID().toString());
        var saved=aiActions.commit(token,"delegate_meeting_agreement_task",request);assertThat(saved.result().id()).isEqualTo(agreement.id());assertThat(aiActions.commit(token,"delegate_meeting_agreement_task",request).replayed()).isTrue();
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='processes'",company);
        assertThatThrownBy(()->aiActions.commit(token,"delegate_meeting_agreement_task",request)).isInstanceOf(SecurityException.class);
    }
    @Test void performanceAndDelegationHttpFailClosedWithoutSessionCsrfOrObjectScope() throws Exception {
        var meeting=create();var agreement=service.agreement(actor,new AgreementRequest(meeting.meeting().id(),"Protected agreement",participant,LocalDate.now().plusDays(2)),UUID.randomUUID().toString());
        mvc.perform(get("/api/v1/meetings/{id}/agreement-performance",meeting.meeting().id())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/meetings/{id}/agreement-performance",meeting.meeting().id()).session(session(participant,company))).andExpect(status().isForbidden());
        long strangerMembership=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,stranger);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'control_minutas','user')",strangerMembership);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'control_minutas','agreements',1)",strangerMembership);
        mvc.perform(get("/api/v1/meetings/{id}/agreement-performance",meeting.meeting().id()).session(session(stranger,company))).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/meetings/agreements/{id}/task-delegation",agreement.id()).session(session(user,company)).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new DelegateTaskRequest(1,participant,agreement.dueDate(),"")))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/ai/tools/meetings/get_meeting").contentType(MediaType.APPLICATION_JSON).content("{\"meetingId\":"+meeting.meeting().id()+"}")).andExpect(status().isUnauthorized());
        assertThat(repository.agreement(actor,agreement.id(),false).version()).isEqualTo(1);
    }
    @Test void oldBinaryAgreementInsertRemainsWritableAndUnratedAfterAdditiveMigrations(){
        var meeting=create();long id=repository.insert("INSERT INTO meeting_agreements(company_id,meeting_id,title,assignee_id,due_date) VALUES(?,?,?,?,?)",company,meeting.meeting().id(),"Legacy binary synthetic agreement",participant,java.sql.Date.valueOf(LocalDate.now().minusDays(1)));
        assertThat(repository.agreement(actor,id,false).title()).isEqualTo("Legacy binary synthetic agreement");
        assertThat(performance.evidence(actor,id).originalDueDate()).isNull();
        assertThat(performance.evidence(actor,id).outcome()).isEqualTo("UNRATED");
        assertThat(performance.performance(actor,meeting.meeting().id()).onTimePercent()).isNull();
    }
    @Test void mcpAgreementPreviewShowsResolvedAssigneeAndCreatesOneNativeCommitment(){
        var meeting=create();var token=meetingToken(Set.of("meeting_agreements.manage"));
        var due=LocalDate.now().plusDays(5);
        var change=new MeetingAssistantService.Change(meeting.meeting().id(),null,"  Deliver reviewed outcome  ",participant,due,true,null,null,null,1L);
        var preview=aiActions.preview(token,"create_meeting_agreement",change);
        assertThat(preview.prepared().after().proposedAgreement().assignee().name()).isEqualTo("Synthetic participant");
        assertThat(preview.prepared().change().title()).isEqualTo("Deliver reviewed outcome");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_agreements WHERE company_id=?",Integer.class,company)).isZero();
        var request=new com.indice.erp.ai.meetings.AiMeetingActionService.Commit(preview.confirmationToken(),UUID.randomUUID().toString());
        var saved=aiActions.commit(token,"create_meeting_agreement",request);
        assertThat(aiActions.commit(token,"create_meeting_agreement",request).replayed()).isTrue();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_agreements WHERE company_id=?",Integer.class,company)).isEqualTo(1);
        assertThat(performance.evidence(actor,saved.result().id()).originalDueDate()).isEqualTo(due);
    }
    private MeetingRequest rich(Instant at,Long version){var m=request();return new MeetingRequest(m.title(),m.meetingType(),at,at.plusSeconds(3600),"UTC",user,List.of(participant),m.agenda(),m.location(),version,"Review blockers","Decide owners",participant,30);}
    @Test void reviewedSeriesAndFlowAreAtomicIdempotentAndTenantScoped(){
        var body=new PlanRequest(rich(start,null),new Recurrence("WEEKLY",1,3),"Synthetic weekly flow",false);String key=UUID.randomUUID().toString();
        assertThat(planning.preview(actor,body).count()).isEqualTo(3);var saved=planning.create(actor,body,key);assertThat(planning.create(actor,body,key)).isEqualTo(saved);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_records WHERE company_id=?",Integer.class,company)).isEqualTo(3);
        assertThat(planning.flows(actor)).hasSize(1);assertThat(planning.flows(member)).isEmpty();
        assertThat(repository.detail(member,saved.firstMeetingId()).planning().minutesOwner().id()).isEqualTo(participant);
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'superadmin','active','all')",other,user);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'control_minutas','active','test')",other);
        assertThatThrownBy(()->planning.command(new AuthSessionUser(user,other,"Synthetic","superadmin"),saved.seriesId(),new SeriesCommand("PAUSE_REMINDERS","",1))).isInstanceOf(NoSuchElementException.class);
        assertThat(planning.series(outsider,1).items()).isEmpty();
        var invalid=new MeetingRequest("Synthetic","WORKING",start,start.plusSeconds(3600),"UTC",user,List.of(stranger+1000000),"","",null,"Goal","Outcome",user,30);
        assertThatThrownBy(()->planning.create(actor,new PlanRequest(invalid,new Recurrence("WEEKLY",1,2),"Bad flow",false),UUID.randomUUID().toString())).isInstanceOf(IllegalArgumentException.class);
        assertThat(planning.flows(actor)).hasSize(1);
    }
    @Test void conflictsRequireExplicitAcknowledgmentWithoutDisclosingOtherMeetings(){
        create();var body=new PlanRequest(rich(start,null),null,"",false);
        assertThat(planning.preview(actor,body).occurrences().getFirst().conflicts()).isEqualTo(1);
        assertThatThrownBy(()->planning.create(actor,body,UUID.randomUUID().toString())).hasMessage("meeting_conflicts_confirm");
        assertThat(planning.create(actor,new PlanRequest(body.meeting(),null,"",true),UUID.randomUUID().toString()).count()).isEqualTo(1);
    }
    @Test void delegatedMinutesDoNotDelegatePlanningOrLifecycle(){
        var row=service.create(actor,rich(start,null),UUID.randomUUID().toString());long id=row.meeting().id();
        assertThat(service.minutes(member,id,new MinutesRequest("Delegated evidence","Decision",1)).minutes()).isEqualTo("Delegated evidence");
        assertThatThrownBy(()->service.transition(member,id,new TransitionRequest("IN_PROGRESS","",2))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->service.edit(member,id,rich(start,2L))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->service.minutes(outsider,id,new MinutesRequest("Not allowed","",2))).isInstanceOf(NoSuchElementException.class);
    }
    @Test void futureEditingLeavesEarlierOccurrencesAndTheirEvidenceIntact(){
        var saved=planning.create(actor,new PlanRequest(rich(start,null),new Recurrence("WEEKLY",1,3),"",false),UUID.randomUUID().toString());
        var ids=db.queryForList("SELECT id FROM meeting_records WHERE company_id=? AND series_id=? ORDER BY occurrence_number",Long.class,company,saved.seriesId());
        long first=ids.get(0),pivot=ids.get(1);service.minutes(actor,first,new MinutesRequest("Retained evidence","",1));
        var body=new FutureEdit(rich(start.plusSeconds(7*86400+3600),1L),1);
        assertThat(planning.previewFuture(actor,pivot,body).count()).isEqualTo(2);planning.editFuture(actor,pivot,body);
        assertThat(repository.detail(actor,first).minutes()).isEqualTo("Retained evidence");assertThat(repository.detail(actor,first).meeting().startAt()).isEqualTo(start);
        assertThat(repository.detail(actor,pivot).meeting().startAt()).isEqualTo(start.plusSeconds(7*86400+3600));
        assertThatThrownBy(()->planning.editFuture(actor,pivot,body)).isInstanceOf(IllegalStateException.class);
    }
    @Test void pausingSignalsDoesNotCancelJuntasAndCancelFutureRetainsHistoryAndAgreements(){
        var saved=planning.create(actor,new PlanRequest(rich(start,null),new Recurrence("WEEKLY",1,2),"",false),UUID.randomUUID().toString());
        service.minutes(actor,saved.firstMeetingId(),new MinutesRequest("Retained minutes","",1));
        service.agreement(actor,new AgreementRequest(saved.firstMeetingId(),"Retained commitment",participant,LocalDate.now().plusDays(2)),UUID.randomUUID().toString());
        planning.command(actor,saved.seriesId(),new SeriesCommand("PAUSE_REMINDERS","",1));
        assertThat(repository.detail(actor,saved.firstMeetingId()).meeting().status()).isEqualTo("PLANNED");
        assertThatThrownBy(()->planning.command(actor,saved.seriesId(),new SeriesCommand("RESUME_REMINDERS","",1))).isInstanceOf(IllegalStateException.class);
        planning.command(actor,saved.seriesId(),new SeriesCommand("RESUME_REMINDERS","",2));
        planning.command(actor,saved.seriesId(),new SeriesCommand("CANCEL_FUTURE","Retain all evidence",3));
        assertThat(repository.detail(actor,saved.firstMeetingId()).minutes()).isEqualTo("Retained minutes");
        assertThat(repository.detail(actor,saved.firstMeetingId()).meeting().status()).isEqualTo("CANCELLED");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_agreements WHERE company_id=? AND status='OPEN'",Integer.class,company)).isEqualTo(1);
    }
    @Test void flowArchiveIsOwnedVersionedAndDoesNotDeleteMeetings(){
        var saved=planning.create(actor,new PlanRequest(rich(start,null),null,"Archive synthetic",false),UUID.randomUUID().toString());
        assertThatThrownBy(()->planning.archiveFlow(member,saved.flowId(),1)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->planning.archiveFlow(actor,saved.flowId(),2)).isInstanceOf(IllegalStateException.class);
        planning.archiveFlow(actor,saved.flowId(),1);assertThat(planning.flows(actor)).isEmpty();assertThat(repository.detail(actor,saved.firstMeetingId())).isNotNull();
    }
    @Test void nativeSignalsAreDurableDeduplicatedAndRecheckAccess(){
        var saved=planning.create(actor,new PlanRequest(rich(Instant.now().plusSeconds(600),null),new Recurrence("DAILY",1,2),"",false),UUID.randomUUID().toString());
        reminders.dispatch(company,saved.firstMeetingId());reminders.dispatch(company,saved.firstMeetingId());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND source_module='control_minutas'",Integer.class,company)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_reminder_receipts WHERE company_id=?",Integer.class,company)).isEqualTo(1);
        long membership=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,participant);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role,skill_level) VALUES(?,'control_minutas','user',1)",membership);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'control_minutas','meetings',1)",membership);
        planning.command(actor,saved.seriesId(),new SeriesCommand("PAUSE_REMINDERS","",1));reminders.dispatch(company,saved.firstMeetingId());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=?",Integer.class,company)).isEqualTo(1);
        planning.command(actor,saved.seriesId(),new SeriesCommand("RESUME_REMINDERS","",2));reminders.dispatch(company,saved.firstMeetingId());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=?",Integer.class,company)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND description<>''",Integer.class,company)).isZero();
    }
    @Test void planningEndpointsRequireTheirOwnTabAndCsrf()throws Exception{
        var s=session(user,company);var body=new PlanRequest(rich(start,null),new Recurrence("WEEKLY",1,2),"",false);
        mvc.perform(post("/api/v1/meetings/planning/preview").session(s).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/meetings/planning/preview").session(s).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
        mvc.perform(get("/api/v1/meetings/flows").session(session(participant,company))).andExpect(status().isForbidden());
    }
    @Test void legacyReassignmentMovesDefaultMinutesOwnerWithoutRemovingExplicitDelegation(){
        var row=create();var b=request();
        var legacy=new MeetingRequest(b.title(),b.meetingType(),b.startAt(),b.endAt(),b.timezone(),participant,List.of(),b.agenda(),b.location(),1L);
        assertThat(service.edit(actor,row.meeting().id(),legacy).planning().minutesOwner().id()).isEqualTo(participant);
        var delegated=service.create(actor,rich(start,null),UUID.randomUUID().toString());
        var removal=new MeetingRequest(b.title(),b.meetingType(),b.startAt(),b.endAt(),b.timezone(),user,List.of(),b.agenda(),b.location(),1L);
        assertThatThrownBy(()->service.edit(actor,delegated.meeting().id(),removal)).hasMessage("meeting_minutes_owner_invalid");
    }
    @Test void concurrentPlanRetriesWithMaximumLengthKeyCreateOneWholeSeries()throws Exception{
        var body=new PlanRequest(rich(start,null),new Recurrence("WEEKLY",1,3),"Concurrent flow",false);String key="a".repeat(80);
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);var ready=new java.util.concurrent.CyclicBarrier(2);
        try{java.util.concurrent.Callable<PlanResult> call=()->{ready.await(10,java.util.concurrent.TimeUnit.SECONDS);return planning.create(actor,body,key);};var first=pool.submit(call);var second=pool.submit(call);assertThat(first.get(20,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(second.get(20,java.util.concurrent.TimeUnit.SECONDS));
            assertThat(db.queryForObject("SELECT COUNT(*) FROM meeting_records WHERE company_id=?",Integer.class,company)).isEqualTo(3);assertThat(planning.flows(actor)).hasSize(1);
        }finally{pool.shutdownNow();}
    }
    @Test void futureEditRollsBackAllEarlierChangesWhenLaterAgreementBlocksRemoval(){
        var saved=planning.create(actor,new PlanRequest(rich(start,null),new Recurrence("WEEKLY",1,2),"",false),UUID.randomUUID().toString());
        var ids=db.queryForList("SELECT id FROM meeting_records WHERE company_id=? ORDER BY occurrence_number",Long.class,company);
        service.agreement(actor,new AgreementRequest(ids.get(1),"Keep assignee",participant,LocalDate.now().plusDays(5)),UUID.randomUUID().toString());
        var b=rich(start.plusSeconds(3600),1L);var removal=new MeetingRequest(b.title(),b.meetingType(),b.startAt(),b.endAt(),b.timezone(),user,List.of(),b.agenda(),b.location(),1L,b.objective(),b.expectedResult(),user,30);
        assertThatThrownBy(()->planning.editFuture(actor,saved.firstMeetingId(),new FutureEdit(removal,1))).isInstanceOf(IllegalStateException.class);
        assertThat(repository.detail(actor,saved.firstMeetingId()).meeting().startAt()).isEqualTo(start);
        assertThat(repository.detail(actor,saved.firstMeetingId()).meeting().version()).isEqualTo(1);
        assertThat(planning.series(actor,1).items().getFirst().version()).isEqualTo(1);
    }
    @Test void missingMinutesAndLateAgreementsRespectActiveMembershipTabsAndEntitlement(){
        var row=service.create(actor,rich(Instant.now().minusSeconds(7200),null),UUID.randomUUID().toString());
        long membership=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,participant);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role,skill_level) VALUES(?,'control_minutas','user',1)",membership);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'control_minutas','meetings',0),(?,'control_minutas','agreements',1)",membership,membership);
        service.agreement(actor,new AgreementRequest(row.meeting().id(),"Late synthetic",participant,LocalDate.now(ZoneOffset.UTC).minusDays(1)),UUID.randomUUID().toString());
        reminders.dispatch(company,row.meeting().id());reminders.dispatch(company,row.meeting().id());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND event_type='missing_minutes'",Integer.class,company)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND event_type='overdue_agreement'",Integer.class,company)).isEqualTo(1);
        service.agreement(actor,new AgreementRequest(row.meeting().id(),"Other late synthetic",participant,LocalDate.now(ZoneOffset.UTC).minusDays(1)),UUID.randomUUID().toString());
        db.update("UPDATE user_companies SET status='inactive' WHERE id=?",membership);reminders.dispatch(company,row.meeting().id());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=?",Integer.class,company)).isEqualTo(2);
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=?",company);reminders.dispatch(company,row.meeting().id());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=?",Integer.class,company)).isEqualTo(2);
    }
    @Test void cancelFutureDoesNotChangePastOrStartedSessions(){
        var saved=planning.create(actor,new PlanRequest(rich(start,null),new Recurrence("DAILY",1,3),"",false),UUID.randomUUID().toString());
        var ids=db.queryForList("SELECT id FROM meeting_records WHERE company_id=? ORDER BY occurrence_number",Long.class,company);
        db.update("UPDATE meeting_records SET start_at=?,end_at=? WHERE company_id=? AND id=?",java.sql.Timestamp.from(Instant.now().minusSeconds(7200)),java.sql.Timestamp.from(Instant.now().minusSeconds(3600)),company,ids.get(0));
        service.transition(actor,ids.get(1),new TransitionRequest("IN_PROGRESS","",1));
        planning.command(actor,saved.seriesId(),new SeriesCommand("CANCEL_FUTURE","Keep history",1));
        assertThat(repository.detail(actor,ids.get(0)).meeting().status()).isEqualTo("PLANNED");assertThat(repository.detail(actor,ids.get(1)).meeting().status()).isEqualTo("IN_PROGRESS");assertThat(repository.detail(actor,ids.get(2)).meeting().status()).isEqualTo("CANCELLED");
    }

    @Test void attendanceIsActualVersionedScopedAndFrozenAtClosure() {
        var meeting=create();long id=meeting.meeting().id();
        assertThat(operational.attendance(actor,id).people()).extracting(AttendancePerson::status).containsOnly("UNMARKED");
        assertThatThrownBy(()->operational.attendance(outsider,id)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->operational.attendance(actor,id,new AttendanceRequest(List.of(new AttendanceEntry(participant,"PRESENT")),1))).isInstanceOf(IllegalStateException.class);
        service.transition(actor,id,new TransitionRequest("IN_PROGRESS","",1));
        assertThatThrownBy(()->operational.attendance(member,id,new AttendanceRequest(List.of(new AttendanceEntry(participant,"PRESENT")),2))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->operational.attendance(actor,id,new AttendanceRequest(List.of(new AttendanceEntry(stranger,"PRESENT")),2))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->operational.attendance(actor,id,new AttendanceRequest(List.of(new AttendanceEntry(participant,"PRESENT"),new AttendanceEntry(participant,"ABSENT")),2))).isInstanceOf(IllegalArgumentException.class);
        var saved=operational.attendance(actor,id,new AttendanceRequest(List.of(new AttendanceEntry(participant,"PRESENT"),new AttendanceEntry(user,"ABSENT")),2));
        assertThat(saved.version()).isEqualTo(3);
        assertThat(saved.people()).filteredOn(p->p.userId()==participant).extracting(AttendancePerson::status).containsExactly("PRESENT");
        assertThat(repository.detail(member,id).participants()).extracting(Member::id).contains(participant);
        assertThatThrownBy(()->operational.attendance(actor,id,new AttendanceRequest(List.of(new AttendanceEntry(user,"PRESENT")),2))).isInstanceOf(IllegalStateException.class);
        service.minutes(actor,id,new MinutesRequest("Real meeting evidence","Decision preserved",3));
        service.transition(actor,id,new TransitionRequest("COMPLETED","",4));
        assertThatThrownBy(()->operational.attendance(actor,id,new AttendanceRequest(List.of(new AttendanceEntry(user,"PRESENT")),5))).isInstanceOf(IllegalStateException.class);
        assertThat(operational.attendance(actor,id).people()).extracting(AttendancePerson::status).containsExactlyInAnyOrder("PRESENT","ABSENT");
    }
    @Test void delegatedWriterCanRecordAttendanceButCannotConcludeMeeting() {
        var b=request();long id=service.create(actor,new MeetingRequest(b.title(),b.meetingType(),b.startAt(),b.endAt(),b.timezone(),b.ownerId(),b.participantIds(),b.agenda(),b.location(),null,"Purpose","Decision",participant,0),UUID.randomUUID().toString()).meeting().id();
        service.transition(actor,id,new TransitionRequest("IN_PROGRESS","",1));
        operational.attendance(member,id,new AttendanceRequest(List.of(new AttendanceEntry(participant,"PRESENT")),2));
        assertThatThrownBy(()->service.transition(member,id,new TransitionRequest("COMPLETED","",3))).isInstanceOf(SecurityException.class);
    }
    @Test void hrInactivePeopleCannotBeNewlyAssignedButHistoricalNamesRemain() {
        var row=create();
        long membership=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,participant);
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,status) VALUES(?,?,?,'active')",company,membership,participant);
        try {
            assertThat(repository.members(company).items()).extracting(Member::id).contains(user,participant);
            db.update("UPDATE user_work_profiles SET status='inactive' WHERE company_id=? AND user_company_id=?",company,membership);
            assertThat(repository.members(company).items()).extracting(Member::id).contains(user).doesNotContain(participant);
            assertThat(repository.detail(actor,row.meeting().id()).participants()).extracting(Member::id).contains(participant);
            assertThat(repository.choices(actor,"",row.meeting().id(),1,25).items().getFirst().participants()).extracting(Member::id).contains(user).doesNotContain(participant);
            assertThatThrownBy(()->service.create(actor,request(),UUID.randomUUID().toString())).isInstanceOf(MeetingPlanningException.class);
            assertThatThrownBy(()->service.agreement(actor,new AgreementRequest(row.meeting().id(),"New assignment",participant,LocalDate.now()),UUID.randomUUID().toString())).isInstanceOf(MeetingPlanningException.class);
        } finally { db.update("DELETE FROM user_work_profiles WHERE company_id=? AND user_company_id=?",company,membership); }
    }
    @Test void suggestionsRespectConfiguredAgendaHoursBreaksAndOtherMeetings() {
        long staff=repository.insert("INSERT INTO scheduling_staff(company_id,user_id,public_name,timezone,active,buffer_minutes) VALUES(?,?,'Synthetic employee','UTC',1,30)",company,participant);
        int day=start.atZone(ZoneOffset.UTC).getDayOfWeek().getValue();
        db.update("INSERT INTO scheduling_availability(company_id,staff_id,day_of_week,start_time,end_time) VALUES(?,?,?,'09:00','12:00')",company,staff,day);
        try {
            var available=operational.availability(actor,new AvailabilityRequest(request(),null));assertThat(available.available()).isTrue();assertThat(available.alternatives()).isNotEmpty();
            assertThat(available.alternatives()).allMatch(o->!o.endAt().plusSeconds(30*60).isAfter(start.atZone(ZoneOffset.UTC).toLocalDate().atTime(12,0).toInstant(ZoneOffset.UTC)));
            var meeting=create();
            assertThat(operational.availability(actor,new AvailabilityRequest(request(),null)).available()).isFalse();
            assertThat(operational.availability(actor,new AvailabilityRequest(request(),meeting.meeting().id())).available()).isTrue();
            var b=request();var late=new MeetingRequest(b.title(),b.meetingType(),start.plusSeconds(3600),start.plusSeconds(7200),"UTC",user,List.of(participant),"","",null);
            assertThatThrownBy(()->service.create(actor,late,UUID.randomUUID().toString())).isInstanceOf(MeetingPlanningException.class);
            db.update("INSERT INTO scheduling_unavailable_dates(company_id,staff_id,unavailable_date) VALUES(?,?,?)",company,staff,java.sql.Date.valueOf(start.atZone(ZoneOffset.UTC).toLocalDate()));
            assertThat(operational.availability(actor,new AvailabilityRequest(request(),meeting.meeting().id())).available()).isFalse();
        } finally { db.update("DELETE FROM scheduling_unavailable_dates WHERE company_id=?",company);db.update("DELETE FROM scheduling_availability WHERE company_id=?",company);db.update("DELETE FROM scheduling_staff WHERE company_id=?",company); }
    }
    @Test void attendanceAndAvailabilityEndpointsRequireCsrfAndIndependentTabPermission() throws Exception {
        long id=create().meeting().id();var body=new AttendanceRequest(List.of(new AttendanceEntry(participant,"PRESENT")),1);
        mvc.perform(put("/api/v1/meetings/"+id+"/attendance").session(session(user,company)).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/meetings/availability").session(session(user,company)).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new AvailabilityRequest(request(),null)))).andExpect(status().isForbidden());
        long uc=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,participant);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'control_minutas','user')",uc);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'control_minutas','agreements',1)",uc);
        mvc.perform(get("/api/v1/meetings/"+id+"/attendance").session(session(participant,company))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/meetings/availability").session(session(participant,company)).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new AvailabilityRequest(request(),null)))).andExpect(status().isForbidden());
    }
    @Test void agreementFollowupCanBeDisabledAtCreationAndClosingNeverClosesAgreement() {
        var m=create();var agreement=service.agreement(actor,new AgreementRequest(m.meeting().id(),"Concrete next action",user,LocalDate.now().plusDays(1),false),UUID.randomUUID().toString());
        assertThat(agreement.followupEnabled()).isFalse();
        service.minutes(actor,m.meeting().id(),new MinutesRequest("Minutes","Decision",1));
        service.transition(actor,m.meeting().id(),new TransitionRequest("IN_PROGRESS","",2));
        service.transition(actor,m.meeting().id(),new TransitionRequest("COMPLETED","",3));
        assertThat(repository.agreement(actor,agreement.id(),false).status()).isEqualTo("OPEN");
    }

}
