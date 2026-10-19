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
import static com.indice.erp.sales.funneling.FunnelContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.email.enabled=false", "app.mail-accounts.worker-enabled=false", "app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
@Transactional
class FunnelIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired FunnelService service;
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
    }
    MockHttpSession session() {
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, user);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, company);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, "Synthetic");
        session.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF, "synthetic-csrf");
        return session;
    }
    PlanInput input(long version, String status, Integer first, Integer last) {
        return new PlanInput("Synthetic plan", "Schedule consultations", "Synthetic audience", "EMAIL", "Hypothesis only",
            List.of(new Stage("Attract", "Invite", "People reached", first == null ? null : java.math.BigDecimal.valueOf(first)),
                new Stage("Convert", "Follow up", "Appointments", last == null ? null : java.math.BigDecimal.valueOf(last))), status, version);
    }

    @Test void persistsOrderedStagesAndComputesEstimatedConversion() {
        var plan = service.save(actor, UUID.randomUUID().toString(), input(0, "PLANNED", 300, 10));
        assertThat(service.get(actor, plan.id()).stages()).extracting(Stage::name).containsExactly("Attract", "Convert");
        assertThat(plan.estimatedConversion()).isEqualByComparingTo("3.33");
        assertThat(plan.version()).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_funnel_audit WHERE company_id=?", Long.class, company)).isEqualTo(1);
    }
    @Test void uncertainRetriesAndStaleUpdatesNeverDuplicateOrOverwritePlans() {
        String id = UUID.randomUUID().toString();
        service.save(actor, id, input(0, "DRAFT", 100, 10));
        assertThatThrownBy(() -> service.save(actor, id, input(0, "DRAFT", 100, 20))).isInstanceOf(ResponseStatusException.class);
        var changed = service.save(actor, id, input(1, "PLANNED", 100, 25));
        assertThat(changed.version()).isEqualTo(2);
        assertThatThrownBy(() -> service.save(actor, id, input(1, "ARCHIVED", 100, 0))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor, id).status()).isEqualTo("PLANNED");
        assertThat(service.list(actor, "", "ALL", 1, 25, "name", "asc").total()).isEqualTo(1);
    }
    @Test void archiveAndRestoreKeepThePlanAndAudit() {
        String id = UUID.randomUUID().toString();
        service.save(actor, id, input(0, "DRAFT", null, null));
        service.save(actor, id, input(1, "ARCHIVED", null, null));
        assertThat(service.list(actor, "", "DRAFT", 1, 25, "updatedAt", "desc").total()).isZero();
        assertThat(service.list(actor, "Synthetic", "ARCHIVED", 1, 25, "updatedAt", "desc").total()).isEqualTo(1);
        assertThat(service.save(actor, id, input(2, "DRAFT", null, null)).version()).isEqualTo(3);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_funnel_audit WHERE company_id=?", Long.class, company)).isEqualTo(3);
    }
    @Test void unknownTargetsAndZeroEntryNeverPretendToBeMeasuredConversion() {
        assertThat(FunnelService.conversion(input(0, "DRAFT", 100, null).stages())).isNull();
        assertThat(FunnelService.conversion(input(0, "DRAFT", 0, 0).stages())).isNull();
        assertThat(FunnelService.conversion(input(0, "DRAFT", 100, 0).stages())).isEqualByComparingTo("0");
    }
    @Test void savedDiagramProjectsEachAdjacentStageAndReturnsTheSameEstimatesInListAndDetail() throws Exception {
        var source = input(0, "PLANNED", 500, 20);
        var stages = List.of(new Stage("Attract", "Invite", "Reached", new java.math.BigDecimal("500")),
            new Stage("Interest", "Explain", "Interested", new java.math.BigDecimal("125")),
            new Stage("Decision", "Offer", "Considering", new java.math.BigDecimal("40")),
            new Stage("Convert", "Confirm", "Appointments", new java.math.BigDecimal("20")));
        var saved = service.save(actor, UUID.randomUUID().toString(), new PlanInput(source.name(), source.objective(),
            source.audience(), source.channel(), source.notes(), stages, source.status(), 0));
        assertThat(saved.stageEstimates()).extracting(StageEstimate::estimatedAdvance)
            .containsExactly(null, new java.math.BigDecimal("25.00"), new java.math.BigDecimal("32.00"), new java.math.BigDecimal("50.00"));
        assertThat(saved.estimatedConversion()).isEqualByComparingTo("4.00");
        assertThat(service.list(actor, "", "ALL", 1, 25, "name", "asc").items().getFirst().stageEstimates()).isEqualTo(saved.stageEstimates());
        mvc.perform(get("/api/v1/sales/funnels/" + saved.id()).session(session()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.stageEstimates[0].estimatedAdvance").isEmpty())
            .andExpect(jsonPath("$.stageEstimates[2].estimatedAdvance").value(32));
    }
    @Test void adjacentEstimatesNeverBridgeUnknownTargetsOrDivideByZero() {
        var stages = Arrays.asList(100, null, 25, 0, 0).stream()
            .map(target -> new Stage("Stage", "", "", target == null ? null : java.math.BigDecimal.valueOf(target))).toList();
        assertThat(FunnelService.stageEstimates(stages)).extracting(StageEstimate::estimatedAdvance)
            .containsExactly(null, null, null, new java.math.BigDecimal("0.00"), null);
        assertThat(FunnelService.conversion(stages)).isNull();
        assertThat(FunnelService.stageEstimates(input(0, "DRAFT", 4000, 107).stages()).getLast().estimatedAdvance())
            .isEqualByComparingTo("2.68");
    }
    @Test void invalidStageTargetsAndIncompletePlansAreRejectedAtomically() {
        String id = UUID.randomUUID().toString();
        service.save(actor, id, input(0, "DRAFT", 100, 10));
        for (var bad : List.of(input(1, "PLANNED", 10, 100), input(1, "DRAFT", -1, 0), input(1, "DRAFT", 10000001, 0))) {
            assertThatThrownBy(() -> service.save(actor, id, bad)).isInstanceOf(ResponseStatusException.class);
        }
        var bad = new PlanInput("Name", "", "", "OTHER", "", List.of(new Stage("One", "", "", null)), "DRAFT", 1);
        assertThatThrownBy(() -> service.save(actor, id, bad)).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor, id).version()).isEqualTo(1);
    }
    @Test void tenantReadsAndUpdatesNeverRevealOrChangeOtherCompanyPlans() {
        var saved = service.save(actor, UUID.randomUUID().toString(), input(0, "DRAFT", 100, 10));
        var outsider = new AuthSessionUser(user, other, "Other", "user");
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')", other);
        assertThatThrownBy(() -> service.get(outsider, saved.id())).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.save(outsider, saved.id(), input(1, "DRAFT", 100, 90))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.list(outsider, "", "ALL", 1, 25, "name", "asc").items()).isEmpty();
        assertThat(service.get(actor, saved.id()).estimatedConversion()).isEqualByComparingTo("10");
    }
    @Test void filtersRejectInvalidBoundsAndEscapeWildcardSearch() {
        service.save(actor, UUID.randomUUID().toString(), input(0, "DRAFT", null, null));
        assertThat(service.list(actor, "%", "ALL", 1, 25, "name", "asc").total()).isZero();
        assertThatThrownBy(() -> service.list(actor, "", "ALL", 0, 25, "name", "asc")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.list(actor, "", "ALL", 1, 25, "name;DROP", "asc")).isInstanceOf(ResponseStatusException.class);
    }
    @Test @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void endpointsEnforceSessionCsrfAndDedicatedTabWithoutRequiringOtherSalesTabs() throws Exception {
        String url = "/api/v1/sales/funnels/" + UUID.randomUUID();
        String body = mapper.writeValueAsString(input(0, "DRAFT", 100, 10));
        mvc.perform(get("/api/v1/sales/funnels")).andExpect(status().isUnauthorized());
        mvc.perform(put(url).session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put(url).session(session()).header("X-CSRF-Token", "synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(get(url).session(session())).andExpect(status().isOk());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='funneling'", membership);
        mvc.perform(get(url).session(session())).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','funneling')", membership);
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='crm'", company);
        mvc.perform(get(url).session(session())).andExpect(status().isForbidden());
    }
    @Test void savingPlansHasNoOperationalSideEffects() {
        long campaigns = db.queryForObject("SELECT COUNT(*) FROM sales_mailing_campaigns WHERE company_id=?", Long.class, company);
        long leads = db.queryForObject("SELECT COUNT(*) FROM sales_opportunities WHERE company_id=?", Long.class, company);
        service.save(actor, UUID.randomUUID().toString(), input(0, "PLANNED", 100, 10));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_campaigns WHERE company_id=?", Long.class, company)).isEqualTo(campaigns);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_opportunities WHERE company_id=?", Long.class, company)).isEqualTo(leads);
    }

    @Test void fractionalTargetsAreRejectedWithoutSilentIntegerCoercion() throws Exception {
        String body = mapper.writeValueAsString(input(0, "DRAFT", 100, 10)).replace("\"target\":10", "\"target\":10.5");
        mvc.perform(put("/api/v1/sales/funnels/" + UUID.randomUUID()).session(session()).header("X-CSRF-Token", "synthetic-csrf")
            .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
    }
    Workshop brief(String goal, List<String> channels) {
        return new Workshop("Introduce a new consultation service", "Consultation package", "Local area", goal, channels,
            List.of("PHOTOS"), "WHATSAPP", "Synthetic contact instructions", "Two weeks", "Undecided", "Synthetic AI response <script>not executed</script>", List.of("timing"));
    }
    PlanInput idea(long version, String status, Workshop brief) {
        return new PlanInput("Campaign idea", "Request appointments", "Local customers", "MIXED", "Planning only", List.of(), status, version, brief);
    }
    @Test void savesAnIdeaWithoutStagesAndRestoresItsBriefWithoutInventingNumbers() {
        var saved = service.save(actor, UUID.randomUUID().toString(), idea(0, "DRAFT", brief("UNDECIDED", List.of())));
        assertThat(saved.stages()).isEmpty(); assertThat(saved.estimatedConversion()).isNull(); assertThat(saved.stageEstimates()).isEmpty();
        var read = service.get(actor, saved.id());
        assertThat(read.workshop().aiResponse()).contains("<script>");
        assertThat(read.workshop().deferredRecommendations()).containsExactly("timing");
        assertThat(service.list(actor, "new consultation", "ALL", 1, 25, "name", "asc").items()).hasSize(1);
        assertThat(service.list(actor, "%", "ALL", 1, 25, "name", "asc").items()).isEmpty();
    }
    @Test void aDefinedWorkshopNeedsAnActionableBriefButNotNumericalGuesses() {
        var id = UUID.randomUUID().toString();
        assertThatThrownBy(() -> service.save(actor,id,idea(0,"PLANNED",brief("UNDECIDED",List.of())))).isInstanceOf(ResponseStatusException.class);
        var saved = service.save(actor,id,idea(0,"PLANNED",brief("APPOINTMENTS",List.of("META_ADS","GOOGLE_SEARCH"))));
        assertThat(saved.status()).isEqualTo("PLANNED");assertThat(saved.estimatedConversion()).isNull();
        assertThatThrownBy(() -> service.save(actor,id,idea(1,"PLANNED",brief("APPOINTMENTS",List.of())))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor,id).version()).isEqualTo(1);
        assertThat(service.save(actor,UUID.randomUUID().toString(),input(0,"PLANNED",null,null)).estimatedConversion()).isNull();
    }
    @Test void oldClientsCannotEraseABriefOrBypassItsReadinessByOmittingIt() {
        var id = UUID.randomUUID().toString();
        service.save(actor,id,idea(0,"DRAFT",brief("UNDECIDED",List.of())));
        assertThatThrownBy(() -> service.save(actor,id,input(1,"PLANNED",100,10))).isInstanceOf(ResponseStatusException.class);
        var saved=service.save(actor,id,input(1,"ARCHIVED",100,10));
        assertThat(saved.workshop()).isNotNull();assertThat(saved.workshop().goal()).isEqualTo("UNDECIDED");
        assertThat(saved.workshop().aiResponse()).contains("Synthetic AI response");
        assertThat(service.save(actor,id,input(2,"DRAFT",100,10)).workshop()).isEqualTo(saved.workshop());
    }
    @Test void workshopWritesRetainTenantVersionAndOperationalBoundaries() {
        long campaigns=db.queryForObject("SELECT COUNT(*) FROM sales_mailing_campaigns WHERE company_id=?",Long.class,company);
        long leads=db.queryForObject("SELECT COUNT(*) FROM sales_opportunities WHERE company_id=?",Long.class,company);
        var id=UUID.randomUUID().toString();var data=idea(0,"DRAFT",brief("INQUIRIES",List.of("ORGANIC")));
        service.save(actor,id,data);
        assertThatThrownBy(() -> service.save(actor,id,data)).isInstanceOf(ResponseStatusException.class);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')",other);
        var outsider=new AuthSessionUser(user,other,"Other","user");
        assertThatThrownBy(() -> service.get(outsider,id)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.save(outsider,id,idea(1,"DRAFT",brief("INQUIRIES",List.of("META_ADS"))))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.list(outsider,"","ALL",1,25,"name","asc").items()).isEmpty();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_funnel_audit WHERE company_id=?",Long.class,company)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_campaigns WHERE company_id=?",Long.class,company)).isEqualTo(campaigns);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_opportunities WHERE company_id=?",Long.class,company)).isEqualTo(leads);
    }
    @Test void workshopEndpointsRejectInvalidEnumsAndOversizedContentAndKeepCsrf() throws Exception {
        var id=UUID.randomUUID().toString();var data=idea(0,"DRAFT",brief("INQUIRIES",List.of("META_ADS")));
        String body=mapper.writeValueAsString(data);
        mvc.perform(put("/api/v1/sales/funnels/"+id).session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        for(String invalid:List.of(body.replace("META_ADS","UNSUPPORTED"),body.replace("INQUIRIES","INVALID"),
            body.replace("Introduce a new consultation service","x".repeat(4001)))) {
            mvc.perform(put("/api/v1/sales/funnels/"+id).session(session()).header("X-CSRF-Token","synthetic-csrf")
                .contentType(MediaType.APPLICATION_JSON).content(invalid)).andExpect(status().isBadRequest());
        }
        assertThatThrownBy(() -> service.save(actor,id,idea(0,"DRAFT",brief("INQUIRIES",List.of("META_ADS","META_ADS"))))).isInstanceOf(ResponseStatusException.class);
        mvc.perform(put("/api/v1/sales/funnels/"+id).session(session()).header("X-CSRF-Token","synthetic-csrf")
            .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.workshop.channels[0]").value("META_ADS"));
    }


    @Test void unifiedJourneyPersistsContentTogetherWithBriefAndKeepsTargetsOptional() throws Exception {
        var source = idea(0, "PLANNED", brief("QUOTES", List.of("GOOGLE_SEARCH")));
        var stages = List.of(new Stage("Discover", "Learn", "People reached", null, "Search ad"),
            new Stage("Quote", "Request a quote", "Requests", null, "Proposal page"));
        var saved = service.save(actor, UUID.randomUUID().toString(), new PlanInput(source.name(), source.objective(),
            source.audience(), source.channel(), source.notes(), stages, source.status(), 0, source.workshop()));
        assertThat(saved.workshop().goal()).isEqualTo("QUOTES");
        assertThat(service.get(actor,saved.id()).stages()).extracting(Stage::content).containsExactly("Search ad","Proposal page");
        assertThat(saved.estimatedConversion()).isNull();
        assertThat(saved.stageEstimates()).allMatch(item -> item.estimatedAdvance() == null);
        mvc.perform(get("/api/v1/sales/funnels/"+saved.id()).session(session()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.stages[1].content").value("Proposal page"));
    }
    @Test void olderStageSnapshotsRemainReadableAndNumericEstimatesArePreserved() {
        var saved = service.save(actor, UUID.randomUUID().toString(), input(0,"PLANNED",100,20));
        db.update("UPDATE sales_funnels SET stages_json=JSON_REMOVE(stages_json,'$[0].content','$[1].content') WHERE company_id=? AND id=?",company,saved.id());
        var original=service.get(actor,saved.id());
        assertThat(original.stages()).allMatch(s -> s.content()==null);
        var stages=original.stages().stream().map(s -> new Stage(s.name(),s.action(),s.measure(),s.target(),"Custom content")).toList();
        var updated=service.save(actor,saved.id(),new PlanInput(original.name(),original.objective(),original.audience(),
            original.channel(),original.notes(),stages,original.status(),original.version()));
        assertThat(updated.estimatedConversion()).isEqualByComparingTo("20");
        assertThat(updated.workshop()).isNull();
        assertThatThrownBy(() -> service.save(actor,saved.id(),input(updated.version(),"PLANNED",100,20)))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("409");
        assertThat(service.get(actor,saved.id()).stages()).extracting(Stage::content).containsOnly("Custom content");
        assertThat(service.get(actor,saved.id()).version()).isEqualTo(updated.version());
    }
    @Test void newGoalsRespectPersistenceAndCannotEscapeTheValidatedCatalog() {
        for (String goal:List.of("QUOTES","RENEWALS")) {
            var saved=service.save(actor,UUID.randomUUID().toString(),idea(0,"PLANNED",brief(goal,List.of("ORGANIC"))));
            assertThat(service.get(actor,saved.id()).workshop().goal()).isEqualTo(goal);
        }
        assertThatThrownBy(() -> service.save(actor,UUID.randomUUID().toString(),idea(0,"PLANNED",brief("UNKNOWN",List.of("ORGANIC")))))
            .isInstanceOf(ResponseStatusException.class);
    }
    @Test void stageContentLimitsAndClearAreExplicitAndAtomic() throws Exception {
        var source=input(0,"DRAFT",100,10);
        var stages=List.of(new Stage("Attract","Invite","People",null,"x".repeat(1001)),new Stage("Convert","Contact","Contacts",null,""));
        String id=UUID.randomUUID().toString();
        var request=new PlanInput(source.name(),source.objective(),source.audience(),source.channel(),source.notes(),stages,"DRAFT",0);
        mvc.perform(put("/api/v1/sales/funnels/"+id).session(session()).header("X-CSRF-Token","synthetic-csrf")
            .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request))).andExpect(status().isBadRequest());
        assertThat(service.list(actor,"","ALL",1,25,"name","asc").total()).isZero();
        var valid=stages.stream().map(s -> new Stage(s.name(),s.action(),s.measure(),s.target(),"Valid")).toList();
        var saved=service.save(actor,id,new PlanInput(source.name(),source.objective(),source.audience(),source.channel(),source.notes(),valid,"DRAFT",0));
        var cleared=valid.stream().map(s -> new Stage(s.name(),s.action(),s.measure(),s.target(),"")).toList();
        assertThat(service.save(actor,id,new PlanInput(source.name(),source.objective(),source.audience(),source.channel(),source.notes(),cleared,"DRAFT",saved.version())).stages())
            .extracting(Stage::content).containsOnly("");
    }

}
