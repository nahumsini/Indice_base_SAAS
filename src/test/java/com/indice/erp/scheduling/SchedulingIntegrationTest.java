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

@SpringBootTest(properties={"kiosk.engine.adapter.scheduling.enabled=true","app.email.enabled=false","app.scheduling.reminder-initial-delay-ms=86400000","app.meetings.reminder-initial-delay-ms=86400000"})
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
    @Autowired SchedulingNotificationService notifications;
    @Autowired com.indice.erp.meetings.MeetingService meetings;
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
            db.update("DELETE FROM user_permission_requests WHERE company_id=?",tenant);
            db.update("DELETE FROM scheduling_notification_receipts WHERE company_id=?",tenant);
            for(String table:List.of("meeting_create_replays","meeting_audit","meeting_participants","meeting_records","scheduling_client_capture_replays","scheduling_service_availability","scheduling_capture_replays","scheduling_audit","scheduling_reservations","scheduling_events","scheduling_pages","scheduling_unavailable_dates","scheduling_staff_services","scheduling_availability","scheduling_staff","scheduling_services","consulting_appointments","sales_contacts","sales_products"))
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
    @Test void multipleAgendasKeepTheirIdentityPublicContextAndLifecycleIndependent()throws Exception{
        var first=configuration.page(actor,new PageRequest("primary-"+UUID.randomUUID(),"First agenda","First description",true,null));
        var design=new PageAppearance("Second brand","#047857","#ECFDF5","Book second","showcase");
        var create=new PageRequest("second-"+UUID.randomUUID(),"Second agenda","Second description",true,null,design);
        var second=configuration.createPage(actor,create);
        assertThat(second.id()).isNotEqualTo(first.id());
        assertThat(configuration.createPage(actor,create)).isEqualTo(second);
        assertThat(repository.pages(company)).extracting(PageItem::id).containsExactly(first.id(),second.id());
        assertThat(repository.pages(otherCompany)).isEmpty();
        assertThat(repository.page(company).orElseThrow()).isEqualTo(first);
        var firstToken=protection.reveal(repository.protectedToken(company,first.id()));
        var secondToken=protection.reveal(repository.protectedToken(company,second.id()));
        assertThat(secondToken).isNotEqualTo(firstToken);
        var secondDefinition=registry.resolvePublic("SCHEDULING",secondToken);
        var context=KioskExecutionContext.publicLink("SCHEDULING",secondToken,"synthetic-client","synthetic-request").resolved(secondDefinition,null);
        var catalog=adapter.bootstrap(context);
        assertThat(catalog.get("title")).isEqualTo("Second agenda");
        assertThat(mapper.convertValue(catalog.get("appearance"),PageAppearance.class)).isEqualTo(design);
        configuration.updatePage(actor,first.id(),new PageRequest(first.alias(),first.title(),first.description(),false,first.version()));
        mvc.perform(get("/api/v1/public/scheduling/"+first.alias())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/public/scheduling/"+second.alias())).andExpect(status().isOk());
        assertThat(booking.requestPublic(company,second.id(),request("second-page")).status()).isEqualTo("REQUESTED");
        assertThatThrownBy(()->booking.requestPublic(company,first.id(),request("hidden-first"))).isInstanceOf(KioskUnavailableException.class);
        assertThatThrownBy(()->booking.requestPublic(otherCompany,second.id(),request("foreign-page"))).isInstanceOf(KioskUnavailableException.class);
        var edited=configuration.updatePage(actor,second.id(),new PageRequest(second.alias(),"Edited second","",true,second.version()));
        assertThat(edited.appearance()).isEqualTo(design);
        assertThatThrownBy(()->configuration.updatePage(actor,second.id(),new PageRequest(second.alias(),"Stale edit","",true,second.version()))).isInstanceOf(IllegalStateException.class);
        assertThat(repository.page(company).orElseThrow().title()).isEqualTo(first.title());
        assertThat(repository.page(company,second.id()).orElseThrow().title()).isEqualTo("Edited second");
    }
    @Test void agendaCollectionRequiresScopeCsrfOwnershipAndUniqueAlias()throws Exception{
        var body=new PageRequest("collection-"+UUID.randomUUID(),"Collection agenda","",false,null);
        mvc.perform(get("/api/v1/scheduling/pages")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/scheduling/pages").session(session()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body))).andExpect(status().isForbidden());
        var response=mvc.perform(post("/api/v1/scheduling/pages").session(session()).header("X-CSRF-Token","synthetic-workspace-csrf").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body))).andExpect(status().isOk()).andReturn();
        var page=mapper.readValue(response.getResponse().getContentAsString(),PageItem.class);
        mvc.perform(get("/api/v1/scheduling/pages").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(page.id()));
        var otherActor=new AuthSessionUser(user,otherCompany,"Synthetic consultant","superadmin");
        assertThatThrownBy(()->configuration.updatePage(otherActor,page.id(),new PageRequest(page.alias(),"Cross tenant","",false,page.version()))).isInstanceOfAny(SecurityException.class,NoSuchElementException.class);
        assertThatThrownBy(()->configuration.createPage(new AuthSessionUser(user,company,"Synthetic operator","user"),body)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->configuration.createPage(actor,new PageRequest(page.alias(),"Different payload","",false,null))).isInstanceOf(IllegalStateException.class);
        mvc.perform(put("/api/v1/scheduling/pages/"+page.id()).session(session()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new PageRequest(page.alias(),"Edit","",false,page.version())))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/scheduling/pages/999999999").session(session()).header("X-CSRF-Token","synthetic-workspace-csrf").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new PageRequest(page.alias(),"Edit","",false,page.version())))).andExpect(status().isNotFound());
        assertThat(repository.pages(company)).hasSize(1);
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
        var appearance=new PageAppearance("Synthetic company","#008577","#FFF4D4","Solicitar sesión","showcase");
        var page=configuration.page(actor,new PageRequest("appearance-"+UUID.randomUUID(),"Synthetic page","",true,null,appearance));
        var token=protection.reveal(repository.protectedToken(company));
        var context=KioskExecutionContext.publicLink("SCHEDULING",token,"synthetic-network","synthetic-browser").resolved(registry.resolvePublic("SCHEDULING",token),null);
        assertThat(adapter.bootstrap(context).toString()).contains("Synthetic company","#008577","showcase").doesNotContain(email,"attendeeEmail");
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
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'scheduling','active','test')",otherCompany);
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
        assertThatThrownBy(()->configuration.event(actor,event.id(),new EventRequest(staff,"Changed","",start.plusSeconds(3600),60,5,true,event.version())))
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
    @Test void internalCatalogExposesPublishedEventsAndPrivateContactDetails()throws Exception{
        configuration.event(actor,null,new EventRequest(staff,"Workshop","",start,60,5,true,null,"Room A"));
        var event=repository.events(company).getFirst();
        var body=new ReservationRequest(null,event.id(),staff,start,"Synthetic guest","guest@example.com","Synthetic","555-0100",true);
        long id=reservation(booking.requestInternal(actor,body,UUID.randomUUID().toString()));
        mvc.perform(get("/api/v1/scheduling/catalog").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.events[0].id").value(event.id()));
        mvc.perform(get("/api/v1/scheduling/reservations/"+id).session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.attendeePhone").value("555-0100"));
        mvc.perform(get("/api/v1/scheduling/events/"+event.id()+"/participants").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        assertThat(repository.event(company,event.id()).activeParticipantCount()).isEqualTo(1);
        configuration.event(actor,event.id(),new EventRequest(staff,"Updated workshop","",start,60,6,true,event.version(),"Room B"));
        assertThat(repository.event(company,event.id()).location()).isEqualTo("Room B");
        assertThatThrownBy(()->configuration.event(actor,event.id(),new EventRequest(staff,"Updated workshop","",start.plusSeconds(3600),60,6,true,event.version()+1,"Room B"))).isInstanceOf(IllegalStateException.class);
    }
    @Test void reschedulingRechecksOccupancyAndRetainsVersionAndHistory(){
        long id=create("move");var original=confirm(actor,id);
        var moved=management.reschedule(actor,id,new RescheduleRequest(start.plusSeconds(7200),"Requested by attendee",original.version()));
        assertThat(moved.status()).isEqualTo("CONFIRMED");assertThat(moved.durationMinutes()).isEqualTo(original.durationMinutes());
        assertThat(repository.history(company,id).getFirst().previousStartAt()).isEqualTo(start);
        assertThat(repository.history(company,id).getFirst().nextStartAt()).isEqualTo(moved.startAt());
        confirm(actor,create("replacement"));
        assertThatThrownBy(()->management.reschedule(actor,id,new RescheduleRequest(start,"Occupied time",moved.version()))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->management.reschedule(actor,id,new RescheduleRequest(start.plusSeconds(10800),"Stale update",original.version()))).isInstanceOf(IllegalStateException.class);
        assertThat(repository.reservation(company,id).startAt()).isEqualTo(moved.startAt());
    }
    @Test void splitHoursUnavailableDatesAndServicesControlAvailability(){
        var date=start.atZone(ZoneOffset.UTC).toLocalDate();int day=date.getDayOfWeek().getValue();
        var windows=List.of(new AvailabilityDay(day,LocalTime.of(9,0),LocalTime.NOON),new AvailabilityDay(day,LocalTime.of(14,0),LocalTime.of(17,0)));
        var old=repository.staff(company).getFirst();
        configuration.staff(actor,staff,new StaffRequest(user,old.publicName(),"UTC",true,windows,old.version(),List.of(),List.of(service)));
        var slots=booking.slots(company,new SlotRequest(service,staff,date));
        assertThat(slots.starts()).contains(date.atTime(10,0).toInstant(ZoneOffset.UTC),date.atTime(14,0).toInstant(ZoneOffset.UTC)).doesNotContain(date.atTime(12,0).toInstant(ZoneOffset.UTC));
        configuration.staff(actor,staff,new StaffRequest(user,old.publicName(),"UTC",true,windows,old.version()+1,List.of(date),List.of(service)));
        assertThat(booking.slots(company,new SlotRequest(service,staff,date)).starts()).isEmpty();
        var overlapping=List.of(windows.getFirst(),new AvailabilityDay(day,LocalTime.of(11,0),LocalTime.of(14,0)));
        assertThatThrownBy(()->configuration.staff(actor,staff,new StaffRequest(user,old.publicName(),"UTC",true,overlapping,old.version()+2,List.of(),List.of(service)))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void meetingsAndAppointmentsEnforceTheSameResourceOccupation(){
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'control_minutas','active','test')",company);
        long id=create("shared");
        var body=new com.indice.erp.meetings.MeetingDtos.MeetingRequest("Synthetic meeting","WORKING",start,start.plusSeconds(3600),"UTC",user,List.of(),"","",null);
        var meeting=meetings.create(actor,body,UUID.randomUUID().toString());
        assertThatThrownBy(()->confirm(actor,id)).isInstanceOf(IllegalStateException.class);
        meetings.transition(actor,meeting.meeting().id(),new com.indice.erp.meetings.MeetingDtos.TransitionRequest("CANCELLED","Released time",1));
        confirm(actor,id);
        assertThatThrownBy(()->meetings.create(actor,body,UUID.randomUUID().toString())).hasMessage("meeting_appointment_conflict");
    }
    @Test void approvedHrLeaveBlocksSlotsAndConfirmationWithoutExposingReasons(){
        long id=create("leave");var date=start.atZone(ZoneOffset.UTC).toLocalDate();
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'human_resources','active','test')",company);
        long membership=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,user);
        db.update("INSERT INTO user_permission_requests(company_id,request_number,user_company_id,user_id,user_name_snapshot,permission_type,start_date,end_date,requested_days,is_half_day,status,reason,created_by_user_id,updated_by_user_id) VALUES(?,?,?,?,?,'vacation',?,?,1,0,'approved','Synthetic approved leave',?,?)",
            company,"PER-"+UUID.randomUUID().toString().substring(0,12),membership,user,"Synthetic",java.sql.Date.valueOf(date),java.sql.Date.valueOf(date),user,user);
        assertThat(booking.slots(company,new SlotRequest(service,staff,date)).starts()).isEmpty();
        assertThatThrownBy(()->confirm(actor,id)).isInstanceOf(IllegalStateException.class).hasMessage("The member is unavailable.");
        db.update("UPDATE user_permission_requests SET status='rejected' WHERE company_id=?",company);
        assertThat(booking.slots(company,new SlotRequest(service,staff,date)).starts()).contains(start);
    }
    @Test void privateClientLinksRequireSalesAccessAndTenantOwnershipWhilePublicRequestsRejectThem(){
        long client=repository.insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,contact_person,email,phone,status) VALUES(?,'COORD-TEST','Synthetic master','Synthetic contact','master@example.com','','ACTIVE')",company);
        var base=request("client");var linked=new ReservationRequest(base.serviceId(),null,staff,start,base.attendeeName(),base.attendeeEmail(),base.attendeeCompany(),base.attendeePhone(),true,client);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')",company);
        long id=reservation(booking.requestInternal(actor,linked,UUID.randomUUID().toString()));assertThat(repository.reservation(company,id).clientId()).isEqualTo(client);
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='crm'",company);
        assertThatThrownBy(()->booking.requestInternal(actor,linked,UUID.randomUUID().toString())).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->booking.requestPublic(company,1,linked)).isInstanceOf(IllegalArgumentException.class);
        db.update("UPDATE company_module_entitlements SET status='active' WHERE company_id=? AND module_slug='crm'",company);
        long foreign=repository.insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,contact_person,email,phone,status) VALUES(?,'FOREIGN','Other master','Other contact','foreign@example.com','','ACTIVE')",otherCompany);
        assertThatThrownBy(()->booking.requestInternal(actor,new ReservationRequest(base.serviceId(),null,staff,start,base.attendeeName(),base.attendeeEmail(),"","",true,foreign),UUID.randomUUID().toString())).isInstanceOf(NoSuchElementException.class);
    }
    @Test void revocationBlocksReschedulingAndConfigurationWithinTheMutation(){
        long id=create("revoked");
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='scheduling'",company);
        assertThatThrownBy(()->management.reschedule(actor,id,new RescheduleRequest(start.plusSeconds(3600),"Revoked request",1))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->configuration.service(actor,null,new ServiceRequest("Blocked","",60,0,0,true,null))).isInstanceOf(SecurityException.class);
    }
    @Test void staffNotificationsAreDurablePrivateAndDoNotReopenDismissedMessages(){
        long id=create("notification");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM scheduling_notification_receipts WHERE company_id=? AND reservation_id=? AND signal_type='booking_requested'",Integer.class,company,id)).isEqualTo(1);
        db.update("UPDATE app_notifications SET dismissed_at=UTC_TIMESTAMP(6) WHERE company_id=? AND source_module='scheduling'",company);
        notifications.dispatch(company,id,true);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND source_module='scheduling' AND dismissed_at IS NOT NULL",Integer.class,company)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT description FROM app_notifications WHERE company_id=? AND source_module='scheduling' LIMIT 1",String.class,company)).isEmpty();
        db.update("UPDATE scheduling_reservations SET start_at=TIMESTAMPADD(HOUR,1,UTC_TIMESTAMP(6)),status='CONFIRMED' WHERE company_id=? AND id=?",company,id);
        notifications.dispatch(company,id,false);notifications.dispatch(company,id,false);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM scheduling_notification_receipts WHERE company_id=? AND reservation_id=? AND signal_type='booking_upcoming'",Integer.class,company,id)).isEqualTo(1);
    }
    private int compete(Callable<?> first,Callable<?> second)throws Exception{
        var latch=new CountDownLatch(1);try(var executor=Executors.newFixedThreadPool(2)){
            Callable<Boolean> one=()->{latch.await();try{first.call();return true;}catch(IllegalStateException|org.springframework.dao.TransientDataAccessException conflict){return false;}};
            Callable<Boolean> two=()->{latch.await();try{second.call();return true;}catch(IllegalStateException|org.springframework.dao.TransientDataAccessException conflict){return false;}};
            var a=executor.submit(one);var b=executor.submit(two);latch.countDown();return(a.get(30,TimeUnit.SECONDS)?1:0)+(b.get(30,TimeUnit.SECONDS)?1:0);
        }
    }
    @Autowired com.indice.erp.sales.SchedulingServiceCatalog inventoryCatalog;
    @Autowired com.indice.erp.hr.users.HrSchedulingDirectoryService employees;
    @Autowired SchedulingClientCaptureService clientCapture;
    @Test void independentServiceCanLinkInventoryWithoutChangingPastReservationTerms()throws Exception{
        var original=repository.services(company).getFirst();
        configuration.service(actor,service,new ServiceRequest("Demo session","Presentation",45,0,0,true,original.version(),null,List.of(),ChargePolicy.NO_CHARGE));
        long first=create("free-demo");
        assertThat(repository.reservation(company,first).chargePolicy()).isEqualTo(ChargePolicy.NO_CHARGE);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_products WHERE company_id=?",Long.class,company)).isZero();
        var free=repository.services(company).getFirst();
        // An older caller omitting the new property preserves an explicit offer.
        configuration.service(actor,service,new ServiceRequest(free.name(),free.description(),45,0,0,true,free.version()));
        assertThat(repository.services(company).getFirst().chargePolicy()).isEqualTo(ChargePolicy.NO_CHARGE);
        long product=repository.insert("INSERT INTO sales_products(company_id,product_code,name,type,status) VALUES(?,'SRV-DEMO','Commercial consultation','SERVICE','ACTIVE')",company);
        var saved=repository.services(company).getFirst();
        configuration.service(actor,service,new ServiceRequest(saved.name(),saved.description(),45,0,0,true,saved.version(),product,List.of(),ChargePolicy.TO_BE_AGREED));
        assertThat(repository.services(company).getFirst().id()).isEqualTo(service);
        assertThat(repository.services(company).getFirst().productId()).isEqualTo(product);
        assertThat(repository.reservation(company,first).serviceId()).isEqualTo(service);
        assertThat(repository.reservation(company,first).chargePolicy()).isEqualTo(ChargePolicy.NO_CHARGE);
        assertThat(repository.reservation(company,create("quoted-demo")).chargePolicy()).isEqualTo(ChargePolicy.TO_BE_AGREED);
        mvc.perform(get("/api/v1/scheduling/catalog").session(session())).andExpect(status().isOk())
            .andExpect(jsonPath("$.services[0].chargePolicy").value("TO_BE_AGREED"));
        assertThat(repository.services(otherCompany)).isEmpty();
        assertThatThrownBy(()->repository.reservation(otherCompany,first)).isInstanceOf(NoSuchElementException.class);
    }
    @Test void independentServiceHttpContractDefaultsSafelyAndRequiresAuthCsrfAndValidCondition()throws Exception{
        String body="""
            {"name":"Introductory demo","description":"No catalogue required","durationMinutes":30,
             "bufferMinutes":0,"noticeHours":0,"active":true,"chargePolicy":"NO_CHARGE","days":[]}
            """;
        mvc.perform(post("/api/v1/scheduling/services").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/scheduling/services").session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/scheduling/services").session(session()).header("X-CSRF-Token","synthetic-workspace-csrf")
            .contentType(MediaType.APPLICATION_JSON).content(body.replace("NO_CHARGE","INVALID"))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/scheduling/services").session(session()).header("X-CSRF-Token","synthetic-workspace-csrf")
            .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        var independent=repository.services(company).stream().filter(s->s.name().equals("Introductory demo")).findFirst().orElseThrow();
        assertThat(independent.productId()).isNull();assertThat(independent.chargePolicy()).isEqualTo(ChargePolicy.NO_CHARGE);
        assertThat(repository.services(company).stream().filter(s->s.id()==service).findFirst().orElseThrow().chargePolicy()).isEqualTo(ChargePolicy.TO_BE_AGREED);
        var page=configuration.page(actor,new PageRequest("terms-"+UUID.randomUUID(),"Appointments","",true,null));
        String token=protection.reveal(repository.protectedToken(company));
        mvc.perform(get("/api/v2/kiosks/public/"+token+"/bootstrap").session(new MockHttpSession())).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.services[?(@.id == "+independent.id()+")].chargePolicy").value(org.hamcrest.Matchers.contains("NO_CHARGE")));
    }
    @Test void inventoryServicesAreTenantScopedTypedAndLinkedWithHours(){
        long product=repository.insert("INSERT INTO sales_products(company_id,product_code,name,type,status) VALUES(?,'SRV-T','Therapy','SERVICE','ACTIVE')",company);
        repository.insert("INSERT INTO sales_products(company_id,product_code,name,type,status) VALUES(?,'PRD-T','Physical item','PRODUCT','ACTIVE')",company);
        long foreign=repository.insert("INSERT INTO sales_products(company_id,product_code,name,type,status) VALUES(?,'SRV-T','Other tenant','SERVICE','ACTIVE')",otherCompany);
        assertThat(inventoryCatalog.read(company,"",1).items()).extracting(com.indice.erp.sales.SchedulingServiceCatalog.Item::id).containsExactly(product);
        var date=start.atZone(ZoneOffset.UTC).toLocalDate();
        var hours=List.of(new AvailabilityDay(date.getDayOfWeek().getValue(),LocalTime.of(12,0),LocalTime.of(15,0)));
        configuration.service(actor,null,new ServiceRequest("Therapy","",60,15,0,true,null,product,hours));
        var configured=repository.services(company).stream().filter(v->Objects.equals(v.productId(),product)).findFirst().orElseThrow();
        assertThat(configured.days()).containsExactlyElementsOf(hours);
        assertThat(booking.slots(company,new SlotRequest(configured.id(),staff,date)).starts()).doesNotContain(start).contains(date.atTime(12,0).toInstant(ZoneOffset.UTC));
        assertThatThrownBy(()->configuration.service(actor,null,new ServiceRequest("Foreign","",60,0,0,true,null,foreign,List.of()))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->configuration.service(actor,null,new ServiceRequest("Again","",60,0,0,true,null,product,List.of()))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        db.update("UPDATE sales_products SET status='INACTIVE' WHERE company_id=? AND id=?",company,product);
        assertThatThrownBy(()->booking.service(company,configured.id())).isInstanceOf(NoSuchElementException.class);
    }
    @Test void employeeDirectoryUsesRealActiveHrProfilesAndRejectsInactiveBookings(){
        assertThat(employees.active(company)).isEmpty();
        long membership=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,user);
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,status) VALUES(?,?,?,'active')",company,membership,user);
        assertThat(employees.active(company)).extracting(com.indice.erp.hr.users.HrSchedulingDirectoryService.Employee::id).contains(user);
        db.update("UPDATE user_work_profiles SET status='inactive' WHERE company_id=? AND user_company_id=?",company,membership);
        assertThat(employees.active(company)).isEmpty();assertThat(repository.activeStaff(company)).isEmpty();
        assertThatThrownBy(()->booking.staff(company,staff)).isInstanceOf(NoSuchElementException.class);
    }
    @Test void staffBreakIsSnapshottedAndPreventsBackToBackConfirmation(){
        var row=repository.staff(company).getFirst();
        configuration.staff(actor,staff,new StaffRequest(user,row.publicName(),row.timezone(),true,row.days(),row.version(),List.of(),List.of(),30));
        var id=create("break");confirm(actor,id);
        assertThat(db.queryForObject("SELECT buffer_minutes FROM scheduling_reservations WHERE company_id=? AND id=?",Integer.class,company,id)).isEqualTo(30);
        var slots=booking.slots(company,new SlotRequest(service,staff,start.atZone(ZoneOffset.UTC).toLocalDate()));
        assertThat(slots.starts()).doesNotContain(start.plusSeconds(75*60L)).contains(start.plusSeconds(90*60L));
    }
    @Test void serviceHoursRejectOverlapWithoutPartialWrite(){
        var date=start.atZone(ZoneOffset.UTC).toLocalDate();var day=date.getDayOfWeek().getValue();
        var overlap=List.of(new AvailabilityDay(day,LocalTime.of(9,0),LocalTime.of(12,0)),new AvailabilityDay(day,LocalTime.of(11,0),LocalTime.of(14,0)));
        var old=repository.services(company).getFirst();
        assertThatThrownBy(()->configuration.service(actor,service,new ServiceRequest("Changed","",60,15,0,true,old.version(),null,overlap))).isInstanceOf(IllegalArgumentException.class);
        assertThat(repository.services(company).getFirst().name()).isEqualTo(old.name());
    }
    @Test void privateClientCaptureRequiresCrmAndIsIdempotent()throws Exception{
        var body=new SchedulingClientCaptureService.Request("Synthetic client","new-client@example.com","5551234","Synthetic business",true);String key=UUID.randomUUID().toString();
        assertThatThrownBy(()->clientCapture.create(actor,body,key)).isInstanceOf(SecurityException.class);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')",company);
        var created=clientCapture.create(actor,body,key);assertThat(clientCapture.create(actor,body,key).id()).isEqualTo(created.id());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_contacts WHERE company_id=?",Long.class,company)).isEqualTo(1);
        assertThatThrownBy(()->clientCapture.create(actor,new SchedulingClientCaptureService.Request("Different","different@example.com","","",true),key)).isInstanceOf(IllegalStateException.class);
        mvc.perform(post("/api/v1/scheduling/booking-clients").session(session()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body))).andExpect(status().isForbidden());
    }
    @Test void publicPageReadinessHasDefaultsAndPublicationCannotPretendMissingSetup()throws Exception{
        mvc.perform(get("/api/v1/scheduling/readiness").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.companyName").isNotEmpty()).andExpect(jsonPath("$.suggestedAlias").isNotEmpty()).andExpect(jsonPath("$.bookingReady").value(true));
        db.update("UPDATE scheduling_services SET active=0 WHERE company_id=?",company);
        assertThatThrownBy(()->configuration.page(actor,new PageRequest("test-"+UUID.randomUUID(),"Appointments","",true,null))).isInstanceOf(IllegalArgumentException.class);
        assertThatCode(()->configuration.page(actor,new PageRequest("test-"+UUID.randomUUID(),"Appointments","",false,null))).doesNotThrowAnyException();
    }

}
