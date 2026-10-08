package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import static org.assertj.core.api.Assertions.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.kiosk.engine.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties={"kiosk.engine.adapter.scheduling.enabled=true","app.email.enabled=false"})
@AutoConfigureMockMvc
class SchedulingIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate db;
    @Autowired SchedulingRepository repository;
    @Autowired SchedulingConfigurationService configuration;
    @Autowired SchedulingBookingService booking;
    @Autowired SchedulingReservationManagementService management;
    @Autowired com.indice.erp.sales.SalesClientDirectoryService clientDirectory;
    @Autowired SchedulingResourceAvailabilityService resources;
    @Autowired ModuleAccessService modules;
    @Autowired SchedulingPublicAdapter adapter;
    @Autowired KioskRegistryService registry;
    @Autowired KioskPayloadProtectionService protection;
    @Autowired KioskActionDispatcher dispatcher;
    @Autowired PlatformTransactionManager transactions;
    private long company,otherCompany,user,staff,service;
    private AuthSessionUser actor;
    private String email;
    private Instant start;
    private final List<Long> extraUsers=new ArrayList<>();

    @BeforeEach void setup(){
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        String key=UUID.randomUUID().toString();email="scheduling-"+key+"@example.com";
        user=repository.insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-test-only','Synthetic consultant')",email);
        company=company("Scheduling "+key);otherCompany=company("Scheduling other "+key);
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'superadmin','active','all')",company,user);
        actor=new AuthSessionUser(user,company,"Synthetic consultant","superadmin");
        assertThat(modules.companyCanAccess(company,"scheduling")).isFalse();
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'scheduling','active','test')",company);
        configuration.service(actor,null,new ServiceRequest("Diagnosis","",60,15,1,true,null));
        service=repository.services(company).getFirst().id();
        var days=new ArrayList<AvailabilityDay>();for(int day=1;day<=7;day++)days.add(new AvailabilityDay(day,LocalTime.of(9,0),LocalTime.of(17,0)));
        configuration.staff(actor,null,new StaffRequest(user,"Synthetic consultant","UTC",true,days,null));
        staff=repository.staff(company).getFirst().id();start=LocalDate.now(ZoneOffset.UTC).plusDays(2).atTime(10,0).toInstant(ZoneOffset.UTC);
    }
    private long company(String name){return repository.insert("INSERT INTO companies(name) VALUES(?)",name);}
    private ReservationRequest request(String suffix){return new ReservationRequest(service,null,staff,start,"Synthetic attendee","attendee-"+suffix+"@example.com","Synthetic","",true);}
    private long reservation(Submission response){return db.queryForObject("SELECT id FROM scheduling_reservations WHERE company_id=? AND reference=?",Long.class,company,response.reference());}
    private long create(String suffix){return reservation(booking.requestInternal(actor,request(suffix),UUID.randomUUID().toString()));}
    private ReservationItem confirm(AuthSessionUser owner,long id){var row=repository.reservation(owner.companyId(),id);return booking.transition(owner,id,new TransitionRequest("CONFIRMED","",row.version()));}
    @AfterEach void cleanup(){
        for(long tenant:new long[]{company,otherCompany})if(tenant>0){
            for(String table:List.of("scheduling_capture_replays","scheduling_audit","scheduling_reservations","scheduling_events","scheduling_pages","scheduling_availability","scheduling_staff","scheduling_services","consulting_appointments","sales_contacts"))
                db.update("DELETE FROM "+table+" WHERE company_id=?",tenant);
            var kiosks=db.queryForList("SELECT id FROM kiosk_definitions WHERE company_id=? AND owner_module='SCHEDULING'",Long.class,tenant);
            for(long kiosk:kiosks){db.update("DELETE FROM kiosk_definition_capabilities WHERE kiosk_definition_id=?",kiosk);db.update("DELETE FROM kiosk_definitions WHERE id=?",kiosk);}
            db.update("DELETE FROM companies WHERE id=?",tenant);
        }
        if(user>0)db.update("DELETE FROM users WHERE id=?",user);
        for(long id:extraUsers)db.update("DELETE FROM users WHERE id=?",id);
    }
    private long additionalStaff(){
        long id=repository.insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-test-only','Synthetic second consultant')","workspace-"+UUID.randomUUID()+"@example.com");
        extraUsers.add(id);
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'user','active','all')",company,id);
        configuration.staff(actor,null,new StaffRequest(id,"Second consultant","UTC",true,repository.days(company,staff),null));
        return repository.staff(company).stream().filter(item->item.userId()==id).findFirst().orElseThrow().id();
    }
    private MockHttpSession session(){
        var session=new MockHttpSession();
        session.setAttribute(com.indice.erp.auth.SessionAuthService.SESSION_USER_ID,user);
        session.setAttribute(com.indice.erp.auth.SessionAuthService.SESSION_COMPANY_ID,company);
        session.setAttribute(com.indice.erp.auth.SessionAuthService.SESSION_USER_NAME,"Synthetic consultant");
        session.setAttribute(com.indice.erp.auth.SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-workspace-csrf");
        return session;
    }
    @Test void pausingReleasesOccupancyAndResumeChecksCurrentAvailability(){
        long first=create("pause-first"),second=create("pause-second");confirm(actor,first);
        var paused=management.manage(actor,first,new ManageRequest("PAUSE","Synthetic pause",2));
        assertThat(paused.status()).isEqualTo("PAUSED");assertThat(paused.pausedFromStatus()).isEqualTo("CONFIRMED");
        confirm(actor,second);
        assertThatThrownBy(()->management.manage(actor,first,new ManageRequest("RESUME","Synthetic resume",paused.version())))
            .isInstanceOf(IllegalStateException.class);
        assertThat(repository.reservation(company,first).version()).isEqualTo(paused.version());
        booking.transition(actor,second,new TransitionRequest("CANCELLED","Release slot",2));
        var resumed=management.manage(actor,first,new ManageRequest("RESUME","Synthetic resume",paused.version()));
        assertThat(resumed.status()).isEqualTo("CONFIRMED");assertThat(resumed.pausedFromStatus()).isNull();
        assertThatThrownBy(()->management.manage(actor,first,new ManageRequest("PAUSE","Stale",paused.version())))
            .isInstanceOf(IllegalStateException.class);
    }
    @Test void reassignmentIsAdminTenantScopedVersionedAndAvailabilityChecked(){
        long target=additionalStaff(),id=create("assignment");confirm(actor,id);
        var otherRequest=new ReservationRequest(service,null,target,start,"Synthetic second","second@example.com","","",true);
        long other=reservation(booking.requestInternal(actor,otherRequest,UUID.randomUUID().toString()));confirm(actor,other);
        assertThatThrownBy(()->management.reassign(actor,id,new ReassignRequest(target,"Synthetic reassignment",2)))
            .isInstanceOf(IllegalStateException.class);
        assertThat(repository.reservation(company,id).staffId()).isEqualTo(staff);
        booking.transition(actor,other,new TransitionRequest("CANCELLED","Release target",2));
        assertThatThrownBy(()->management.reassign(new AuthSessionUser(user,company,"Synthetic","user"),id,new ReassignRequest(target,"Not admin",2)))
            .isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->management.reassign(new AuthSessionUser(user,otherCompany,"Synthetic","superadmin"),id,new ReassignRequest(target,"Wrong tenant",2)))
            .isInstanceOf(NoSuchElementException.class);
        // An inactive former member must not trap the company's existing bookings.
        db.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND user_id=?",company,user);
        var assigned=management.reassign(actor,id,new ReassignRequest(target,"Synthetic reassignment",2));
        assertThat(assigned.staffId()).isEqualTo(target);assertThat(assigned.durationMinutes()).isEqualTo(60);
        assertThat(assigned.status()).isEqualTo("CONFIRMED");assertThat(assigned.version()).isEqualTo(3);
        assertThat(db.queryForObject("SELECT previous_staff_id FROM scheduling_audit WHERE company_id=? AND entity_id=? AND action='RESERVATION_REASSIGNED'",Long.class,company,id)).isEqualTo(staff);
    }
    @Test void archivingRetainsBusinessEvidenceAndExcludesOnlyOperationalLists(){
        long id=create("archive");confirm(actor,id);
        var retired=management.manage(actor,id,new ManageRequest("ARCHIVE","Synthetic retirement",2));
        assertThat(retired.status()).isEqualTo("CANCELLED");assertThat(retired.archivedAt()).isNotNull();
        assertThat(repository.reservations(company,null,start.minusSeconds(1),start.plusSeconds(86400),1,25).total()).isZero();
        assertThat(repository.reservations(company,null,start.minusSeconds(1),start.plusSeconds(86400),1,25,null,null,true).total()).isEqualTo(1);
        assertThat(repository.metrics(company,null,start.minusSeconds(1),start.plusSeconds(86400)).cancelled()).isEqualTo(1);
        assertThatThrownBy(()->management.manage(actor,id,new ManageRequest("RESUME","Cannot restore retired",retired.version()))).isInstanceOf(IllegalStateException.class);
        long historical=create("historical");
        db.update("UPDATE scheduling_reservations SET status='COMPLETED' WHERE company_id=? AND id=?",company,historical);
        assertThat(management.manage(actor,historical,new ManageRequest("ARCHIVE","Hide historical row",1)).status()).isEqualTo("COMPLETED");
        assertThat(repository.metrics(company,null,start.minusSeconds(1),start.plusSeconds(86400)).completed()).isEqualTo(1);
    }
    @Test void pausedWebinarIdentityIsRetainedAndCancellationIncludesPausedParticipants(){
        configuration.event(actor,null,new EventRequest(staff,"Synthetic webinar","",start,60,5,true,null));
        var event=repository.events(company).getFirst();
        var request=new ReservationRequest(null,event.id(),staff,start,"Synthetic","paused-event@example.com","","",true);
        long id=reservation(booking.requestInternal(actor,request,UUID.randomUUID().toString()));confirm(actor,id);
        management.manage(actor,id,new ManageRequest("PAUSE","Synthetic pause",2));
        assertThat(reservation(booking.requestInternal(actor,request,UUID.randomUUID().toString()))).isEqualTo(id);
        assertThat(repository.event(company,event.id()).confirmedCount()).isZero();
        configuration.cancelEvent(actor,event.id(),new TransitionRequest("CANCELLED","Synthetic cancellation",event.version()));
        assertThat(repository.reservation(company,id).status()).isEqualTo("CANCELLED");
        assertThat(repository.reservation(company,id).pausedFromStatus()).isNull();
    }
    @Test void publicAppearanceIsSafeVersionedAndOldClientsPreserveIt()throws Exception{
        var appearance=new PageAppearance("Synthetic company","#008577","#FFF4D4","Solicitar sesión","compact");
        var page=configuration.page(actor,new PageRequest("appearance-"+UUID.randomUUID(),"Synthetic page","",true,null,appearance));
        var token=protection.reveal(repository.protectedToken(company));
        var context=KioskExecutionContext.publicLink("SCHEDULING",token,"synthetic-network","synthetic-browser").resolved(registry.resolvePublic("SCHEDULING",token),null);
        assertThat(adapter.bootstrap(context).toString()).contains("Synthetic company","#008577","compact").doesNotContain(email,"attendeeEmail");
        var preserved=configuration.page(actor,new PageRequest(page.alias(),"Old client title","",true,page.version()));
        assertThat(preserved.appearance()).isEqualTo(appearance);
        var invalid=new PageRequest(page.alias(),page.title(),"",true,preserved.version(),new PageAppearance("","url(unsafe)","#FFFFFF","","cards"));
        mvc.perform(put("/api/v1/scheduling/page").session(session()).header("X-CSRF-Token","synthetic-workspace-csrf")
            .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(invalid))).andExpect(status().isBadRequest());
    }
    @Test void calendarScopeAndPrivateMutationGuardsAreEnforcedOverHttp()throws Exception{
        long second=additionalStaff(),id=create("http-workspace");var session=session();
        String range="?from="+start.minusSeconds(1)+"&to="+start.plusSeconds(86400);
        mvc.perform(get("/api/v1/scheduling/calendar-grid"+range).session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/v1/scheduling/calendar-grid"+range+"&staffId="+second).session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/scheduling/calendar-grid?from="+start+"&to="+start.plusSeconds(44*86400L)).session(session)).andExpect(status().isBadRequest());
        String body=mapper.writeValueAsString(new ManageRequest("PAUSE","Synthetic pause",1));
        mvc.perform(post("/api/v1/scheduling/reservations/"+id+"/management").session(session).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/scheduling/reservations/"+id+"/management").session(session).header("X-CSRF-Token","synthetic-workspace-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAUSED"));
        assertThat(repository.reservations(company,user,start.minusSeconds(1),start.plusSeconds(86400),1,25,null,second,false).total()).isZero();
    }
    @Test void masterClientsAreReadOnlyTenantScopedAndNotCreatedByRequests()throws Exception{
        db.update("INSERT INTO sales_contacts(company_id,contact_code,company_name,contact_person,email,phone,status) VALUES(?,'WORKSPACE-TEST','Synthetic master','Synthetic person','master@example.com','','ACTIVE')",company);
        db.update("INSERT INTO sales_contacts(company_id,contact_code,company_name,contact_person,email,phone,status) VALUES(?,'WORKSPACE-OTHER','Other master','Other person','other@example.com','','ACTIVE')",otherCompany);
        assertThat(clientDirectory.read(company,"",1,25).total()).isEqualTo(1);
        assertThat(clientDirectory.read(company,"%",1,25).total()).isZero();
        create("not-a-new-client");assertThat(clientDirectory.read(company,"",1,25).total()).isEqualTo(1);
        mvc.perform(get("/api/v1/scheduling/clients").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].companyName").value("Synthetic master"));
        mvc.perform(get("/api/v1/scheduling/clients")).andExpect(status().isUnauthorized());
        db.update("UPDATE user_companies SET role='user' WHERE company_id=? AND user_id=?",company,user);
        mvc.perform(get("/api/v1/scheduling/clients").session(session())).andExpect(status().isForbidden());
    }
    @Test void requestsAreReviewOnlyTenantOwnedAndPrivateRetriesArePayloadBound(){
        String key=UUID.randomUUID().toString();var response=booking.requestInternal(actor,request("first"),key);
        assertThat(response.status()).isEqualTo("REQUESTED");assertThat(booking.requestInternal(actor,request("first"),key)).isEqualTo(response);
        assertThatThrownBy(()->booking.requestInternal(actor,request("changed"),key)).isInstanceOf(IllegalStateException.class);
        var id=reservation(response);assertThatThrownBy(()->repository.reservation(otherCompany,id)).isInstanceOf(NoSuchElementException.class);
        assertThat(repository.reservations(otherCompany,null,start.minusSeconds(1),start.plusSeconds(86400),1,25).total()).isZero();
        assertThat(repository.metrics(company,null,start.minusSeconds(1),start.plusSeconds(86400)).attendanceRate()).isNull();
        var stranger=new AuthSessionUser(999L,company,"Stranger","user");
        assertThatThrownBy(()->booking.transition(stranger,id,new TransitionRequest("CONFIRMED","",1))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->configuration.service(stranger,null,new ServiceRequest("Forbidden","",60,0,1,true,null))).isInstanceOf(SecurityException.class);
    }
    @Test void concurrentConfirmationsDoNotDoubleBookAndCancellationReleasesTheSlot()throws Exception{
        long first=create("a"),second=create("b");
        assertThat(compete(()->confirm(actor,first),()->confirm(actor,second))).isEqualTo(1);
        var rows=repository.reservations(company,null,start.minusSeconds(1),start.plusSeconds(86400),1,25).items();
        var confirmed=rows.stream().filter(r->r.status().equals("CONFIRMED")).findFirst().orElseThrow();
        booking.transition(actor,confirmed.id(),new TransitionRequest("CANCELLED","Synthetic cancellation",confirmed.version()));
        assertThat(booking.slots(company,new SlotRequest(service,staff,start.atZone(ZoneOffset.UTC).toLocalDate())).starts()).contains(start);
        assertThat(repository.metrics(company,null,start.minusSeconds(1),start.plusSeconds(86400)).cancelled()).isEqualTo(1);
    }
    @Test void sharedConsultantCannotBeConfirmedInTwoCompanies()throws Exception{
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'superadmin','active','all')",otherCompany,user);
        var other=new AuthSessionUser(user,otherCompany,"Synthetic consultant","superadmin");
        configuration.service(other,null,new ServiceRequest("Other diagnosis","",60,0,1,true,null));
        configuration.staff(other,null,new StaffRequest(user,"Other public name","UTC",true,repository.staff(company).getFirst().days(),null));
        var otherRequest=new ReservationRequest(repository.services(otherCompany).getFirst().id(),null,repository.staff(otherCompany).getFirst().id(),start,"Synthetic","other-attendee@example.com","","",true);
        long first=create("tenant-a");var submitted=booking.requestInternal(other,otherRequest,UUID.randomUUID().toString());
        long second=db.queryForObject("SELECT id FROM scheduling_reservations WHERE company_id=? AND reference=?",Long.class,otherCompany,submitted.reference());
        assertThat(compete(()->confirm(actor,first),()->confirm(other,second))).isEqualTo(1);
    }
    @Test void currentBusyReadsDoNotUseAnOuterRepeatableReadSnapshot(){
        var tx=new TransactionTemplate(transactions);tx.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        long first=create("snapshot");
        tx.executeWithoutResult(status->{
            db.queryForObject("SELECT COUNT(*) FROM scheduling_reservations WHERE status='CONFIRMED'",Long.class);
            var separate=CompletableFuture.runAsync(()->confirm(actor,first));separate.join();
            assertThatThrownBy(()->resources.requireFree(email,start,60,null,null,null)).isInstanceOf(IllegalStateException.class);
        });
    }
    @Test void aPublicMutationCannotUseAStalePublishedPageSnapshot(){
        var page=configuration.page(actor,new PageRequest("race-"+UUID.randomUUID(),"Synthetic booking","",true,null));
        var tx=new TransactionTemplate(transactions);tx.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        tx.executeWithoutResult(status->{
            db.queryForObject("SELECT published FROM scheduling_pages WHERE company_id=?",Boolean.class,company);
            CompletableFuture.runAsync(()->configuration.page(actor,new PageRequest(page.alias(),page.title(),"",false,page.version()))).join();
            assertThatThrownBy(()->booking.requestPublic(company,page.id(),request("stale"))).isInstanceOf(KioskUnavailableException.class);
            status.setRollbackOnly();
        });
        assertThat(repository.reservations(company,null,start.minusSeconds(1),start.plusSeconds(86400),1,25).total()).isZero();
    }
    @Test void aPublicMutationCannotUseAStaleEntitlementSnapshot(){
        var page=configuration.page(actor,new PageRequest("grant-"+UUID.randomUUID(),"Synthetic booking","",true,null));
        var tx=new TransactionTemplate(transactions);tx.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        tx.executeWithoutResult(status->{
            assertThat(modules.companyCanAccess(company,"scheduling")).isTrue();
            CompletableFuture.runAsync(()->db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=?"
                +" AND module_slug='scheduling'",company)).join();
            assertThatThrownBy(()->booking.requestPublic(company,page.id(),request("revoked"))).isInstanceOf(KioskUnavailableException.class);
            status.setRollbackOnly();
        });
        assertThat(repository.reservations(company,null,start.minusSeconds(1),start.plusSeconds(86400),1,25).total()).isZero();
    }
    @Test void eventsEnforceCapacityAndDuplicatePublicRequestsNeverExposeAttendeeState()throws Exception{
        configuration.event(actor,null,new EventRequest(staff,"Synthetic webinar","",start,60,1,true,null));
        long event=repository.events(company).getFirst().id();
        var a=new ReservationRequest(null,event,staff,start,"Synthetic A","webinar-a@example.com","","",true);
        var b=new ReservationRequest(null,event,staff,start,"Synthetic B","webinar-b@example.com","","",true);
        long first=reservation(booking.requestInternal(actor,a,UUID.randomUUID().toString()));
        long second=reservation(booking.requestInternal(actor,b,UUID.randomUUID().toString()));
        assertThat(compete(()->confirm(actor,first),()->confirm(actor,second))).isEqualTo(1);
        assertThat(repository.events(company).getFirst().confirmedCount()).isEqualTo(1);
    }
    @Test void publicAdapterUsesEntitlementPublishedStateAndEngineIdempotency(){
        var page=configuration.page(actor,new PageRequest("test-"+UUID.randomUUID(),"Synthetic booking","",true,null));
        var token=protection.reveal(repository.protectedToken(company));
        var definition=registry.resolvePublic("SCHEDULING",token);
        var context=KioskExecutionContext.publicLink("SCHEDULING",token,"synthetic-network","synthetic-browser").resolved(definition,null);
        var publicData=adapter.bootstrap(context);
        assertThat(publicData.toString()).doesNotContain(email,"userId","attendeeEmail","protectedToken","version=");
        var body=Map.<String,Object>of("serviceId",service,"staffId",staff,"startAt",start.toString(),"attendeeName","Synthetic","attendeeEmail","public@example.com","contactConsent",true);
        var action=KioskActionRequest.of("scheduling.reservation.request",body);
        String key=UUID.randomUUID().toString();var response=dispatcher.dispatch(context,action,key);
        assertThat(response).containsEntry("status","REQUESTED").doesNotContainKeys("reference","attendeeEmail");
        assertThat(dispatcher.dispatch(context,action,key)).isEqualTo(response);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM scheduling_reservations WHERE company_id=?",Long.class,company)).isEqualTo(1);
        assertThat(adapter.validate(context,KioskActionRequest.of("scheduling.reservation.request",Map.of("companyId",otherCompany))).valid()).isFalse();
        configuration.page(actor,new PageRequest(page.alias(),page.title(),page.description(),false,page.version()));
        assertThatThrownBy(()->adapter.bootstrap(context)).isInstanceOf(KioskUnavailableException.class);
        assertThatThrownBy(()->registry.resolvePublic("SCHEDULING",token)).isInstanceOf(KioskUnavailableException.class);
    }
    @Test void existingConsultingOccupancyIsRespectedWithoutExposingIt(){
        db.update("""
            INSERT INTO consulting_appointments(company_id,booked_by_user_id,attendee_name,attendee_email,topic,
             preferred_start_at,timezone,duration_minutes,session_kind,status,payment_status,confirmed_start_at,consultant_email)
             VALUES(?,?,'Synthetic','synthetic@example.com','ONBOARDING',?,'UTC',60,'INCLUDED','CONFIRMED','INCLUDED',?,?)
            """,otherCompany,user,Timestamp.from(start),Timestamp.from(start),email);
        assertThat(booking.slots(company,new SlotRequest(service,staff,start.atZone(ZoneOffset.UTC).toLocalDate())).starts()).doesNotContain(start);
        assertThatThrownBy(()->booking.requestInternal(actor,request("blocked"),UUID.randomUUID().toString())).isInstanceOf(IllegalStateException.class);
    }
    @Test void eventCancellationRetainsRegistrationsAndReleasesResource(){
        configuration.event(actor,null,new EventRequest(staff,"Synthetic event","",start,60,5,true,null));
        var event=repository.events(company).getFirst();
        var request=new ReservationRequest(null,event.id(),staff,start,"Synthetic","cancel-event@example.com","","",true);
        long id=reservation(booking.requestInternal(actor,request,UUID.randomUUID().toString()));confirm(actor,id);
        configuration.cancelEvent(actor,event.id(),new TransitionRequest("CANCELLED","Synthetic cancellation",event.version()));
        assertThat(repository.event(company,event.id()).status()).isEqualTo("CANCELLED");
        assertThat(repository.reservation(company,id).status()).isEqualTo("CANCELLED");
        assertThat(repository.publicEvents(company,Instant.now())).isEmpty();
        assertThat(booking.slots(company,new SlotRequest(service,staff,start.atZone(ZoneOffset.UTC).toLocalDate())).starts()).contains(start);
        assertThat(repository.reservations(company,null,start.minusSeconds(1),start.plusSeconds(86400),1,25,"CANCELLED").total()).isEqualTo(1);
    }
    @Test void cancelledRegistrationCanBeRequestedAgainAndStaleVersionsCannotOverwrite(){
        configuration.event(actor,null,new EventRequest(staff,"Synthetic event","",start,60,5,true,null));
        var event=repository.events(company).getFirst();
        var request=new ReservationRequest(null,event.id(),staff,start,"Synthetic","retry-event@example.com","","",true);
        long first=reservation(booking.requestInternal(actor,request,UUID.randomUUID().toString()));
        booking.transition(actor,first,new TransitionRequest("CANCELLED","Synthetic cancellation",1));
        long second=reservation(booking.requestInternal(actor,request,UUID.randomUUID().toString()));
        assertThat(second).isNotEqualTo(first);
        assertThatThrownBy(()->booking.transition(actor,first,new TransitionRequest("CONFIRMED","",1))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->configuration.event(actor,event.id(),new EventRequest(staff,"Changed","",start,60,5,true,event.version())))
            .isInstanceOf(IllegalStateException.class);
    }
    @Test void anonymousPublicHttpRequestsUseThePublishedCompanyAndRejectMissingCsrf()throws Exception{
        var page=configuration.page(actor,new PageRequest("http-"+UUID.randomUUID(),"Synthetic public page","",true,null));
        mvc.perform(get("/api/v1/public/scheduling/"+page.alias())).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control",org.hamcrest.Matchers.containsString("no-store")));
        var token=protection.reveal(repository.protectedToken(company));var browser=new MockHttpSession();
        var bootstrap=mvc.perform(get("/api/v2/kiosks/public/"+token+"/bootstrap").session(browser))
            .andExpect(status().isOk()).andReturn();
        String csrf=mapper.readTree(bootstrap.getResponse().getContentAsString()).path("data").path("csrfToken").asText();
        String path="/api/v2/kiosks/public/"+token+"/actions/scheduling.reservation.request@1";
        String body=mapper.writeValueAsString(request("http"));
        mvc.perform(post(path).session(browser).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        assertThat(repository.reservations(company,null,start.minusSeconds(1),start.plusSeconds(86400),1,25).total()).isZero();
        mvc.perform(post(path).session(browser).header("X-CSRF-Token",csrf).header("Idempotency-Key",UUID.randomUUID())
            .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("REQUESTED")).andExpect(jsonPath("$.data.reference").doesNotExist());
        configuration.page(actor,new PageRequest(page.alias(),page.title(),page.description(),false,page.version()));
        mvc.perform(get("/api/v1/public/scheduling/"+page.alias())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/scheduling/services")).andExpect(status().isUnauthorized());
    }
    private int compete(Callable<?> first,Callable<?> second)throws Exception{
        var latch=new CountDownLatch(1);try(var executor=Executors.newFixedThreadPool(2)){
            Callable<Boolean> one=()->{latch.await();try{first.call();return true;}catch(IllegalStateException|org.springframework.dao.TransientDataAccessException conflict){return false;}};
            Callable<Boolean> two=()->{latch.await();try{second.call();return true;}catch(IllegalStateException|org.springframework.dao.TransientDataAccessException conflict){return false;}};
            var a=executor.submit(one);var b=executor.submit(two);latch.countDown();return(a.get(30,TimeUnit.SECONDS)?1:0)+(b.get(30,TimeUnit.SECONDS)?1:0);
        }
    }
}
