package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import static com.indice.erp.meetings.MeetingVotingDtos.*;
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
class MeetingVotingIntegrationTest {
    @Autowired MeetingRepository repository;
    @Autowired MeetingService meetings;
    @Autowired MeetingVotingService voting;
    @Autowired JdbcTemplate db;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    long company,other,owner,member,observer,outsider,meeting;
    AuthSessionUser actor,participant,guest,external;
    @BeforeEach void setup(){
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        company=repository.insert("INSERT INTO companies(name) VALUES(?)","Voting synthetic "+UUID.randomUUID());
        other=repository.insert("INSERT INTO companies(name) VALUES(?)","Voting other "+UUID.randomUUID());
        owner=user(company,"Owner","superadmin");member=user(company,"Member","user");observer=user(company,"Observer","user");outsider=user(company,"Outsider","superadmin");
        actor=new AuthSessionUser(owner,company,"Owner","superadmin");participant=new AuthSessionUser(member,company,"Member","user");guest=new AuthSessionUser(observer,company,"Observer","user");external=new AuthSessionUser(outsider,company,"Outsider","superadmin");
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'control_minutas','active','test')",company);
        permit(member,"meetings");permit(observer,"meetings");
        var start=Instant.now().plusSeconds(3600);
        meeting=meetings.create(actor,new MeetingRequest("Synthetic weighted meeting","WORKING",start,start.plusSeconds(3600),"UTC",owner,List.of(member,observer),"Review decisions","",null),UUID.randomUUID().toString()).meeting().id();
        meetings.transition(actor,meeting,new TransitionRequest("IN_PROGRESS","",1));
    }
    long user(long tenant,String name,String role){
        long id=repository.insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic',?)","vote-"+UUID.randomUUID()+"@example.com",name);
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,?,'active','all')",tenant,id,role);return id;
    }
    void permit(long user,String tab){
        long id=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,user);
        db.update("INSERT IGNORE INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'control_minutas','user')",id);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'control_minutas',?,1)",id,tab);
    }
    MockHttpSession session(long user,long tenant){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,user);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,tenant);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    OpenRequest request(){return new OpenRequest("Approve the revised plan","Concrete operational proposal","MAJORITY","MAJORITY",List.of(new Role("lead","Coordination",3),new Role("team","Member",2),new Role("guest","Guest",0)),List.of(new Assignment(owner,"lead"),new Assignment(member,"team"),new Assignment(observer,"guest")));}
    Detail open(){return voting.open(actor,meeting,request(),UUID.randomUUID().toString());}
    @AfterEach void cleanup(){
        for(long tenant:new long[]{company,other})if(tenant>0){
            for(String table:List.of("meeting_ballot_audit","meeting_ballot_voters","meeting_ballot_roles","meeting_ballots","meeting_create_replays","meeting_workflow_audit","meeting_reminder_receipts","meeting_audit","meeting_agreements","meeting_participants","meeting_records","meeting_series","meeting_flows"))db.update("DELETE FROM "+table+" WHERE company_id=?",tenant);
            db.update("DELETE FROM companies WHERE id=?",tenant);
        }
        for(long user:new long[]{owner,member,observer,outsider})if(user>0)db.update("DELETE FROM users WHERE id=?",user);
    }
    @Test void rosterUsesRealMembersAndWeightsAreFrozenAndReplaySafe(){
        assertThat(voting.team(actor,meeting).people()).extracting(TeamPerson::userId).containsExactlyInAnyOrder(owner,member,observer);
        String key=UUID.randomUUID().toString();var ballot=voting.open(actor,meeting,request(),key);
        assertThat(voting.open(actor,meeting,request(),key).ballot().id()).isEqualTo(ballot.ballot().id());
        assertThat(voting.team(actor,meeting).previous().roles()).extracting(Role::weight).containsExactly(0,3,2);
        assertThat(voting.team(actor,meeting).previous().assignments()).extracting(Assignment::userId).containsExactlyInAnyOrder(owner,member,observer);
        assertThat(ballot.ballot().totalWeight()).isEqualTo(5);assertThat(ballot.ballot().approvalWeight()).isEqualTo(3);
        assertThat(ballot.ballot().quorumWeight()).isEqualTo(3);assertThat(ballot.ballot().outcome()).isEqualTo("PENDING");
        assertThat(ballot.voters()).filteredOn(p->p.userId()==owner).extracting(Voter::weight).containsExactly(3);
        var b=request();var changed=new OpenRequest("Changed",b.description(),b.approvalRule(),b.quorumRule(),b.roles(),b.voters());
        assertThatThrownBy(()->voting.open(actor,meeting,changed,key)).isInstanceOf(IllegalStateException.class);
        assertThat(voting.list(actor,meeting,1).total()).isEqualTo(1);
    }
    @Test void eachActorVotesOnlyItsFrozenPointsAndCanCorrectUntilClosing(){
        long id=open().ballot().id();var cast=voting.cast(participant,meeting,id,new VoteRequest("YES",0));
        assertThat(cast.ballot().tally().yes()).isEqualTo(2);assertThat(cast.ballot().myVoteVersion()).isEqualTo(1);
        assertThat(voting.cast(participant,meeting,id,new VoteRequest("YES",0)).ballot().tally().yes()).isEqualTo(2);
        var corrected=voting.cast(participant,meeting,id,new VoteRequest("ABSTAIN",1));
        assertThat(corrected.ballot().tally().yes()).isZero();assertThat(corrected.ballot().tally().abstain()).isEqualTo(2);
        assertThat(corrected.history()).extracting(Audit::action).contains("VOTE_CHANGED","VOTED");
        assertThatThrownBy(()->voting.cast(participant,meeting,id,new VoteRequest("NO",0))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->voting.cast(guest,meeting,id,new VoteRequest("YES",0))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->voting.cast(external,meeting,id,new VoteRequest("YES",0))).isInstanceOf(SecurityException.class);
    }
    @Test void weightedResultRequiresExplicitCloseAndIsPartOfMinutes(){
        long id=open().ballot().id();var cast=voting.cast(actor,meeting,id,new VoteRequest("YES",0));
        assertThat(cast.ballot().tally().yes()).isEqualTo(3);assertThat(cast.ballot().outcome()).isEqualTo("PENDING");
        var closed=voting.close(actor,meeting,id,new CloseRequest("CLOSE","",cast.ballot().version()));
        assertThat(closed.ballot().outcome()).isEqualTo("APPROVED");
        assertThat(voting.close(actor,meeting,id,new CloseRequest("CLOSE","",cast.ballot().version())).ballot().version()).isEqualTo(closed.ballot().version());
        assertThat(repository.detail(actor,meeting).votingResults()).extracting(Result::outcome).containsExactly("APPROVED");
        assertThatThrownBy(()->voting.cast(participant,meeting,id,new VoteRequest("YES",0))).isInstanceOf(IllegalStateException.class);
        assertThat(voting.cast(actor,meeting,id,new VoteRequest("YES",0)).ballot().outcome()).isEqualTo("APPROVED");
    }
    @Test void quorumCountsAbstentionsAndMissingVotesStayMissing(){
        long id=open().ballot().id();var first=voting.cast(participant,meeting,id,new VoteRequest("YES",0));
        var noQuorum=voting.close(actor,meeting,id,new CloseRequest("CLOSE","",first.ballot().version()));assertThat(noQuorum.ballot().outcome()).isEqualTo("NO_QUORUM");
        long second=open().ballot().id();var abstain=voting.cast(actor,meeting,second,new VoteRequest("ABSTAIN",0));
        assertThat(abstain.ballot().tally().cast()).isEqualTo(3);
        assertThat(voting.close(actor,meeting,second,new CloseRequest("CLOSE","",abstain.ballot().version())).ballot().outcome()).isEqualTo("NOT_APPROVED");
    }
    @Test void cannotCloseMeetingWithOpenBallotsAndCancellingPreservesVotes(){
        long id=open().ballot().id();voting.cast(participant,meeting,id,new VoteRequest("NO",0));
        meetings.minutes(actor,meeting,new MinutesRequest("Actual minutes","Decision notes",2));
        assertThatThrownBy(()->meetings.transition(actor,meeting,new TransitionRequest("COMPLETED","",3))).isInstanceOf(MeetingPlanningException.class);
        meetings.transition(actor,meeting,new TransitionRequest("CANCELLED","Cancelled by coordinator",3));
        var cancelled=voting.detail(actor,meeting,id);assertThat(cancelled.ballot().status()).isEqualTo("CANCELLED");
        assertThat(cancelled.ballot().tally().no()).isEqualTo(2);assertThat(cancelled.ballot().closeReason()).isEqualTo("Cancelled by coordinator");
    }
    @Test void activeEmployeeAndCurrentModulePermissionsAreRecheckedWithoutChangingSnapshot(){
        long id=open().ballot().id();long uc=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,member);
        db.update("UPDATE user_company_tab_permissions SET can_view=0 WHERE user_company_id=?",uc);
        assertThatThrownBy(()->voting.cast(participant,meeting,id,new VoteRequest("YES",0))).isInstanceOf(SecurityException.class);
        assertThat(voting.detail(actor,meeting,id).ballot().totalWeight()).isEqualTo(5);
        assertThat(voting.detail(actor,meeting,id).voters()).filteredOn(p->p.userId()==member).extracting(Voter::eligible).containsExactly(false);
        assertThatThrownBy(this::open).isInstanceOf(MeetingPlanningException.class);
        db.update("UPDATE user_company_tab_permissions SET can_view=1 WHERE user_company_id=?",uc);
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,status) VALUES(?,?,?,'inactive')",company,uc,member);
        try{assertThatThrownBy(()->voting.cast(participant,meeting,id,new VoteRequest("YES",0))).isInstanceOf(MeetingPlanningException.class);}
        finally{db.update("DELETE FROM user_work_profiles WHERE company_id=? AND user_company_id=?",company,uc);}
    }
    @Test void rejectsForeignTeamsBadFunctionsAndBlankOrZeroWeightBeforeAnyWrite(){
        var b=request();
        assertThatThrownBy(()->voting.open(participant,meeting,b,UUID.randomUUID().toString())).isInstanceOf(SecurityException.class);
        var foreign=new OpenRequest(b.subject(),b.description(),b.approvalRule(),b.quorumRule(),b.roles(),List.of(new Assignment(owner,"lead"),new Assignment(outsider,"team"),new Assignment(observer,"guest")));
        assertThatThrownBy(()->voting.open(actor,meeting,foreign,UUID.randomUUID().toString())).isInstanceOf(MeetingPlanningException.class);
        var invalid=new OpenRequest(b.subject(),b.description(),b.approvalRule(),b.quorumRule(),List.of(new Role("a","Same",1),new Role("a","Same",2)),b.voters());
        assertThatThrownBy(()->voting.open(actor,meeting,invalid,UUID.randomUUID().toString())).isInstanceOf(MeetingPlanningException.class);
        var zero=new OpenRequest(b.subject(),b.description(),b.approvalRule(),b.quorumRule(),List.of(new Role("guest","Guest",0)),List.of(new Assignment(owner,"guest"),new Assignment(member,"guest"),new Assignment(observer,"guest")));
        assertThatThrownBy(()->voting.open(actor,meeting,zero,UUID.randomUUID().toString())).isInstanceOf(MeetingPlanningException.class);
        assertThat(voting.list(actor,meeting,1).total()).isZero();
    }
    @Test void httpRequiresCsrfTenantObjectAndMeetingTabAndIgnoresForgedVoterWeight() throws Exception {
        long id=open().ballot().id();String url="/api/v1/meetings/"+meeting+"/ballots/"+id+"/vote";
        mvc.perform(put(url).session(session(member,company)).contentType(MediaType.APPLICATION_JSON).content("{\"choice\":\"YES\",\"expectedVoteVersion\":0}")).andExpect(status().isForbidden());
        mvc.perform(put(url).session(session(member,company)).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content("{\"choice\":\"YES\",\"expectedVoteVersion\":0,\"userId\":"+owner+",\"weight\":999}")).andExpect(status().isOk()).andExpect(jsonPath("$.ballot.tally.yes").value(2));
        mvc.perform(post("/api/v1/meetings/"+meeting+"/ballots/"+id+"/close").session(session(member,company)).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"CLOSE\",\"reason\":\"\",\"expectedVersion\":2}")).andExpect(status().isForbidden());
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'superadmin','active','all')",other,observer);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'control_minutas','active','test')",other);
        mvc.perform(get("/api/v1/meetings/"+meeting+"/ballots/"+id).session(session(observer,other))).andExpect(status().isNotFound());
        long uc=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,observer);
        db.update("UPDATE user_company_tab_permissions SET tab_key='agreements' WHERE user_company_id=?",uc);
        mvc.perform(get("/api/v1/meetings/"+meeting+"/ballots/"+id).session(session(observer,company))).andExpect(status().isForbidden());
    }

    @Test void simultaneousVotesUseIndependentVoterVersionsAndStaleClosingMustReview() throws Exception {
        long id=open().ballot().id();var pool=java.util.concurrent.Executors.newFixedThreadPool(2);var ready=new java.util.concurrent.CyclicBarrier(2);
        try {
            var first=pool.submit(()->{ready.await();return voting.cast(actor,meeting,id,new VoteRequest("YES",0));});
            var second=pool.submit(()->{ready.await();return voting.cast(participant,meeting,id,new VoteRequest("NO",0));});
            first.get(20,java.util.concurrent.TimeUnit.SECONDS);second.get(20,java.util.concurrent.TimeUnit.SECONDS);
        } finally {pool.shutdownNow();}
        var detail=voting.detail(actor,meeting,id);assertThat(detail.ballot().tally().yes()).isEqualTo(3);assertThat(detail.ballot().tally().no()).isEqualTo(2);
        assertThat(detail.ballot().tally().castCount()).isEqualTo(2);assertThat(detail.ballot().version()).isEqualTo(3);
        assertThatThrownBy(()->voting.close(actor,meeting,id,new CloseRequest("CLOSE","",1))).isInstanceOf(IllegalStateException.class);
        assertThat(voting.close(actor,meeting,id,new CloseRequest("CLOSE","",3)).ballot().outcome()).isEqualTo("APPROVED");
    }
}
