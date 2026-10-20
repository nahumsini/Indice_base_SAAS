package com.indice.erp.sales.funneling;

import com.indice.erp.auth.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.funneling.ContentCalendarContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.email.enabled=false", "app.mail-accounts.worker-enabled=false", "app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
@Transactional
class ContentCalendarIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired ContentCalendarService service;
    @Autowired FunnelService funnels;
    String funnel;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    long company, other, user, membership;
    AuthSessionUser actor;

    long insert(String sql, Object... args) {
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement(sql, java.sql.Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) statement.setObject(i + 1, args[i]);
            return statement;
        }, key);
        return key.getKey().longValue();
    }
    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        company = insert("INSERT INTO companies(name) VALUES(?)", "Funnel " + UUID.randomUUID());
        other = insert("INSERT INTO companies(name) VALUES(?)", "Other " + UUID.randomUUID());
        user = insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-only','Funnel test')", "funnel-" + UUID.randomUUID() + "@example.com");
        membership = insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'user','active')", user, company);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')", company);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'crm','user')", membership);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','funneling')", membership);
        actor = new AuthSessionUser(user, company, "Funnel test", "user");
        funnel = UUID.randomUUID().toString();
        funnels.save(actor, funnel, new FunnelContracts.PlanInput("Calendar test", "Appointments", "Service clients", "SOCIAL", "",
            List.of(new FunnelContracts.Stage("Discover", "", "", null), new FunnelContracts.Stage("Contact", "", "", null)), "DRAFT", 0));
    }
    MockHttpSession session() {
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, user);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, company);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, "Synthetic");
        session.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF, "synthetic-csrf");
        return session;
    }
    String key() { return ContentCalendarRepository.actorKey(actor); }
    Entry entry(String date, String time, String format, String channel, String status) {
        return new Entry(UUID.randomUUID().toString(),"Explain a service",format,channel,status,date,time,"ATTRACT","Brief","Book a call","","https://example.com/material");
    }
    Entry sample() { return entry("2026-10-19","10:00","REEL","INSTAGRAM","PLANNED"); }
    Document doc(Entry... entries) { return new Document("America/Toronto",null,List.of(entries)); }
    Input input(Document doc, long version) { return new Input(version,UUID.randomUUID().toString(),doc); }
    @Test void readDoesNotWriteAndCalendarSaveDoesNotChangeCampaign() {
        assertThat(service.get(actor,funnel).version()).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_content_calendars WHERE company_id=?",Long.class,company)).isZero();
        var before = funnels.get(actor,funnel);
        var document = doc(sample());
        var saved = service.save(actor,funnel,key(),input(document,0));
        assertThat(saved.version()).isEqualTo(1);
        assertThat(service.get(actor,funnel).content()).isEqualTo(document);
        assertThat(funnels.get(actor,funnel)).isEqualTo(before);
        assertThat(db.queryForObject("SELECT entry_count FROM sales_content_calendar_audit WHERE company_id=?",Integer.class,company)).isEqualTo(1);
    }
    @Test void retryAfterLostResponseIsIdempotentButStaleOrChangedRequestsConflict() {
        var request = input(doc(sample()),0);
        var first = service.save(actor,funnel,key(),request);
        assertThat(service.save(actor,funnel,key(),request)).isEqualTo(first);
        assertThatThrownBy(() -> service.save(actor,funnel,key(),input(doc(sample()),0))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.save(actor,funnel,key(),new Input(0,request.mutationId(),doc(sample())))).isInstanceOf(ResponseStatusException.class);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_content_calendar_audit WHERE company_id=?",Long.class,company)).isEqualTo(1);
    }
    @Test void tenantAndActorBoundaryProtectsSavedCalendar() {
        service.save(actor,funnel,key(),input(doc(sample()),0));
        var foreign = new AuthSessionUser(user,other,"Other","user");
        assertThatThrownBy(() -> service.get(foreign,funnel)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.save(foreign,funnel,ContentCalendarRepository.actorKey(foreign),input(doc(),1))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.save(actor,funnel,other+":"+user,input(doc(),1))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor,funnel).version()).isEqualTo(1);
    }
    @Test void historyIsRetainedAndCancellationIsReversible() {
        var original = sample();
        service.save(actor,funnel,key(),input(doc(original),0));
        assertThatThrownBy(() -> service.save(actor,funnel,key(),input(doc(),1))).isInstanceOf(ResponseStatusException.class);
        var cancelled = new Entry(original.id(),original.title(),original.format(),original.channel(),"CANCELLED",original.date(),original.time(),original.purpose(),original.brief(),original.callToAction(),original.owner(),original.reference());
        assertThat(service.save(actor,funnel,key(),input(doc(cancelled),1)).content().entries().getFirst().status()).isEqualTo("CANCELLED");
        assertThat(service.save(actor,funnel,key(),input(doc(original),2)).version()).isEqualTo(3);
    }
    @Test void rejectsImpossibleDatesDstGapsInvalidFormatsDuplicateIdsAndOversize() {
        var duplicate = sample();
        var invalid = List.of(
            doc(entry("2026-02-30","10:00","REEL","INSTAGRAM","PLANNED")),
            doc(entry("2026-03-08","02:30","REEL","INSTAGRAM","PLANNED")),
            doc(entry(null,null,"REEL","INSTAGRAM","READY")),
            doc(entry("2026-10-19","25:00","REEL","INSTAGRAM","PLANNED")),
            doc(entry("2026-10-19","10:00","REEL","GOOGLE_SEARCH","PLANNED")),
            doc(duplicate,duplicate),
            new Document("Invalid/Zone",null,List.of(sample())),
            new Document("UTC",null,java.util.stream.IntStream.range(0,201).mapToObj(i -> sample()).toList())
        );
        for (var document:invalid) assertThatThrownBy(() -> service.save(actor,funnel,key(),input(document,0))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor,funnel).version()).isZero();
    }
    @Test void acceptsLeapDatesUndatedIdeasAndCompatibleSuggestedPlan() {
        var settings = new Settings("2028-02-29",2,List.of(1,3,5),"10:00","APPOINTMENTS","Consultation",List.of("INSTAGRAM","GOOGLE_SEARCH"),List.of("REEL","SEARCH_AD"));
        var document = new Document("America/Toronto",settings,List.of(
            entry("2028-02-29","10:00","SEARCH_AD","GOOGLE_SEARCH","READY"),
            entry(null,null,"STORY","FACEBOOK","IDEA")));
        assertThat(service.save(actor,funnel,key(),input(document,0)).content()).isEqualTo(document);
    }
    @Test void controllerEnforcesAuthCsrfModuleTabAndActorHeader() throws Exception {
        String url = "/api/v1/sales/funnels/"+funnel+"/content-calendar";
        String body = mapper.writeValueAsString(input(doc(sample()),0));
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        mvc.perform(put(url).session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put(url).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
        mvc.perform(put(url).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Content-Calendar-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get(url).session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.content.entries[0].title").value("Explain a service"));
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=?",membership);
        mvc.perform(get(url).session(session())).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','funneling')",membership);
        db.update("DELETE FROM user_company_module_roles WHERE user_company_id=?",membership);
        mvc.perform(get(url).session(session())).andExpect(status().isForbidden());
    }
}
