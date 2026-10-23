package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.*;
import com.indice.erp.auth.*;
import com.indice.erp.sales.conversations.whatsapp.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties={"app.sales-conversations.enabled=true","app.sales-conversations.onboarding-enabled=true","app.sales-conversations.ingress-enabled=true","app.sales-conversations.outbound-enabled=true","app.sales-conversations.worker-enabled=false","app.sales-conversations.app-id=synthetic-app","app.sales-conversations.app-secret=synthetic-app-secret","app.sales-conversations.verify-token=synthetic-verify-token","app.sales-conversations.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","logging.level.org.springframework.jdbc.core=INFO","app.email.enabled=false","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
class SalesConversationsIntegrationTest {
    @TestConfiguration static class TransportConfig {
        @Bean @Primary FakeCloud fakeCloud(){return new FakeCloud();}
        @Bean @Primary ConversationFakeStorage fakeStorage(){return new ConversationFakeStorage();}
        @Bean @Primary FakeMedia fakeMedia(){return new FakeMedia();}
        @Bean @Primary FakeOnboarding fakeOnboarding(){return new FakeOnboarding();}
    }
    static final byte[] PNG=Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6zaAAAAAASUVORK5CYII=");
    static class FakeMedia implements WhatsAppMediaTransport {
        public Content download(String id,String token,int max){return new Content("image/png",PNG.clone());}
    }
    static class FakeOnboarding implements WhatsAppOnboardingGateway {
        volatile VerifiedAssets assets;final AtomicInteger calls=new AtomicInteger();
        public boolean configured(){return true;}
        public VerifiedAssets exchangeAndVerify(String code){calls.incrementAndGet();if(!code.equals("synthetic-code"))throw new IllegalStateException("Never surface a code");return assets;}
    }
    static class FakeCloud implements WhatsAppCloudTransport {
        final AtomicInteger calls=new AtomicInteger();volatile boolean unknown;volatile Runnable during;volatile Submission last;
        public Outcome send(Submission s){last=s;calls.incrementAndGet();if(during!=null)during.run();return unknown?new Outcome("UNKNOWN",null,"SYNTHETIC_TIMEOUT"):new Outcome("ACCEPTED","wamid."+s.attemptId(),null);}
    }
    @Autowired JdbcTemplate db;@Autowired SalesConversationService service;@Autowired SalesConversationRepository repository;
    @Autowired WhatsAppConnectionService connections;@Autowired WhatsAppWebhookIngress ingress;@Autowired WhatsAppWebhookWorker inbound;
    @Autowired WhatsAppDispatchWorker dispatch;@Autowired WhatsAppOutboxRepository outbox;@Autowired WhatsAppCredentialCodec codec;
    @Autowired SalesConversationOwnerBridge bridge;
    @Autowired SalesConversationAccessReconciler reconciler;
    @Autowired ConversationFakeStorage storage;@Autowired FakeOnboarding onboardingProvider;@Autowired WhatsAppOnboardingService onboarding;
    @Autowired SalesConversationAttachmentService files;@Autowired SalesConversationAttachmentRepository fileRepository;@Autowired WhatsAppMediaWorker mediaWorker;
    @Autowired com.indice.erp.billing.storage.StorageQuotaService quota;@Autowired SalesConversationNotificationSource notices;
    @Autowired WhatsAppConnectionOperations operations;@Autowired WhatsAppOperationalMetrics metrics;@org.springframework.test.context.bean.override.mockito.MockitoSpyBean WhatsAppInboxRepository inboxRepository;
    @Autowired com.indice.erp.hr.users.HrUserService hr;@Autowired com.indice.erp.configcenter.users.ConfigCenterUserAccessUseCases configUsers;
    @Autowired FakeCloud cloud;@Autowired ObjectMapper json;@Autowired MockMvc mvc;@Autowired PlatformTransactionManager transactions;
    long company,other,user,member,sellerUser,sellerMember;String connection,waba,phone;
    AuthSessionUser admin,seller;TransactionTemplate tx;
    long insert(String sql,Object...args){var key=new GeneratedKeyHolder();db.update(c->{var s=c.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);return key.getKey().longValue();}
    @BeforeEach void setup(){
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        // This entire server is a verified disposable test database; prevent other synthetic tests' queued work leaking into transport counts.
        db.update("UPDATE sales_wa_outbox SET state='CANCELLED' WHERE state IN ('QUEUED','CLAIMED')");
        storage.failCopy=false;cloud.last=null;onboardingProvider.calls.set(0);cloud.calls.set(0);cloud.unknown=false;cloud.during=null;tx=new TransactionTemplate(transactions);
        company=insert("INSERT INTO companies(name) VALUES(?)","Synthetic inbox "+UUID.randomUUID());other=insert("INSERT INTO companies(name) VALUES(?)","Synthetic other "+UUID.randomUUID());
        user=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Inbox admin')",UUID.randomUUID()+"@example.com");
        member=member(user,company,"superadmin");admin=new AuthSessionUser(user,company,member,"Inbox admin","superadmin");
        quota.initializeCompany(company);entitlement(company);entitlement(other);member(user,other,"superadmin");
        sellerUser=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Inbox seller')",UUID.randomUUID()+"@example.com");sellerMember=member(sellerUser,company,"user");
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'crm','user')",sellerMember);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'crm','conversations',1)",sellerMember);
        seller=new AuthSessionUser(sellerUser,company,sellerMember,"Inbox seller","user");
        connection=UUID.randomUUID().toString();connections.setup(admin,connection);
        waba="200"+company;phone="100"+company;
        tx.executeWithoutResult(s->{repository.install(company,connection,"synthetic-app",waba,phone,"+14165550111",codec.encrypt(company,connection,"token","synthetic-token".getBytes(StandardCharsets.UTF_8)),"k1");});
        connections.grant(admin,connection,member,new Grant(EnumSet.allOf(Capability.class),true,0));
        connections.grant(admin,connection,sellerMember,new Grant(EnumSet.of(Capability.READ_OWN,Capability.TAKE,Capability.REPLY,Capability.NOTE,Capability.RESOLVE),true,0));
    }
    long member(long user,long company,String role){return insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,?,'active')",user,company,role);}
    void entitlement(long company){db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','synthetic-test')",company);}
    MockHttpSession session(){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,user);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,company);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Inbox admin");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    String signature(byte[] body)throws Exception {var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec("synthetic-app-secret".getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return "sha256="+HexFormat.of().formatHex(mac.doFinal(body));}
    byte[] envelope(String waba,String phone,String kind,List<Map<String,Object>> events)throws Exception{return json.writeValueAsBytes(Map.of("object","whatsapp_business_account","entry",List.of(Map.of("id",waba,"changes",List.of(Map.of("field","messages","value",Map.of("metadata",Map.of("phone_number_id",phone),kind,events)))))));}
    void receive(byte[] body)throws Exception{ingress.receive(body,signature(body));for(int i=0;i<100&&inbound.processOne();i++){} }
    Conversation incoming()throws Exception{
        receive(envelope(waba,phone,"messages",List.of(Map.of("id","wamid.in."+UUID.randomUUID(),"from","14165550110","timestamp",Long.toString(Instant.now().getEpochSecond()),"type","text","text",Map.of("body","Synthetic customer question")))));
        return service.list(admin,"ALL","",1,25).items().getFirst();
    }
    Conversation take(AuthSessionUser a,Conversation c){service.command(a,c.id(),new Command(UUID.randomUUID().toString(),c.version(),"TAKE",null));return repository.find(company,c.id()).orElseThrow();}
    Receipt queue(AuthSessionUser a,Conversation c){return service.text(a,c.id(),new Text(UUID.randomUUID().toString(),c.version(),"Synthetic human answer"),false);}
    void dispatchAll(){for(int i=0;i<100&&dispatch.processOne();i++){} }
    int count(String table,String where,Object... args){return db.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE "+where,Integer.class,args);}
    @Test void deniesSessionCsrfDemoAndChannelNonmembers()throws Exception{
        mvc.perform(get("/api/v1/sales/conversations")).andExpect(status().isUnauthorized());
        var c=incoming();mvc.perform(post("/api/v1/sales/conversations/"+c.id()+"/commands").session(session()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(new Command(UUID.randomUUID().toString(),c.version(),"TAKE",null)))).andExpect(status().isForbidden());
        var s=session();s.setAttribute(SessionAuthService.SESSION_PUBLIC_DEMO,true);s.setAttribute(SessionAuthService.SESSION_PUBLIC_DEMO_EXPIRES_AT,Instant.now().plusSeconds(600));mvc.perform(get("/api/v1/sales/conversations").session(s)).andExpect(status().isForbidden());
        connections.grant(admin,connection,sellerMember,new Grant(Set.of(),false,1));
        assertThatThrownBy(()->service.list(seller,"ALL","",1,25)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void sameGlobalUserInAnotherTenantCannotReadOrMutateChat()throws Exception{
        var c=incoming();var foreign=new AuthSessionUser(user,other,"same global actor","superadmin");
        assertThatThrownBy(()->service.timeline(foreign,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.command(foreign,c.id(),new Command(UUID.randomUUID().toString(),c.version(),"TAKE",null))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void managerWithoutGrantDoesNotInheritHistory()throws Exception{
        incoming();connections.grant(admin,connection,member,new Grant(Set.of(),false,1));
        assertThat(connections.context(admin).canManage()).isTrue();
        assertThatThrownBy(()->service.list(admin,"ALL","",1,25)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void databaseEnforcesOneOperationalNumberPerTenantAndProviderPhoneUniqueness(){
        assertThatThrownBy(()->connections.setup(admin,UUID.randomUUID().toString())).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->db.update("INSERT INTO sales_wa_connections(company_id,id,app_id,waba_id,phone_number_id,display_phone,created_by_membership) VALUES(?,?,'synthetic-app',?,?,?,?)",other,UUID.randomUUID().toString(),waba,phone,"+14165550111",member)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void validRawSignatureCommitsBeforeAckAndDuplicatesDoNotDuplicateMessages()throws Exception{
        var body=envelope(waba,phone,"messages",List.of(Map.of("id","wamid.dedupe."+company,"from","14165550110","timestamp",Long.toString(Instant.now().getEpochSecond()),"type","text","text",Map.of("body","Only once"))));
        for(int i=0;i<100;i++)ingress.receive(body,signature(body));assertThat(count("sales_wa_inbox","company_id=?",company)).isEqualTo(1);
        while(inbound.processOne()){};assertThat(count("sales_conversation_messages","company_id=?",company)).isEqualTo(1);
        assertThat(count("sales_contacts","company_id=?",company)).isZero();assertThat(count("sales_opportunities","company_id=?",company)).isZero();
    }
    @Test void tamperingMissingSignatureAndUnknownRouteNeverCreateTenantData()throws Exception{
        var body=envelope(waba,phone,"messages",List.of());
        assertThatThrownBy(()->ingress.receive(body,null)).isInstanceOf(ResponseStatusException.class);
        var modified=Arrays.copyOf(body,body.length+1);modified[modified.length-1]=' ';
        assertThatThrownBy(()->ingress.receive(modified,signature(body))).isInstanceOf(ResponseStatusException.class);
        receive(envelope("unknown",phone,"messages",List.of()));assertThat(count("sales_wa_inbox","company_id=?",company)).isZero();
    }
    @Test void claimHasOneWinnerAmongFiftyConcurrentSellers()throws Exception{
        var c=incoming();var pool=Executors.newFixedThreadPool(16);var winners=new AtomicInteger();var conflicts=new AtomicInteger();
        try{var jobs=new ArrayList<Future<?>>();for(int i=0;i<50;i++){var a=i%2==0?admin:seller;jobs.add(pool.submit(()->{try{service.command(a,c.id(),new Command(UUID.randomUUID().toString(),c.version(),"TAKE",null));winners.incrementAndGet();}catch(ResponseStatusException e){assertThat(e.getStatusCode().value()).isEqualTo(409);conflicts.incrementAndGet();}}));}for(var job:jobs)job.get(40,TimeUnit.SECONDS);}finally{pool.shutdownNow();}
        assertThat(winners.get()).isEqualTo(1);assertThat(conflicts.get()).isEqualTo(49);assertThat(count("sales_conversation_events","company_id=? AND event_type='TAKE'",company)).isEqualTo(1);
    }
    @Test void requestReplayReturnsReceiptButChangedFingerprintConflicts()throws Exception{
        var c=incoming();var input=new Command(UUID.randomUUID().toString(),c.version(),"TAKE",null);
        var first=service.command(admin,c.id(),input);assertThat(service.command(admin,c.id(),input)).isEqualTo(first);
        assertThatThrownBy(()->service.command(admin,c.id(),new Command(input.requestKey(),input.version(),"RESOLVE",null))).isInstanceOf(ResponseStatusException.class);
        var current=repository.find(company,c.id()).orElseThrow();var text=new Text(UUID.randomUUID().toString(),current.version(),"One outgoing intent");
        var message=service.text(admin,c.id(),text,false);assertThat(service.text(admin,c.id(),text,false)).isEqualTo(message);assertThat(count("sales_wa_outbox","company_id=?",company)).isEqualTo(1);
    }
    @Test void onlyOwnerCanReplyAndNotesNeverReachTransport()throws Exception{
        var c=take(seller,incoming());final var current=c;
        assertThatThrownBy(()->queue(admin,current)).isInstanceOf(ResponseStatusException.class);
        service.text(admin,c.id(),new Text(UUID.randomUUID().toString(),c.version(),"Private internal note"),true);dispatchAll();
        assertThat(count("sales_conversation_notes","company_id=?",company)).isEqualTo(1);assertThat(cloud.calls.get()).isZero();assertThat(count("sales_wa_outbox","company_id=?",company)).isZero();
    }
    @Test void customerReopensResolvedChatWithoutChangingOwner()throws Exception{
        var c=take(seller,incoming());service.command(seller,c.id(),new Command(UUID.randomUUID().toString(),c.version(),"RESOLVE",null));
        var next=incoming();assertThat(next.status()).isEqualTo("OPEN");assertThat(next.assigneeMembershipId()).isEqualTo(sellerMember);assertThat(count("sales_conversation_events","company_id=? AND event_type='CUSTOMER_REOPENED'",company)).isEqualTo(1);
    }
    @Test void unknownOutcomeIsDurableAndNeverAutomaticallyRetried()throws Exception{
        var c=take(admin,incoming());var sent=queue(admin,c);cloud.unknown=true;dispatchAll();dispatchAll();
        assertThat(cloud.calls.get()).isEqualTo(1);assertThat(db.queryForObject("SELECT dispatch_state FROM sales_conversation_messages WHERE company_id=? AND id=?",String.class,company,sent.id())).isEqualTo("UNKNOWN");
    }
    @Test void expiredWindowAtDispatchCancelsWithoutProviderCall()throws Exception{
        var c=take(admin,incoming());queue(admin,c);db.update("UPDATE sales_conversations SET last_inbound_at=TIMESTAMPADD(HOUR,-25,CURRENT_TIMESTAMP(6)) WHERE company_id=? AND id=?",company,c.id());dispatchAll();assertThat(cloud.calls.get()).isZero();
        var closed=repository.find(company,c.id()).orElseThrow();assertThatThrownBy(()->queue(admin,closed)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void revocationBeforeDispatchDeniesReadsAndCancelsQueue()throws Exception{
        var c=take(seller,incoming());queue(seller,c);db.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND id=?",company,sellerMember);
        assertThatThrownBy(()->service.timeline(seller,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);dispatchAll();assertThat(cloud.calls.get()).isZero();
    }
    @Test void revocationDuringProviderCallStillPersistsAcceptance()throws Exception{
        var c=take(seller,incoming());var sent=queue(seller,c);cloud.during=()->db.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND id=?",company,sellerMember);dispatchAll();
        assertThat(db.queryForObject("SELECT dispatch_state FROM sales_conversation_messages WHERE company_id=? AND id=?",String.class,company,sent.id())).isEqualTo("ACCEPTED");
        assertThatThrownBy(()->service.timeline(seller,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void submittingExpiryBecomesUnknownAndLateAcceptanceSurvivesFence()throws Exception{
        var c=take(admin,incoming());queue(admin,c);var j=tx.execute(s->outbox.claim()).orElseThrow();assertThat(dispatch.prepare(j)).isPresent();
        db.update("UPDATE sales_wa_outbox SET lease_until=TIMESTAMPADD(SECOND,-1,CURRENT_TIMESTAMP(6)),fence=fence+1 WHERE company_id=? AND message_id=?",company,j.message());dispatch.recover();
        dispatch.finish(j,new WhatsAppCloudTransport.Outcome("ACCEPTED","wamid.late."+company,null));
        assertThat(db.queryForObject("SELECT state FROM sales_wa_outbox WHERE company_id=? AND message_id=?",String.class,company,j.message())).isEqualTo("ACCEPTED");
        assertThat(count("sales_wa_dispatch_evidence","company_id=?",company)).isEqualTo(2);assertThat(cloud.calls.get()).isZero();
    }
    @Test void earlyAndOutOfOrderReceiptsRemainTruthWithoutNewMessage()throws Exception{
        var c=take(admin,incoming());queue(admin,c);var j=tx.execute(s->outbox.claim()).orElseThrow();assertThat(dispatch.prepare(j)).isPresent();String wamid="wamid.early."+company;
        long cursor=repository.find(company,c.id()).orElseThrow().changeSeq();
        for(String status:List.of("read","delivered","sent"))receive(envelope(waba,phone,"statuses",List.of(Map.of("id",wamid,"status",status,"timestamp",Long.toString(Instant.now().getEpochSecond())))));
        dispatch.finish(j,new WhatsAppCloudTransport.Outcome("ACCEPTED",wamid,null));var timeline=service.timeline(admin,c.id(),cursor,null);
        var message=timeline.messages().stream().filter(m->m.id().equals(j.message())).findFirst().orElseThrow();assertThat(message.readAt()).isNotNull();assertThat(message.deliveredAt()).isNotNull();assertThat(message.sentAt()).isNotNull();assertThat(timeline.cursor()).isGreaterThan(cursor);
    }
    @Test void encryptedContentCannotMoveAcrossTenantsOrPurposeAndApiOmitsSecrets()throws Exception{
        String encrypted=codec.encrypt(company,connection,"token","synthetic-value".getBytes(StandardCharsets.UTF_8));
        assertThatThrownBy(()->codec.decrypt(other,connection,"token",encrypted)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->codec.decrypt(company,connection,"inbox",encrypted)).isInstanceOf(IllegalStateException.class);
        assertThat(json.writeValueAsString(connections.context(admin))).doesNotContain("synthetic-token","ciphertext","credential","app-secret");
    }

    @Test void crmCreationAndLinkingUseNativeOwnersAndIdempotentReceipts()throws Exception{
        var c=incoming();var input=new SalesConversationOwnerBridge.ContactInput(UUID.randomUUID().toString(),c.version(),"Synthetic contact","Synthetic client","contact@example.com");
        var first=bridge.contact(admin,c.id(),input);assertThat(bridge.contact(admin,c.id(),input)).isEqualTo(first);
        assertThat(count("sales_contacts","company_id=?",company)).isEqualTo(1);
        var next=repository.find(company,c.id()).orElseThrow();assertThat(next.contactId()).isEqualTo(Long.parseLong(first.id()));
        var opportunity=bridge.opportunity(admin,c.id(),new SalesConversationOwnerBridge.OpportunityInput(UUID.randomUUID().toString(),next.version(),next.contactId(),"Synthetic opportunity",null,null,"MXN",new java.math.BigDecimal("100.00")));
        assertThat(count("sales_opportunities","company_id=?",company)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT assigned_flow_id FROM sales_opportunities WHERE company_id=? AND id=?",Long.class,company,Long.parseLong(opportunity.id()))).isPositive();
        var current=repository.find(company,c.id()).orElseThrow();service.command(admin,c.id(),new Command(UUID.randomUUID().toString(),current.version(),"TAKE",null));current=repository.find(company,c.id()).orElseThrow();
        service.command(admin,c.id(),new Command(UUID.randomUUID().toString(),current.version(),"TRANSFER",sellerMember));
        assertThat(db.queryForObject("SELECT owner_user_company_id FROM sales_opportunities WHERE company_id=? AND id=?",Long.class,company,Long.parseLong(opportunity.id()))).isEqualTo(member);
    }
    @Test void crmForeignInactiveAndIncompatibleContactsAreNotRevived()throws Exception{
        var c=incoming();long foreign=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,status) VALUES(?,'FOREIGN','Foreign','active')",other);
        assertThatThrownBy(()->bridge.link(admin,c.id(),new SalesConversationOwnerBridge.Link(UUID.randomUUID().toString(),c.version(),foreign,null))).isInstanceOf(ResponseStatusException.class);
        long inactive=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,status) VALUES(?,'INACTIVE','Inactive','inactive')",company);
        assertThatThrownBy(()->bridge.link(admin,c.id(),new SalesConversationOwnerBridge.Link(UUID.randomUUID().toString(),c.version(),inactive,null))).isInstanceOf(ResponseStatusException.class);
        assertThat(count("sales_conversation_commands","company_id=?",company)).isZero();
    }
    @Test void followUpCreatesActualTaskOnlyWithNativePermissionAndKeepsRetryStable()throws Exception{
        var c=incoming();assertThat(bridge.tasks(admin,c.id()).allowed()).isFalse();
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'processes','active','synthetic-test')",company);
        var input=new SalesConversationOwnerBridge.TaskInput(UUID.randomUUID().toString(),c.version(),member,"Synthetic follow-up",java.time.LocalDate.now().plusDays(1));
        var task=bridge.task(admin,c.id(),input);assertThat(bridge.task(admin,c.id(),input)).isEqualTo(task);
        assertThat(count("process_tasks","company_id=?",company)).isEqualTo(1);assertThat(count("sales_conversation_tasks","company_id=?",company)).isEqualTo(1);
        assertThat(bridge.tasks(admin,c.id()).tasks()).hasSize(1);assertThat(db.queryForObject("SELECT assigned_user_company_id FROM process_tasks WHERE company_id=? AND id=?",Long.class,company,Long.parseLong(task.id()))).isEqualTo(member);
    }
    @Test void losingNativeTabOrChangingUnitImmediatelyDeniesAndRequeuesWithoutErasingHistory()throws Exception{
        var c=take(seller,incoming());queue(seller,c);db.update("UPDATE user_company_tab_permissions SET can_view=0 WHERE user_company_id=? AND tab_key='conversations'",sellerMember);
        assertThatThrownBy(()->service.timeline(seller,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);reconciler.reconcile(company,connection);
        assertThat(repository.find(company,c.id()).orElseThrow().assigneeMembershipId()).isNull();assertThat(count("sales_conversation_messages","company_id=?",company)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT state FROM sales_wa_outbox WHERE company_id=?",String.class,company)).isEqualTo("CANCELLED");
        long unit=insert("INSERT INTO units(company_id,name) VALUES(?,'Restricted synthetic unit')",company);
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id) VALUES(?,?,?,?)",company,sellerMember,sellerUser,unit);
        db.update("UPDATE user_company_tab_permissions SET can_view=1 WHERE user_company_id=? AND tab_key='conversations'",sellerMember);
        assertThatThrownBy(()->connections.grant(admin,connection,sellerMember,new Grant(EnumSet.of(Capability.READ_OWN,Capability.TAKE),true,2))).isInstanceOf(ResponseStatusException.class);
    }

    @Test void rawHttpChallengeAndSignedPostUseSeparateTrust()throws Exception{
        mvc.perform(get("/api/public/sales/whatsapp/webhook").param("hub.mode","subscribe").param("hub.verify_token","synthetic-verify-token").param("hub.challenge","123456")).andExpect(status().isOk()).andExpect(content().string("123456"));
        var raw=envelope(waba,phone,"messages",List.of(Map.of("id","wamid.http."+company,"from","14165550110","timestamp",Long.toString(Instant.now().getEpochSecond()),"type","text","text",Map.of("body","Signed synthetic HTTP"))));
        mvc.perform(post("/api/public/sales/whatsapp/webhook").contentType(MediaType.APPLICATION_JSON).content(raw)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/public/sales/whatsapp/webhook").header("X-Hub-Signature-256",signature(raw)).contentType(MediaType.APPLICATION_JSON).content(raw)).andExpect(status().isOk());
        assertThat(count("sales_wa_inbox","company_id=?",company)).isEqualTo(1);
        mvc.perform(post("/api/public/sales/whatsapp/webhook").header("X-Hub-Signature-256",signature(raw)).content(new byte[524289])).andExpect(status().isPayloadTooLarge());
        assertThat(metrics.invalidSignatureCount()).isPositive();
    }
    @Test void oldHistoryUsesStableKeysetWithoutLosingEqualTimestampRows()throws Exception{
        var c=take(admin,incoming());
        tx.executeWithoutResult(s->{repository.lock(company);for(int i=0;i<250;i++){long seq=repository.event(company,connection,c.id(),member,"INTERNAL_NOTE",null,null);repository.note(company,UUID.randomUUID().toString(),c.id(),member,"History "+i,seq);}db.update("UPDATE sales_conversation_notes SET created_at='2026-01-01 00:00:00' WHERE company_id=?",company);});
        var initial=service.timeline(admin,c.id(),0,null);assertThat(initial.hasEarlier()).isTrue();var ids=new HashSet<String>();initial.notes().forEach(n->ids.add(n.id()));String cursor=initial.notes().stream().map(Note::id).min(String::compareTo).orElseThrow();
        for(int i=0;i<3;i++){var older=service.history(admin,c.id(),null,cursor,null);if(older.notes().isEmpty())break;older.notes().forEach(n->assertThat(ids.add(n.id())).isTrue());cursor=older.notes().stream().map(Note::id).min(String::compareTo).orElseThrow();}
        assertThat(ids).hasSize(250);assertThatThrownBy(()->service.history(admin,c.id(),null,UUID.randomUUID().toString(),null)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void privateImmutableAttachmentRetriesAndRevocationAreEnforced()throws Exception{
        var c=take(admin,incoming());String request=UUID.randomUUID().toString();var input=new SalesConversationAttachmentService.Upload(request,"proof.png","image/png",PNG.length);
        var upload=files.prepare(admin,c.id(),input);assertThat(files.prepare(admin,c.id(),input).id()).isEqualTo(upload.id());var staged=fileRepository.find(company,upload.id()).orElseThrow();
        storage.writeObject("synthetic",staged.uploadKey(),"image/png",PNG);files.finalizeUpload(admin,c.id(),upload.id());
        storage.writeObject("synthetic",staged.uploadKey(),"image/png","changed staging".getBytes(StandardCharsets.UTF_8));
        assertThat(files.finalizeUpload(admin,c.id(),upload.id()).state()).isEqualTo("READY");
        assertThatThrownBy(()->files.download(admin,c.id(),upload.id())).isInstanceOf(ResponseStatusException.class);
        var text=new Text(UUID.randomUUID().toString(),c.version(),"Synthetic caption",List.of(upload.id()));var message=service.text(admin,c.id(),text,false);assertThat(service.text(admin,c.id(),text,false)).isEqualTo(message);
        assertThat(files.download(admin,c.id(),upload.id()).bytes()).isEqualTo(PNG);dispatchAll();assertThat(cloud.last.media().bytes()).isEqualTo(PNG);
        var current=repository.find(company,c.id()).orElseThrow();assertThatThrownBy(()->service.text(admin,c.id(),new Text(UUID.randomUUID().toString(),current.version(),"No note file",List.of(upload.id())),true)).isInstanceOf(ResponseStatusException.class);
        connections.grant(admin,connection,member,new Grant(Set.of(),false,1));assertThatThrownBy(()->files.download(admin,c.id(),upload.id())).isInstanceOf(ResponseStatusException.class);
        assertThat(count("sales_conversation_messages","company_id=?",company)).isEqualTo(2);
    }
    @Test void invalidFilesQuotaFailureAndStorageFailureLeaveNoReadyFileOrCharge()throws Exception{
        var c=take(admin,incoming());var input=new SalesConversationAttachmentService.Upload(UUID.randomUUID().toString(),"fake.png","image/png",4);
        var upload=files.prepare(admin,c.id(),input);var row=fileRepository.find(company,upload.id()).orElseThrow();storage.writeObject("synthetic",row.uploadKey(),"image/png",new byte[]{1,2,3,4});int before=storage.objects.size();
        assertThatThrownBy(()->files.finalizeUpload(admin,c.id(),upload.id())).isInstanceOf(ResponseStatusException.class);assertThat(storage.objects).hasSize(before);assertThat(fileRepository.find(company,upload.id()).orElseThrow().state()).isEqualTo("STAGING");
        db.update("UPDATE company_storage_states SET included_bytes=reserved_bytes+used_bytes WHERE company_id=?",company);
        assertThatThrownBy(()->files.prepare(admin,c.id(),new SalesConversationAttachmentService.Upload(UUID.randomUUID().toString(),"proof.png","image/png",PNG.length))).isInstanceOf(IllegalStateException.class);
        assertThat(db.queryForObject("SELECT purchased_blocks FROM company_storage_states WHERE company_id=?",Integer.class,company)).isZero();
        assertThatThrownBy(()->files.prepare(admin,c.id(),new SalesConversationAttachmentService.Upload(UUID.randomUUID().toString(),"large.pdf","application/pdf",8*1024*1024+1L))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void inboundMediaRemainsPrivateAndStaleFencesCannotPublish()throws Exception{
        String hash=SalesConversationService.hash(PNG);receive(envelope(waba,phone,"messages",List.of(Map.of("id","wamid.media."+company,"from","14165550110","timestamp",Long.toString(Instant.now().getEpochSecond()),"type","image","image",Map.of("id","12345678","mime_type","image/png","sha256",hash)))));
        var c=service.list(admin,"ALL","",1,25).items().getFirst();
        db.update("UPDATE sales_conversation_attachments SET state='REJECTED' WHERE company_id<>? AND state IN ('PENDING','CLAIMED')",company);
        var claim=tx.execute(s->fileRepository.claim().orElseThrow());
        db.update("UPDATE sales_conversation_attachments SET fence=fence+1 WHERE company_id=? AND id=?",company,claim.id());
        int before=storage.objects.size();assertThatThrownBy(()->tx.executeWithoutResult(s->files.storeInbound(claim,PNG,"image/png"))).isInstanceOf(ResponseStatusException.class);assertThat(storage.objects).hasSize(before);
        db.update("UPDATE sales_conversation_attachments SET lease_until=TIMESTAMPADD(SECOND,-1,CURRENT_TIMESTAMP(6)) WHERE company_id=?",company);assertThat(mediaWorker.processOne()).isTrue();
        var timeline=service.timeline(admin,c.id(),0,null);var attachment=timeline.messages().getFirst().attachments().getFirst();assertThat(attachment.state()).isEqualTo("READY");assertThat(files.download(admin,c.id(),attachment.id()).bytes()).isEqualTo(PNG);
    }
    @Test void notificationsAreDurableGenericAndDoNotResurrectDismissedOrRevoked()throws Exception{
        var c=incoming();notices.deliverPending();
        var seq=service.timeline(admin,c.id(),0,null).events().stream().filter(e->e.type().equals("CUSTOMER_MESSAGE")).findFirst().orElseThrow().seq();
        assertThat(notices.visible(admin,"sales_conversation_activity",seq,"sales_conversation_activity")).isTrue();
        assertThat(db.queryForList("SELECT title,description FROM app_notifications WHERE company_id=? AND source_type='sales_conversation_activity'",company).toString()).doesNotContain("1416555","Synthetic customer question");
        db.update("UPDATE app_notifications SET dismissed_at=CURRENT_TIMESTAMP(6) WHERE company_id=?",company);
        db.update("UPDATE sales_conversation_notification_outbox SET delivered_at=NULL WHERE company_id=?",company);notices.deliverPending();assertThat(count("app_notifications","company_id=? AND dismissed_at IS NULL",company)).isZero();
        service.command(admin,c.id(),new Command(UUID.randomUUID().toString(),c.version(),"READ",null,c.changeSeq()));assertThat(notices.visible(admin,"sales_conversation_activity",seq,"sales_conversation_activity")).isFalse();
        connections.grant(admin,connection,member,new Grant(Set.of(),false,1));assertThat(notices.visible(admin,"sales_conversation_activity",seq,"sales_conversation_activity")).isFalse();
    }
    @Test void explicitRevocationReleasesAssignmentAndCancelsOnlyUnstartedWork()throws Exception{
        var c=take(seller,incoming());var reply=queue(seller,c);connections.grant(admin,connection,sellerMember,new Grant(Set.of(),false,1));
        assertThat(repository.find(company,c.id()).orElseThrow().assigneeMembershipId()).isNull();assertThat(db.queryForObject("SELECT state FROM sales_wa_outbox WHERE company_id=? AND message_id=?",String.class,company,reply.id())).isEqualTo("CANCELLED");
        take(admin,repository.find(company,c.id()).orElseThrow());assertThat(count("sales_conversation_events","company_id=? AND event_type='ASSIGNEE_RELEASED'",company)).isEqualTo(1);
    }
    @Test void actualHrAndConfigCenterDeactivationPathsDenyThenReconcile()throws Exception{
        var c=take(seller,incoming());queue(seller,c);db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id) VALUES(?,?,?)",company,sellerMember,sellerUser);
        hr.deleteUser(admin,sellerMember);assertThatThrownBy(()->service.timeline(seller,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);reconciler.reconcile(company,connection);assertThat(repository.find(company,c.id()).orElseThrow().assigneeMembershipId()).isNull();
        long user2=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Second native employee')",UUID.randomUUID()+"@example.com");long member2=member(user2,company,"user");
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'crm','user')",member2);db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'crm','conversations',1)",member2);
        connections.grant(admin,connection,member2,new Grant(EnumSet.of(Capability.READ_OWN,Capability.TAKE,Capability.REPLY),true,0));var a2=new AuthSessionUser(user2,company,member2,"Second native employee","user");take(a2,repository.find(company,c.id()).orElseThrow());
        configUsers.deleteUser(company,user,"superadmin",user2);assertThatThrownBy(()->service.timeline(a2,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);reconciler.reconcile(company,connection);assertThat(repository.find(company,c.id()).orElseThrow().assigneeMembershipId()).isNull();
    }
    @Test void optOutStopsBothQueueAndDispatchAndUsesExistingSuppressionOwner()throws Exception{
        var c=take(admin,incoming());var queued=queue(admin,c);c=repository.find(company,c.id()).orElseThrow();service.command(admin,c.id(),new Command(UUID.randomUUID().toString(),c.version(),"OPT_OUT",null));
        var current=repository.find(company,c.id()).orElseThrow();assertThatThrownBy(()->queue(admin,current)).isInstanceOf(ResponseStatusException.class);dispatchAll();assertThat(cloud.calls).hasValue(0);assertThat(db.queryForObject("SELECT state FROM sales_wa_outbox WHERE company_id=? AND message_id=?",String.class,company,queued.id())).isEqualTo("CANCELLED");
    }
    @Test void onboardingStateIsSessionBoundSingleUseAndForbidsNumberReplacement(){
        operations.control(admin,connection,new WhatsAppConnectionOperations.Control(UUID.randomUUID().toString(),repository.connection(company,connection).orElseThrow().version(),"SUSPEND",null));
        onboardingProvider.assets=new WhatsAppOnboardingGateway.VerifiedAssets("synthetic-app","90001",waba,phone,"+14165550111","fixture-verified-token");
        var start=onboarding.start(admin,connection,"fixture-session");
        assertThatThrownBy(()->onboarding.complete(admin,connection,"another-session",new WhatsAppOnboardingService.Callback(start.state(),"synthetic-code"))).isInstanceOf(ResponseStatusException.class);assertThat(onboardingProvider.calls).hasValue(0);
        assertThat(onboarding.complete(admin,connection,"fixture-session",new WhatsAppOnboardingService.Callback(start.state(),"synthetic-code")).status()).isEqualTo("CONNECTED");
        assertThatThrownBy(()->onboarding.complete(admin,connection,"fixture-session",new WhatsAppOnboardingService.Callback(start.state(),"synthetic-code"))).isInstanceOf(ResponseStatusException.class);assertThat(onboardingProvider.calls).hasValue(1);
        operations.control(admin,connection,new WhatsAppConnectionOperations.Control(UUID.randomUUID().toString(),repository.connection(company,connection).orElseThrow().version(),"SUSPEND",null));
        var replace=onboarding.start(admin,connection,"fixture-session");onboardingProvider.assets=new WhatsAppOnboardingGateway.VerifiedAssets("synthetic-app","90001",waba,"123456999","+14165550111","fixture-verified-token");
        assertThatThrownBy(()->onboarding.complete(admin,connection,"fixture-session",new WhatsAppOnboardingService.Callback(replace.state(),"synthetic-code"))).isInstanceOf(ResponseStatusException.class);assertThat(repository.connection(company,connection).orElseThrow().status()).isEqualTo("RECONNECT_REQUIRED");
    }
    @Test void localDisconnectPreservesHistoryAndAuditedDeadLetterRedriveIsIdempotent()throws Exception{
        var c=take(admin,incoming());queue(admin,c);
        var job=tx.execute(s->{inboxRepository.insert(new WhatsAppInboxRepository.Route(company,connection),SalesConversationService.hash("broken"),codec.encrypt(company,connection,"inbox","broken".getBytes(StandardCharsets.UTF_8)));return inboxRepository.next().orElseThrow();});
        db.update("UPDATE sales_wa_inbox SET state='DEAD' WHERE company_id=? AND id=?",company,job.id());var version=repository.connection(company,connection).orElseThrow().version();
        var redrive=new WhatsAppConnectionOperations.Control(UUID.randomUUID().toString(),version,"REDRIVE",job.id());operations.control(admin,connection,redrive);operations.control(admin,connection,redrive);assertThat(count("sales_conversation_events","company_id=? AND event_type='CONNECTION_REDRIVE'",company)).isEqualTo(1);
        operations.control(admin,connection,new WhatsAppConnectionOperations.Control(UUID.randomUUID().toString(),version,"DISCONNECT",null));assertThat(repository.connection(company,connection).orElseThrow().status()).isEqualTo("REVOKED");assertThat(count("sales_conversation_messages","company_id=?",company)).isEqualTo(2);assertThatThrownBy(()->service.timeline(admin,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);
        assertThat(db.queryForObject("SELECT credential_ciphertext FROM sales_wa_connections WHERE company_id=? AND id=?",String.class,company,connection)).isNull();
    }
    @Test void durableIngressRollsBackAllEventsIfDatabaseFailsBeforeAcknowledgement()throws Exception{
        var raw=envelope(waba,phone,"messages",List.of(Map.of("id","wamid.rollback.one."+company),Map.of("id","wamid.rollback.two."+company)));
        var inserts=new AtomicInteger();org.mockito.Mockito.doAnswer(invocation->{if(inserts.incrementAndGet()==2)throw new org.springframework.dao.TransientDataAccessResourceException("Synthetic DB unavailable");return invocation.callRealMethod();}).when(inboxRepository).insert(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString());
        try{assertThatThrownBy(()->ingress.receive(raw,signature(raw))).isInstanceOf(org.springframework.dao.TransientDataAccessResourceException.class);assertThat(count("sales_wa_inbox","company_id=?",company)).isZero();}
        finally{org.mockito.Mockito.reset(inboxRepository);}
        ingress.receive(raw,signature(raw));assertThat(count("sales_wa_inbox","company_id=?",company)).isEqualTo(2);
    }
    @Test void concurrentCrmIntentHasOneOwnerRecordAndForeignFlowRollsBack()throws Exception{
        var c=incoming();var input=new SalesConversationOwnerBridge.ContactInput(UUID.randomUUID().toString(),c.version(),"One concurrent client","Business","fixture@example.com");
        var pool=Executors.newFixedThreadPool(8);try{var jobs=new ArrayList<Future<Receipt>>();for(int i=0;i<12;i++)jobs.add(pool.submit(()->bridge.contact(admin,c.id(),input)));var first=jobs.getFirst().get();for(var job:jobs)assertThat(job.get(20,TimeUnit.SECONDS)).isEqualTo(first);}finally{pool.shutdownNow();}
        assertThat(count("sales_contacts","company_id=?",company)).isEqualTo(1);
        var current=repository.find(company,c.id()).orElseThrow();assertThatThrownBy(()->bridge.opportunity(admin,c.id(),new SalesConversationOwnerBridge.OpportunityInput(UUID.randomUUID().toString(),current.version(),current.contactId(),"Invalid foreign flow",Long.MAX_VALUE,"new","CAD",java.math.BigDecimal.TEN))).isInstanceOf(RuntimeException.class);
        assertThat(count("sales_opportunities","company_id=?",company)).isZero();assertThat(repository.find(company,c.id()).orElseThrow().opportunityId()).isNull();
    }
    @Test void twoDispatchWorkersDoNotDuplicate()throws Exception{
        var c=take(admin,incoming());queue(admin,c);var pool=Executors.newFixedThreadPool(2);try{var one=pool.submit(()->dispatch.processOne());var two=pool.submit(()->dispatch.processOne());one.get(20,TimeUnit.SECONDS);two.get(20,TimeUnit.SECONDS);}finally{pool.shutdownNow();}assertThat(cloud.calls).hasValue(1);
        assertThat(count("sales_wa_dispatch_evidence","company_id=? AND outcome='ACCEPTED'",company)).isEqualTo(1);
    }
    @Test void narrowedUnitCannotReadCorporateHistoryOrForgeMemberGrantsOrMetrics()throws Exception{
        var c=incoming();long unit=insert("INSERT INTO units(company_id,name) VALUES(?,'Synthetic unit')",company);db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id) VALUES(?,?,?,?)",company,sellerMember,sellerUser,unit);
        assertThatThrownBy(()->service.list(seller,"MINE","",1,25)).isInstanceOf(ResponseStatusException.class);assertThatThrownBy(()->service.timeline(seller,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);assertThatThrownBy(()->metrics.forManager(seller,connection)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->connections.grant(admin,connection,sellerMember,new Grant(EnumSet.allOf(Capability.class),true,1))).isInstanceOf(ResponseStatusException.class);
    }

    @Test void oneSignedEnvelopeRoutesEveryEntryToItsRegisteredTenant()throws Exception{
        String otherConnection=UUID.randomUUID().toString(),otherPhone="100"+other,otherWaba="200"+other;var otherActor=new AuthSessionUser(user,other,"Synthetic second tenant","superadmin");connections.setup(otherActor,otherConnection);
        tx.executeWithoutResult(s->repository.install(other,otherConnection,"synthetic-app",otherWaba,otherPhone,"+14165550112",codec.encrypt(other,otherConnection,"token","synthetic-token".getBytes(StandardCharsets.UTF_8)),"k1"));
        var message=Map.<String,Object>of("id","wamid.multi.shared","from","14165550110","timestamp",Long.toString(Instant.now().getEpochSecond()),"type","text","text",Map.of("body","Tenant-isolated synthetic question"));
        var first=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree(envelope(waba,phone,"messages",List.of(message)));var second=json.readTree(envelope(otherWaba,otherPhone,"messages",List.of(message)));((com.fasterxml.jackson.databind.node.ArrayNode)first.path("entry")).add(second.path("entry").get(0));receive(json.writeValueAsBytes(first));
        assertThat(count("sales_conversation_messages","company_id=?",company)).isEqualTo(1);assertThat(count("sales_conversation_messages","company_id=?",other)).isEqualTo(1);var ours=service.list(admin,"ALL","",1,25).items().getFirst();assertThat(count("sales_conversations","company_id=? AND id=?",other,ours.id())).isZero();
    }
    @Test void senderSnapshotMismatchCancelsWithoutCallingTheProvider()throws Exception{
        var c=take(admin,incoming());var reply=queue(admin,c);db.update("UPDATE sales_conversation_messages SET sender_snapshot='99999999' WHERE company_id=? AND id=?",company,reply.id());dispatchAll();assertThat(cloud.calls).hasValue(0);assertThat(db.queryForObject("SELECT state FROM sales_wa_outbox WHERE company_id=? AND message_id=?",String.class,company,reply.id())).isEqualTo("CANCELLED");
    }

    @Test void reducedCapacityAtCommitNeverExpandsBillingAndRollsBackTheCopiedFile()throws Exception{
        var c=take(admin,incoming());var upload=files.prepare(admin,c.id(),new SalesConversationAttachmentService.Upload(UUID.randomUUID().toString(),"proof.png","image/png",PNG.length));var row=fileRepository.find(company,upload.id()).orElseThrow();storage.writeObject("synthetic",row.uploadKey(),"image/png",PNG);int objects=storage.objects.size();
        db.update("UPDATE company_storage_states SET included_bytes=0 WHERE company_id=?",company);assertThatThrownBy(()->files.finalizeUpload(admin,c.id(),upload.id())).isInstanceOf(IllegalStateException.class);assertThat(fileRepository.find(company,upload.id()).orElseThrow().state()).isEqualTo("STAGING");assertThat(storage.objects).hasSize(objects);assertThat(db.queryForObject("SELECT purchased_blocks FROM company_storage_states WHERE company_id=?",Integer.class,company)).isZero();
    }
    @Test void foreignOrganizationalAssignmentFailsClosedBeforeGrantOrHistory()throws Exception{
        var c=incoming();long foreignUnit=insert("INSERT INTO units(company_id,name) VALUES(?,'Foreign test unit')",other);db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id) VALUES(?,?,?,?)",company,sellerMember,sellerUser,foreignUnit);
        assertThatThrownBy(()->connections.grant(admin,connection,sellerMember,new Grant(EnumSet.of(Capability.READ_OWN,Capability.TAKE),true,1))).isInstanceOf(ResponseStatusException.class);assertThatThrownBy(()->service.timeline(seller,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);
    }

    @Test void explicitlyGrantedSameUnitEmployeeCanWorkUntilTheUnitIsDeactivated()throws Exception{
        long unit=insert("INSERT INTO units(company_id,name) VALUES(?,'Authorized channel unit')",company);db.update("UPDATE sales_wa_connections SET unit_id=? WHERE company_id=? AND id=?",unit,company,connection);db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id) VALUES(?,?,?,?)",company,sellerMember,sellerUser,unit);
        connections.grant(admin,connection,sellerMember,new Grant(EnumSet.of(Capability.READ_OWN,Capability.TAKE,Capability.REPLY),true,1));var c=take(seller,incoming());assertThat(service.timeline(seller,c.id(),0,null).conversation().id()).isEqualTo(c.id());
        db.update("UPDATE units SET status='inactive' WHERE company_id=? AND id=?",company,unit);assertThatThrownBy(()->service.timeline(seller,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);assertThatThrownBy(()->service.timeline(admin,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);
    }

    @Test void actualHrTerminationReleasesChatWithoutErasingAuthorship()throws Exception{
        var c=take(seller,incoming());var reply=queue(seller,c);db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id) VALUES(?,?,?)",company,sellerMember,sellerUser);
        hr.terminateUser(admin,sellerMember,Map.of("exit_date","2026-10-22","reason_type","resignation","summary","Synthetic fixture termination"));
        assertThatThrownBy(()->service.timeline(seller,c.id(),0,null)).isInstanceOf(ResponseStatusException.class);reconciler.reconcile(company,connection);assertThat(repository.find(company,c.id()).orElseThrow().assigneeMembershipId()).isNull();
        assertThat(db.queryForObject("SELECT author_membership_id FROM sales_conversation_messages WHERE company_id=? AND id=?",Long.class,company,reply.id())).isEqualTo(sellerMember);assertThat(db.queryForObject("SELECT state FROM sales_wa_outbox WHERE company_id=? AND message_id=?",String.class,company,reply.id())).isEqualTo("CANCELLED");
    }

}
