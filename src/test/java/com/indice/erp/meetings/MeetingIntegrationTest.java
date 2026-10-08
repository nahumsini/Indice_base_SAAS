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

@SpringBootTest(properties="app.email.enabled=false")
@AutoConfigureMockMvc
class MeetingIntegrationTest {
    @Autowired MeetingRepository repository;
    @Autowired MeetingService service;
    @Autowired MeetingPlanningService planning;
    @Autowired MeetingReminderService reminders;
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
        for(long tenant:new long[]{company,other})if(tenant>0){for(String table:List.of("meeting_create_replays","meeting_workflow_audit","meeting_reminder_receipts","meeting_audit","meeting_agreements","meeting_participants","meeting_records","meeting_series","meeting_flows"))db.update("DELETE FROM "+table+" WHERE company_id=?",tenant);db.update("DELETE FROM companies WHERE id=?",tenant);}
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
}
