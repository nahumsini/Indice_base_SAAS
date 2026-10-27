package com.indice.erp.sales.whatsapping;

import static com.indice.erp.sales.whatsapping.WhatsappingContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.*;
import com.indice.erp.notifications.BasicNotificationDelivery;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(
    properties = {
      "app.email.enabled=false",
      "app.mail-accounts.worker-enabled=false",
      "app.mailing.worker-enabled=false"
    })
@AutoConfigureMockMvc
@Transactional
class WhatsappingIntegrationTest {
  @Autowired JdbcTemplate db;
  @Autowired WhatsappingService service;
  @Autowired WhatsappingReminderSource reminders;
  @Autowired BasicNotificationDelivery notifications;
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  long company, other, user, member, contact, second;
  AuthSessionUser actor;

  long insert(String sql, Object... args) {
    var key = new GeneratedKeyHolder();
    db.update(
        connection -> {
          var s = connection.prepareStatement(sql, java.sql.Statement.RETURN_GENERATED_KEYS);
          for (int i = 0; i < args.length; i++) s.setObject(i + 1, args[i]);
          return s;
        },
        key);
    return key.getKey().longValue();
  }

  @BeforeEach
  void setup() {
    assertThat(db.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
    company = insert("INSERT INTO companies(name) VALUES(?)", "Whatsapping " + UUID.randomUUID());
    other = insert("INSERT INTO companies(name) VALUES(?)", "Other " + UUID.randomUUID());
    user =
        insert(
            "INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Synthetic"
                + " seller')",
            "whatsapping-" + UUID.randomUUID() + "@example.com");
    member =
        insert(
            "INSERT INTO user_companies(user_id,company_id,role,status)"
                + " VALUES(?,?,'user','active')",
            user,
            company);
    db.update(
        "INSERT INTO company_module_entitlements(company_id,module_slug,status,source)"
            + " VALUES(?,'crm','active','test')",
        company);
    db.update(
        "INSERT INTO user_company_module_roles(user_company_id,module_slug,role)"
            + " VALUES(?,'crm','user')",
        member);
    db.update(
        "INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key)"
            + " VALUES(?,'crm','contacts')",
        member);
    actor = new AuthSessionUser(user, company, "Synthetic seller", "user");
    contact = contact(company, "Ada", "+14165550110");
    second = contact(company, "Grace", "+525555501234");
  }

  long contact(long c, String name, String phone) {
    return insert(
        "INSERT INTO sales_contacts(company_id,contact_code,company_name,contact_person,phone,status)"
            + " VALUES(?,?,'Synthetic customer',?,?,'active')",
        c,
        "WA-" + UUID.randomUUID().toString().substring(0, 12),
        name,
        phone);
  }

  MockHttpSession session() {
    var s = new MockHttpSession();
    s.setAttribute(SessionAuthService.SESSION_USER_ID, user);
    s.setAttribute(SessionAuthService.SESSION_COMPANY_ID, company);
    s.setAttribute(SessionAuthService.SESSION_USER_NAME, "Synthetic seller");
    s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF, "synthetic-csrf");
    return s;
  }

  CampaignInput input(long version, List<Long> ids) {
    return new CampaignInput(
        "Synthetic campaign",
        "WELCOME",
        "Consultation",
        "MX",
        "https://example.com/info",
        List.of(new Step("Welcome", 0, "Hello {{name}}, from {{seller}}. {{link}}")),
        ids,
        version);
  }

  Detail draft(List<Long> ids) {
    return service.save(actor, UUID.randomUUID().toString(), input(0, ids));
  }

  Detail activate(List<Long> ids) {
    var d = draft(ids);
    return service.state(
        actor, d.campaign().id(), new StateInput(d.campaign().version(), "ACTIVE"));
  }

  ActionResult action(Detail d, long id, String action) {
    var r = d.recipients().stream().filter(c -> c.contact().id() == id).findFirst().orElseThrow();
    return service.action(
        actor, d.campaign().id(), id, new ActionInput(r.version(), action, "Synthetic note", null));
  }

  @Test
  void persistsDraftRecipientsTemplatesAndListsWithOptimisticVersions() {
    var d = draft(List.of(contact, second, contact));
    assertThat(d.recipients()).hasSize(2);
    assertThat(service.get(actor, d.campaign().id()).recipients().getFirst().message())
        .contains("Ada")
        .contains("Synthetic seller");
    assertThatThrownBy(() -> service.save(actor, d.campaign().id(), input(0, List.of(second))))
        .hasMessageContaining("409");
    var updated = service.save(actor, d.campaign().id(), input(1, List.of(second)));
    assertThat(updated.recipients()).hasSize(1);
    String t = UUID.randomUUID().toString();
    service.template(actor, t, new TemplateInput("Welcome", "Hello {{name}}", "ACTIVE", 0));
    assertThatThrownBy(
            () -> service.template(actor, t, new TemplateInput("Stale", "Hello", "ACTIVE", 0)))
        .hasMessageContaining("409");
    service.template(actor, t, new TemplateInput("Welcome", "Hello {{name}}", "ARCHIVED", 1));
    assertThat(service.templates(actor).getFirst().status()).isEqualTo("ARCHIVED");
    String l = UUID.randomUUID().toString();
    service.list(actor, l, new ListInput("Customers", List.of(contact, second), 0));
    assertThat(service.lists(actor).getFirst().contactIds()).containsExactly(contact, second);
  }

  @Test
  void preparesEncodedMessageWithoutClaimingSendThenRequiresExplicitConfirmation() {
    var d = activate(List.of(contact));
    var result = action(d, contact, "PREPARE");
    assertThat(result.whatsappUrl()).startsWith("https://wa.me/14165550110?text=Hello%20Ada");
    assertThat(result.detail().recipients().getFirst().state()).isEqualTo("PREPARED");
    assertThat(result.detail().events()).noneMatch(e -> e.action().equals("SENT"));
    var sent = action(result.detail(), contact, "SENT");
    assertThat(sent.detail().campaign().status()).isEqualTo("COMPLETED");
    assertThat(sent.detail().recipients().getFirst().state()).isEqualTo("DONE");
    assertThat(sent.whatsappUrl()).isNull();
    var replied = action(sent.detail(), contact, "REPLIED");
    assertThat(replied.detail().recipients().getFirst().state()).isEqualTo("REPLIED");
  }

  @Test
  void countDrillDownUsesCompleteCampaignHistoryAndMatchesEachCount() {
    var d = activate(List.of(contact, second));
    var prepared = action(d, contact, "PREPARE").detail();
    var sent = action(prepared, contact, "SENT").detail();
    var positive = action(sent, contact, "REPLY_POSITIVE").detail();
    action(positive, second, "REPLY_NEGATIVE");
    for(int i=0;i<110;i++) db.update("INSERT INTO sales_whatsapp_events(company_id,campaign_id,contact_id,actor_user_id,action,step_index) VALUES(?,?,?,?, 'NOTE',0)",company,d.campaign().id(),second,user);
    var detail = service.get(actor,d.campaign().id());
    assertThat(detail.events()).hasSize(100).noneMatch(event -> event.action().equals("SENT"));
    assertThat(detail.resultContacts().contacted()).containsExactly(contact);
    assertThat(detail.resultContacts().positive()).containsExactly(contact);
    assertThat(detail.resultContacts().negative()).containsExactly(second);
    assertThat(detail.resultContacts().withOpportunity()).isNull();
    assertThat(detail.resultContacts().contacted()).hasSize(detail.campaign().outcomes().contacted());
    assertThat(detail.resultContacts().positive()).hasSize(detail.campaign().outcomes().positive());
    assertThat(detail.resultContacts().negative()).hasSize(detail.campaign().outcomes().negative());
    var unrelated = draft(List.of(contact,second));
    assertThat(unrelated.resultContacts().contacted()).isEmpty();
    assertThat(unrelated.resultContacts().positive()).isEmpty();
    assertThat(unrelated.resultContacts().negative()).isEmpty();
  }

  @Test
  void campaignTableCountsDistinctContactsAndFiltersBeforePagination() {
    var d = activate(List.of(contact, second));
    var prepared = action(d, contact, "PREPARE").detail();
    var sent = action(prepared, contact, "SENT").detail();
    var positive = action(sent, contact, "REPLY_POSITIVE").detail();
    var finished = action(positive, second, "REPLY_NEGATIVE").detail();
    db.update("INSERT INTO sales_whatsapp_events(company_id,campaign_id,contact_id,actor_user_id,action,step_index) VALUES(?,?,?,?, 'SENT',0)",company,d.campaign().id(),contact,user);
    var outcomes = service.get(actor, d.campaign().id()).campaign().outcomes();
    assertThat(outcomes.contacted()).isEqualTo(1);
    assertThat(outcomes.positive()).isEqualTo(1);
    assertThat(outcomes.negative()).isEqualTo(1);
    for (int i=0;i<11;i++) draft(List.of(second));
    var all = service.list(actor,"","ALL",null,1,10,"updatedAt","desc","ALL");
    assertThat(all.items()).hasSize(10);
    assertThat(all.results().all()).isEqualTo(12);
    assertThat(all.results().contacted()).isEqualTo(1);
    assertThat(all.results().positive()).isEqualTo(1);
    assertThat(all.results().negative()).isEqualTo(1);
    for (String result : List.of("CONTACTED","POSITIVE","NEGATIVE")) {
      var filtered = service.list(actor,"","ALL",null,1,10,"updatedAt","desc",result);
      assertThat(filtered.total()).isEqualTo(1);
      assertThat(filtered.items().getFirst().id()).isEqualTo(d.campaign().id());
      assertThat(filtered.results().all()).isEqualTo(12);
    }
    for (String sort : List.of("contacted", "positive", "negative")) assertThat(service.list(actor,"","ALL",null,1,10,sort,"desc").items().getFirst().id()).isEqualTo(d.campaign().id());
    assertThat(service.list(actor,"","DRAFT",null,1,10,"updatedAt","desc","POSITIVE").total()).isZero();
    assertThat(service.list(actor,"No matching campaign","ALL",null,1,10,"updatedAt","desc","ALL").results().all()).isZero();
    assertThatThrownBy(()->service.list(actor,"","ALL",null,1,10,"updatedAt","desc","unknown")).hasMessageContaining("400");
  }

  @Test
  void opportunityPresenceRequiresSalesAccessAndCountsContactsOnlyInThisCompany() {
    var d = draft(List.of(contact, second));
    assertThat(service.get(actor,d.campaign().id()).campaign().outcomes().withOpportunity()).isNull();
    assertThat(service.get(actor,d.campaign().id()).opportunities()).isNull();
    db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','leads')",member);
    long flow = insert("INSERT INTO sales_opportunity_flows(company_id,flow_key,name) VALUES(?,'synthetic','Synthetic flow')", company);
    long otherFlow = insert("INSERT INTO sales_opportunity_flows(company_id,flow_key,name) VALUES(?,'synthetic','Synthetic flow')", other);
    long firstOpportunity = insert("INSERT INTO sales_opportunities(company_id,contact_id,assigned_flow_id,opportunity_code,opportunity_name) VALUES(?,?,?,'WA-1','Synthetic opportunity')", company, contact, flow);
    long secondOpportunity = insert("INSERT INTO sales_opportunities(company_id,contact_id,assigned_flow_id,opportunity_code,opportunity_name) VALUES(?,?,?,'WA-2','Second opportunity')", company, contact, flow);
    long deletedOpportunity = insert("INSERT INTO sales_opportunities(company_id,contact_id,assigned_flow_id,opportunity_code,opportunity_name,deleted_at) VALUES(?,?,?,'WA-3','Deleted opportunity',CURRENT_TIMESTAMP)", company, second, flow);
    insert("INSERT INTO sales_opportunities(company_id,contact_id,assigned_flow_id,opportunity_code,opportunity_name) VALUES(?,?,?,'WA-4','Foreign opportunity')", other, second, otherFlow);
    var result = service.list(actor,"","ALL",null,1,10,"updatedAt","desc");
    assertThat(result.items().getFirst().outcomes().withOpportunity()).isEqualTo(1);
    assertThat(service.get(actor,d.campaign().id()).campaign().outcomes().withOpportunity()).isEqualTo(1);
    assertThat(service.get(actor,d.campaign().id()).resultContacts().withOpportunity()).containsExactly(contact);
    var references = service.get(actor,d.campaign().id()).opportunities();
    assertThat(references).extracting(Opportunity::id).containsExactly(secondOpportunity, firstOpportunity);
    assertThat(references).allSatisfy(o -> { assertThat(o.contactId()).isEqualTo(contact); assertThat(o.flowId()).isEqualTo(flow); });
    assertThat(references.getFirst().name()).isEqualTo("Second opportunity");
    assertThat(references.getFirst().code()).isEqualTo("WA-2");
    var unrelated = draft(List.of(second));
    assertThat(service.get(actor,unrelated.campaign().id()).opportunities()).isEmpty();
    db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='leads'",member);
    assertThat(service.list(actor,"","ALL",null,1,10,"updatedAt","desc").items().getFirst().outcomes().withOpportunity()).isNull();
    assertThat(service.get(actor,d.campaign().id()).resultContacts().withOpportunity()).isNull();
    assertThat(service.get(actor,d.campaign().id()).opportunities()).isNull();
  }

  @Test
  void opportunityStageUsesAssignedFlowPositionAndPreservesCustomLabels() {
    var d = draft(List.of(contact, second));
    db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','leads')",member);
    long customFlow = insert("INSERT INTO sales_opportunity_flows(company_id,flow_key,name) VALUES(?,'technical','Technical flow')", company);
    long factoryFlow = insert("INSERT INTO sales_opportunity_flows(company_id,flow_key,name,is_factory) VALUES(?,'factory','Factory flow',1)", company);
    long otherFlow = insert("INSERT INTO sales_opportunity_flows(company_id,flow_key,name) VALUES(?,'other','Other flow')", other);
    long customStage = insert("INSERT INTO sales_opportunity_flow_stages(company_id,flow_id,stage_key,label,stage_type) VALUES(?,?,'technical_review','Revisión técnica','OPEN')",company,customFlow);
    long factoryStage = insert("INSERT INTO sales_opportunity_flow_stages(company_id,flow_id,stage_key,label,stage_type) VALUES(?,?,'proposal','Proposal','OPEN')",company,factoryFlow);
    long foreignStage = insert("INSERT INTO sales_opportunity_flow_stages(company_id,flow_id,stage_key,label,stage_type) VALUES(?,?,'technical_review','Foreign label must not leak','OPEN')",other,otherFlow);
    long opportunity = insert("INSERT INTO sales_opportunities(company_id,contact_id,assigned_flow_id,opportunity_code,opportunity_name,stage) VALUES(?,?,?,'CUSTOM','Synthetic custom opportunity','new')",company,contact,customFlow);
    long legacy = insert("INSERT INTO sales_opportunities(company_id,contact_id,assigned_flow_id,opportunity_code,opportunity_name,stage) VALUES(?,?,?,'LEGACY','Legacy proposal','proposal')",company,second,factoryFlow);
    long unknown = insert("INSERT INTO sales_opportunities(company_id,contact_id,assigned_flow_id,opportunity_code,opportunity_name,stage) VALUES(?,?,?,'UNKNOWN','Unknown stage','missing_stage')",company,second,customFlow);
    db.update("INSERT INTO sales_opportunity_flow_positions(company_id,opportunity_id,flow_id,stage_id,probability_percent) VALUES(?,?,?,?,50)",company,opportunity,customFlow,customStage);
    // A retained old-flow position must not replace the assigned flow's stage.
    db.update("INSERT INTO sales_opportunity_flow_positions(company_id,opportunity_id,flow_id,stage_id,probability_percent) VALUES(?,?,?,?,75)",company,opportunity,factoryFlow,factoryStage);
    var detail = service.get(actor,d.campaign().id());
    var projected = detail.opportunities().stream().filter(o -> o.id() == opportunity).findFirst().orElseThrow();
    assertThat(projected.stage().key()).isEqualTo("technical_review");
    assertThat(projected.stage().label()).isEqualTo("Revisión técnica");
    assertThat(projected.stage().usesDefaultLabel()).isFalse();
    var fallback = detail.opportunities().stream().filter(o -> o.id() == legacy).findFirst().orElseThrow();
    assertThat(fallback.stage().key()).isEqualTo("proposal");
    assertThat(fallback.stage().usesDefaultLabel()).isTrue();
    assertThat(detail.opportunities().stream().filter(o -> o.id() == unknown).findFirst().orElseThrow().stage()).isNull();
    assertThat(detail.campaign().version()).isEqualTo(d.campaign().version());
    assertThat(detail.recipients()).extracting(Recipient::version).containsExactlyElementsOf(d.recipients().stream().map(Recipient::version).toList());
    db.update("UPDATE sales_opportunity_flow_stages SET label='Validación de propuesta' WHERE company_id=? AND id=?",company,customStage);
    assertThat(service.get(actor,d.campaign().id()).opportunities().stream().filter(o -> o.id() == opportunity).findFirst().orElseThrow().stage().label()).isEqualTo("Validación de propuesta");
    db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='leads'",member);
    assertThat(service.get(actor,d.campaign().id()).opportunities()).isNull();
  }

  @Test
  void commercialRepliesKeepDistinctEventsWithoutSuppressingPhone() {
    var d = activate(List.of(contact, second));
    var positive = action(d, contact, "REPLY_POSITIVE").detail();
    assertThat(positive.events()).anyMatch(e -> e.contactId() != null && e.contactId() == contact && e.action().equals("REPLY_POSITIVE"));
    var negative = action(positive, second, "REPLY_NEGATIVE").detail();
    assertThat(negative.recipients()).allMatch(r -> r.state().equals("REPLIED"));
    assertThat(negative.events()).anyMatch(e -> e.contactId() != null && e.contactId() == second && e.action().equals("REPLY_NEGATIVE"));
    assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_whatsapp_suppressions WHERE company_id=?", Integer.class, company)).isZero();
    assertThat(service.get(actor, d.campaign().id()).events()).anyMatch(e -> e.action().equals("REPLY_POSITIVE"));
    assertThatThrownBy(() -> action(negative, contact, "REPLY_NEGATIVE")).hasMessageContaining("409");
  }

  @Test
  void personalMessageIsPreparedForOneRecipientAndCanRestoreCampaignText() {
    var d = activate(List.of(contact, second));
    var first = d.recipients().stream().filter(row -> row.contact().id() == contact).findFirst().orElseThrow();
    String custom = "Hola Ada, revisamos tu propuesta mañana. ✓";
    var result = service.action(actor, d.campaign().id(), contact, new ActionInput(first.version(), "PREPARE", "", null, custom));
    var saved = service.get(actor, d.campaign().id());
    var prepared = saved.recipients().stream().filter(row -> row.contact().id() == contact).findFirst().orElseThrow();
    assertThat(prepared.message()).isEqualTo(custom);
    assertThat(prepared.baseMessage()).startsWith("Hello Ada");
    assertThat(result.whatsappUrl()).contains("Hola%20Ada");
    assertThat(saved.recipients().stream().filter(row -> row.contact().id() == second).findFirst().orElseThrow().state()).isEqualTo("PENDING");
    assertThat(saved.campaign().steps()).isEqualTo(d.campaign().steps());
    assertThat(saved.events()).noneMatch(event -> event.action().equals("SENT"));
    var restored = service.action(actor, d.campaign().id(), contact, new ActionInput(prepared.version(), "PREPARE", "", null));
    assertThat(restored.detail().recipients().stream().filter(row -> row.contact().id() == contact).findFirst().orElseThrow().message()).isEqualTo(prepared.baseMessage());
  }

  @Test
  void rejectsIncompletePersonalMessagesWithoutChangingRecipientVersion() {
    var d = activate(List.of(contact));
    long version = d.recipients().getFirst().version();
    for (String message : List.of(" ", "Hola {{link}}", "x".repeat(4001))) {
      assertThatThrownBy(() -> service.action(actor, d.campaign().id(), contact, new ActionInput(version, "PREPARE", "", null, message))).hasMessageContaining("400");
    }
    assertThat(service.get(actor, d.campaign().id()).recipients().getFirst().version()).isEqualTo(version);
    assertThatThrownBy(() -> service.action(actor, d.campaign().id(), contact, new ActionInput(version, "SENT", "", null, "Custom"))).hasMessageContaining("400");
  }

  @Test
  void cannotConfirmWithoutPreparationAndAStaleRetryNeverAdvancesTwice() {
    var d = activate(List.of(contact));
    assertThatThrownBy(() -> action(d, contact, "SENT")).hasMessageContaining("409");
    var prepared = action(d, contact, "PREPARE").detail();
    action(prepared, contact, "SENT");
    assertThatThrownBy(() -> action(prepared, contact, "SENT")).hasMessageContaining("409");
    assertThat(
            service.get(actor, d.campaign().id()).events().stream()
                .filter(e -> e.action().equals("SENT")))
        .hasSize(1);
  }

  @Test
  void duplicateAndInvalidPhonesAreExcludedAndNoUnresolvedVariableCanOpen() {
    long duplicate = contact(company, "Duplicate", "+1 (416) 555-0110"),
        invalid = contact(company, "Invalid", "not a phone");
    var d = activate(List.of(contact, duplicate, invalid));
    assertThat(d.recipients())
        .extracting(Recipient::eligibility)
        .containsExactly("READY", "DUPLICATE", "INVALID");
    assertThatThrownBy(() -> action(d, duplicate, "PREPARE")).hasMessageContaining("400");
    var in = input(0, List.of(contact));
    var incomplete =
        new CampaignInput(
            in.name(),
            in.objective(),
            "",
            in.defaultRegion(),
            "",
            List.of(new Step("One", 0, "Hi {{name}} {{offer}}")),
            in.contactIds(),
            0);
    var saved = service.save(actor, UUID.randomUUID().toString(), incomplete);
    assertThat(saved.recipients().getFirst().eligibility()).isEqualTo("MISSING_DATA");
    assertThatThrownBy(
            () -> service.state(actor, saved.campaign().id(), new StateInput(1, "ACTIVE")))
        .hasMessageContaining("400");
  }

  @Test
  void suppressingAPhoneAppliesToOtherCampaignsAndSurvivesFormattingChanges() {
    var first = activate(List.of(contact));
    var otherCampaign = activate(List.of(contact));
    action(first, contact, "BLOCK");
    assertThat(
            service.get(actor, otherCampaign.campaign().id()).recipients().getFirst().eligibility())
        .isEqualTo("BLOCKED");
    assertThatThrownBy(() -> action(otherCampaign, contact, "PREPARE")).hasMessageContaining("400");
    db.update(
        "UPDATE sales_contacts SET phone='+1 (416) 555-0110' WHERE company_id=? AND id=?",
        company,
        contact);
    assertThat(service.contacts(actor, "Ada", "MX", 1, 25).items().getFirst().eligibility())
        .isEqualTo("BLOCKED");
  }

  @Test
  void sequencesWaitUntilDueAndNotificationsAreTargetedAndDeduplicated() {
    var in = input(0, List.of(contact));
    var d =
        service.save(
            actor,
            UUID.randomUUID().toString(),
            new CampaignInput(
                in.name(),
                in.objective(),
                in.offer(),
                in.defaultRegion(),
                in.resourceUrl(),
                List.of(in.steps().getFirst(), new Step("Follow up", 3, "Follow up {{name}}")),
                in.contactIds(),
                0));
    d = service.state(actor, d.campaign().id(), new StateInput(1, "ACTIVE"));
    d = action(action(d, contact, "PREPARE").detail(), contact, "SENT").detail();
    var waiting = d;
    assertThat(d.recipients().getFirst().state()).isEqualTo("WAITING");
    assertThat(d.recipients().getFirst().stepIndex()).isEqualTo(1);
    assertThatThrownBy(() -> action(waiting, contact, "PREPARE")).hasMessageContaining("409");
    assertThat(reminders.current(actor)).isEmpty();
    db.update(
        "UPDATE sales_whatsapp_recipients SET next_action_at=CURRENT_TIMESTAMP(6)-INTERVAL 1 MINUTE"
            + " WHERE company_id=? AND campaign_id=?",
        company,
        d.campaign().id());
    var signals = reminders.current(actor);
    assertThat(signals).hasSize(1);
    assertThat(signals.getFirst().destination()).contains(d.campaign().id());
    notifications.deliver(user, company, reminders);
    notifications.deliver(user, company, reminders);
    assertThat(
            db.queryForObject(
                "SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND"
                    + " event_type='sales_whatsapping_reminder'",
                Long.class,
                company))
        .isEqualTo(1);
    d =
        action(
                action(service.get(actor, d.campaign().id()), contact, "PREPARE").detail(),
                contact,
                "SENT")
            .detail();
    assertThat(d.campaign().status()).isEqualTo("COMPLETED");
    assertThat(reminders.current(actor)).isEmpty();
    assertThat(
            reminders.visible(
                actor,
                signals.getFirst().sourceType(),
                signals.getFirst().sourceId(),
                signals.getFirst().event()))
        .isFalse();
  }

  @Test
  void pausePreventsOpeningAndActiveCampaignsCannotChangeAudience() {
    var d = activate(List.of(contact));
    assertThatThrownBy(
            () ->
                service.save(
                    actor, d.campaign().id(), input(d.campaign().version(), List.of(second))))
        .hasMessageContaining("409");
    var paused =
        service.state(actor, d.campaign().id(), new StateInput(d.campaign().version(), "PAUSED"));
    assertThatThrownBy(() -> action(paused, contact, "PREPARE")).hasMessageContaining("409");
    assertThat(
            service
                .state(
                    actor,
                    paused.campaign().id(),
                    new StateInput(paused.campaign().version(), "ACTIVE"))
                .campaign()
                .status())
        .isEqualTo("ACTIVE");
  }

  @Test
  void crossTenantContactsAreRejectedAtomically() {
    long foreign = contact(other, "Foreign", "+14165550111");
    var d = draft(List.of(contact));
    assertThatThrownBy(
            () -> service.save(actor, d.campaign().id(), input(1, List.of(contact, foreign))))
        .hasMessageContaining("400");
    assertThat(service.get(actor, d.campaign().id()).campaign().version()).isEqualTo(1);
    assertThatThrownBy(
            () ->
                service.list(
                    actor,
                    UUID.randomUUID().toString(),
                    new ListInput("Foreign", List.of(foreign), 0)))
        .hasMessageContaining("400");
    assertThat(service.lists(actor)).isEmpty();
  }

  @Test
  void inactiveContactsAndPermissionRevocationsAreCheckedAtActionTime() {
    var d = activate(List.of(contact));
    db.update(
        "UPDATE sales_contacts SET status='inactive' WHERE company_id=? AND id=?",
        company,
        contact);
    assertThatThrownBy(() -> action(d, contact, "PREPARE")).hasMessageContaining("400");
    db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=?", member);
    assertThatThrownBy(() -> service.get(actor, d.campaign().id())).hasMessageContaining("403");
  }

  @Test
  void browserEndpointsEnforceAuthenticationCsrfAndContactsPermission() throws Exception {
    String path = "/api/v1/sales/whatsapping/campaigns/" + UUID.randomUUID();
    String body = mapper.writeValueAsString(input(0, List.of(contact)));
    mvc.perform(get("/api/v1/sales/whatsapping/campaigns")).andExpect(status().isUnauthorized());
    mvc.perform(put(path).session(session()).contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isForbidden());
    mvc.perform(
            put(path)
                .session(session())
                .header("X-CSRF-Token", "synthetic-csrf")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk());
    mvc.perform(get(path).session(session())).andExpect(status().isOk());
  }

  @Test
  void memberWithOnlyMailingCannotReadWhatsapping() throws Exception {
    db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=?", member);
    db.update(
        "INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key)"
            + " VALUES(?,'crm','mailing')",
        member);
    mvc.perform(get("/api/v1/sales/whatsapping/templates").session(session()))
        .andExpect(status().isForbidden());
  }

  @Test
  void unknownPlaceholdersAndUnsafeResourcesAreRejected() {
    var in = input(0, List.of(contact));
    for (String body : List.of("Hello {{password}}", "Broken {{name")) {
      assertThatThrownBy(
              () ->
                  service.template(
                      actor,
                      UUID.randomUUID().toString(),
                      new TemplateInput("Invalid", body, "ACTIVE", 0)))
          .hasMessageContaining("400");
    }
    for (String url :
        List.of(
            "javascript:alert(1)",
            "http://example.com/file",
            "https://user:pass@example.com/file",
            "https://127.0.0.1/file")) {
      assertThatThrownBy(
              () ->
                  service.save(
                      actor,
                      UUID.randomUUID().toString(),
                      new CampaignInput(
                          in.name(),
                          in.objective(),
                          in.offer(),
                          in.defaultRegion(),
                          url,
                          in.steps(),
                          in.contactIds(),
                          0)))
          .hasMessageContaining("400");
    }
  }

  @Test
  void filtersEscapeWildcardsAndRejectSortInjection() {
    draft(List.of(contact));
    assertThat(service.list(actor, "%", "ALL", null, 1, 25, "name", "asc").total()).isZero();
    assertThatThrownBy(() -> service.list(actor, "", "ALL", null, 1, 25, "name;DROP", "asc"))
        .hasMessageContaining("400");
  }

  @Test
  void anotherSalespersonMayReadButCannotChangeOrWorkACampaign() {
    var d = activate(List.of(contact));
    long otherUser =
        insert(
            "INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Second"
                + " seller')",
            "other-" + UUID.randomUUID() + "@example.com");
    long membership =
        insert(
            "INSERT INTO user_companies(user_id,company_id,role,status)"
                + " VALUES(?,?,'user','active')",
            otherUser,
            company);
    db.update(
        "INSERT INTO user_company_module_roles(user_company_id,module_slug,role)"
            + " VALUES(?,'crm','user')",
        membership);
    db.update(
        "INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key)"
            + " VALUES(?,'crm','contacts')",
        membership);
    var another = new AuthSessionUser(otherUser, company, "Second", "user");
    assertThat(service.get(another, d.campaign().id()).campaign().canEdit()).isFalse();
    assertThatThrownBy(
            () ->
                service.action(
                    another, d.campaign().id(), contact, new ActionInput(1, "PREPARE", "", null)))
        .hasMessageContaining("403");
    assertThat(reminders.current(another)).isEmpty();
  }

  @Test
  void explicitScheduleCanBeClearedWithoutLosingNotes() {
    var d = activate(List.of(contact));
    var scheduled =
        service
            .action(
                actor,
                d.campaign().id(),
                contact,
                new ActionInput(1, "NOTE", "Call later", Instant.now().plus(Duration.ofDays(2))))
            .detail();
    assertThat(scheduled.recipients().getFirst().state()).isEqualTo("WAITING");
    var cleared =
        service
            .action(
                actor,
                d.campaign().id(),
                contact,
                new ActionInput(
                    scheduled.recipients().getFirst().version(), "NOTE", "Keep my notes", null))
            .detail();
    assertThat(cleared.recipients().getFirst().state()).isEqualTo("PENDING");
    assertThat(cleared.recipients().getFirst().nextActionAt()).isNull();
    assertThat(cleared.recipients().getFirst().notes()).isEqualTo("Keep my notes");
    assertThat(action(cleared, contact, "PREPARE").whatsappUrl()).startsWith("https://wa.me/");
  }

  @Test
  void campaignTemplatesListsAndMutationsCannotCrossCompanyBoundary() {
    var d = draft(List.of(contact));
    service.template(
        actor,
        UUID.randomUUID().toString(),
        new TemplateInput("Private template", "Hello", "ACTIVE", 0));
    service.list(
        actor, UUID.randomUUID().toString(), new ListInput("Private list", List.of(contact), 0));
    long foreignMember =
        insert(
            "INSERT INTO user_companies(user_id,company_id,role,status)"
                + " VALUES(?,?,'user','active')",
            user,
            other);
    db.update(
        "INSERT INTO company_module_entitlements(company_id,module_slug,status,source)"
            + " VALUES(?,'crm','active','test')",
        other);
    db.update(
        "INSERT INTO user_company_module_roles(user_company_id,module_slug,role)"
            + " VALUES(?,'crm','user')",
        foreignMember);
    db.update(
        "INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key)"
            + " VALUES(?,'crm','contacts')",
        foreignMember);
    var foreignActor = new AuthSessionUser(user, other, "Same user, another company", "user");
    assertThat(service.list(foreignActor, "", "ALL", null, 1, 25, "updatedAt", "desc").items())
        .isEmpty();
    assertThat(service.templates(foreignActor)).isEmpty();
    assertThat(service.lists(foreignActor)).isEmpty();
    assertThatThrownBy(() -> service.get(foreignActor, d.campaign().id()))
        .hasMessageContaining("404");
    assertThatThrownBy(
            () -> service.state(foreignActor, d.campaign().id(), new StateInput(1, "ACTIVE")))
        .hasMessageContaining("404");
  }
}
