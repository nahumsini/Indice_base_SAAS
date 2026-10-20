package com.indice.erp.messaging;

import static com.indice.erp.messaging.MessagingContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.subscription.CompanySubscriptionStatusProvider;
import com.indice.erp.billing.subscription.CompanySubscriptionStatus;
import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;

@JdbcTest(properties={"logging.level.org.springframework=WARN","logging.level.org.springframework.jdbc.core=WARN","logging.file.path=.run/messaging-tests"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import({MessagingRepository.class,MessagingService.class,MessagingAccess.class,PlatformAdminAccessService.class,
    DistributorPortfolioAccessPolicy.class,SessionCsrfService.class,MessagingAttachmentService.class,MessagingAttachmentRepository.class,MessagingTaskService.class})
class MessagingIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired MessagingService service;
    @Autowired MessagingRepository repository;
    @Autowired MessagingAccess access;
    @Autowired SessionCsrfService csrf;
    @Autowired MessagingAttachmentService photos;
    @Autowired MessagingTaskService messageTasks;
    @MockitoBean com.indice.erp.processTasks.tasks.ProcessTaskMessagingContract taskOwner;
    @MockitoBean com.indice.erp.storage.ObjectStorageService storage;
    @MockitoBean com.indice.erp.storage.ObjectStorageProperties storageProperties;
    @MockitoBean com.indice.erp.billing.storage.CompanyStorageMeter meter;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    @MockitoBean SessionAuthService auth;
    @MockitoBean CompanySubscriptionStatusProvider subscription;
    @MockitoBean CommercialLifecycleAccessService lifecycle;
    Actor alice,bob,outsider,root,distributor;

    @BeforeEach void setup() {
        // Test transaction rollback callbacks run after Mockito's automatic reset.
        clearInvocations(storage,meter);
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        long company=company("SUPER_ADMIN");
        alice=member(company,"Alice","user"); bob=member(company,"Bob","user");
        outsider=member(company("SUPER_ADMIN"),"Other tenant","user");
        var admin=member(company("SUPER_ADMIN"),"Operator","superadmin");
        jdbc.update("INSERT INTO platform_administrators(user_id,platform_role,status,mfa_required,created_by_user_id) VALUES (?,'PLATFORM_ROOT','ACTIVE',0,?)",admin.userId(),admin.userId());
        root=new Actor(admin.userId(),admin.companyId(),admin.membershipId(),"PLATFORM");
        var dealer=member(company("DISTRIBUTOR"),"Distributor","superadmin");
        distributor=new Actor(dealer.userId(),dealer.companyId(),dealer.membershipId(),"DISTRIBUTOR");
        when(subscription.currentStatus(anyLong())).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(storage.isEnabled()).thenReturn(true);
        when(storageProperties.getMinio()).thenReturn(new com.indice.erp.storage.ObjectStorageProperties.Minio());
        when(meter.reservationTtl()).thenReturn(java.time.Duration.ofMinutes(15));
        when(meter.presign(anyLong(),anyString(),anyString(),anyString(),anyString(),anyLong(),anyInt()))
            .thenAnswer(i->new com.indice.erp.storage.PresignedUpload(i.getArgument(3),"https://storage.example.test/upload",java.time.Instant.now().plusSeconds(900),java.util.Map.of("Content-Type",i.getArgument(4))));
        when(storage.presignUpload(anyString(),anyString(),anyString(),anyLong(),anyInt()))
            .thenAnswer(i->new com.indice.erp.storage.PresignedUpload(i.getArgument(1),"https://storage.example.test/upload",java.time.Instant.now().plusSeconds(900),java.util.Map.of()));
        when(storage.objectMetadata(anyString(),anyString())).thenReturn(new com.indice.erp.storage.StoredObjectMetadata(100,"image/png"));
        when(storage.readObjectPrefix(anyString(),anyString(),anyInt())).thenReturn(new byte[]{(byte)137,80,78,71,13,10,26,10});
        when(storage.presignDownload(anyString(),anyString(),eq(60),anyString())).thenReturn("https://storage.example.test/read");
    }
    @Test void authenticatedPinMemberUsesExistingConversationsAndCannotImpersonateAnotherMembership() {
        var conversation = service.create(alice, create("DIRECT", bob.membershipId())).conversation().id();
        var pinActor = access.memberActor(new AuthSessionUser(bob.userId(), bob.companyId(), bob.membershipId(), "PIN member", "admin"));
        assertThat(pinActor.scope()).isEqualTo("MEMBER");
        assertThat(service.detail(pinActor, conversation, 0, 0).messages().items()).hasSize(1);
        assertThatThrownBy(() -> access.memberActor(new AuthSessionUser(bob.userId(), alice.companyId(), outsider.membershipId(), "Spoofed", "admin")))
            .isInstanceOf(ResponseStatusException.class);
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE id=?", bob.membershipId());
        assertThatThrownBy(() -> access.memberActor(new AuthSessionUser(bob.userId(), bob.companyId(), bob.membershipId(), "Revoked", "admin")))
            .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(auth);
    }

    @Test void directConversationIsPrivateAndTenantScoped() {
        var id=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        assertThat(service.detail(bob,id,0,0).messages().items()).hasSize(1);
        assertThat(service.list(outsider,"ALL","",0).items()).isEmpty();
        assertThatThrownBy(()->service.detail(outsider,id,0,0)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.detail(root,id,0,0)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.create(alice,create("DIRECT",outsider.membershipId()))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void directChatNeedsNoSubjectAndDisplaysTheOtherPersonForEachMember() {
        var result=service.create(alice,new Create("DIRECT",bob.membershipId(),null,null,null,"es-MX","Hello",key()));
        assertThat(result.conversation().subject()).isEmpty();
        assertThat(result.conversation().displayName()).isEqualTo("Bob");
        assertThat(service.detail(bob,result.conversation().id(),0,0).conversation().displayName()).isEqualTo("Alice");
        assertThat(service.list(alice,"DIRECT","Bob",0).items()).hasSize(1);
        assertThat(result.participants()).hasSize(2);
    }
    @Test void legacyDirectCreationRetryFingerprintRemainsCompatible() throws Exception {
        record LegacyCreate(String kind,Long recipientMembershipId,String subject,String topic,String moduleName,String language,String body,String requestKey) { }
        var r=new Create("DIRECT",bob.membershipId(),"Legacy subject","FAILURE","HR","es-MX","Hello",key());
        var legacy=new LegacyCreate(r.kind(),r.recipientMembershipId(),r.subject(),r.topic(),r.moduleName(),r.language(),r.body(),r.requestKey());
        var bytes=new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(legacy);
        var fingerprint=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
        var result=service.create(alice,r);
        assertThat(repository.creationFingerprint(alice,r.requestKey())).isEqualTo(fingerprint);
        assertThat(service.create(alice,r).conversation().id()).isEqualTo(result.conversation().id());
    }
    @Test void groupsArePrivateIdempotentAndNotifyEveryOtherMember() {
        var carol=member(alice.companyId(),"Carol","user");
        var nonmember=member(alice.companyId(),"Not invited","admin");
        var request=new Create("GROUP",null,null,null,null,"es-MX","Welcome",key(),java.util.List.of(bob.membershipId(),carol.membershipId()),"Opening team");
        var result=service.create(alice,request);var id=result.conversation().id();
        assertThat(service.create(alice,request).conversation().id()).isEqualTo(id);
        assertThat(result.participants()).hasSize(3);
        assertThat(service.detail(carol,id,0,0).messages().items()).hasSize(1);
        assertThat(service.list(alice,"GROUP","Opening",0).items()).hasSize(1);
        assertThat(service.list(nonmember,"GROUP","",0).items()).isEmpty();
        assertThatThrownBy(()->service.detail(nonmember,id,0,0)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.detail(root,id,0,0)).isInstanceOf(ResponseStatusException.class);
        var sent=service.send(bob,id,new Send("Ready","PUBLIC",key()));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM messaging_notification_outbox WHERE message_id=?",Integer.class,sent.id())).isEqualTo(2);
        service.read(carol,id,new Read(sent.id()));
        // Empty incremental responses must still refresh read receipts.
        var poll=service.detail(bob,id,sent.id(),0);
        assertThat(poll.messages().items()).isEmpty();
        assertThat(poll.participants().stream().filter(p->p.userId()==carol.userId()).findFirst().orElseThrow().lastReadMessageId()).isEqualTo(sent.id());
        assertThat(poll.participants().stream().filter(p->p.userId()==alice.userId()).findFirst().orElseThrow().lastReadMessageId()).isZero();
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE id=?",carol.membershipId());
        assertThatThrownBy(()->service.send(alice,id,new Send("Blocked","PUBLIC",key()))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.detail(carol,id,0,0)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void groupsRejectForeignInactiveRepeatedAndInsufficientParticipants() {
        var carol=member(alice.companyId(),"Carol","user");
        for(var ids:java.util.List.of(java.util.List.of(bob.membershipId()),java.util.List.of(bob.membershipId(),outsider.membershipId()),
                java.util.List.of(bob.membershipId(),bob.membershipId()),java.util.List.of(bob.membershipId(),alice.membershipId()))) {
            assertThatThrownBy(()->service.create(alice,new Create("GROUP",null,"",null,"","es-MX","Hello",key(),ids,"Team"))).isInstanceOf(ResponseStatusException.class);
        }
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE id=?",carol.membershipId());
        assertThatThrownBy(()->service.create(alice,new Create("GROUP",null,"",null,"","es-MX","Hello",key(),java.util.List.of(bob.membershipId(),carol.membershipId()),"Team"))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void personalTaskRetriesAreScopedAndDoNotDuplicateTheOwnerMutation() {
        var id=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        when(taskOwner.allowed(any())).thenReturn(true);
        jdbc.update("INSERT INTO process_tasks(company_id,folio,title,assigned_user_id,assigned_user_company_id,created_by) VALUES (?,?,?,?,?,?)",alice.companyId(),"MSG-TEST","Call back",alice.userId(),alice.membershipId(),alice.userId());
        var taskId=jdbc.queryForObject("SELECT id FROM process_tasks WHERE company_id=? AND folio='MSG-TEST'",Long.class,alice.companyId());
        var link=new com.indice.erp.processTasks.tasks.ProcessTaskMessagingContract.TaskLink(taskId,"MSG-TEST","Call back","pending",null);
        when(taskOwner.create(any(),isNull(),eq("Call back"),isNull())).thenReturn(link);
        when(taskOwner.read(any(),eq(taskId))).thenReturn(link);
        var request=new MessagingTaskService.CreateTask("Call back",null,key());
        assertThat(messageTasks.create(alice,id,request,false,null)).isEqualTo(link);
        assertThat(messageTasks.create(alice,id,request,false,null)).isEqualTo(link);
        verify(taskOwner,times(1)).create(any(),isNull(),eq("Call back"),isNull());
        assertThatThrownBy(()->messageTasks.create(alice,id,new MessagingTaskService.CreateTask("Changed",null,request.requestKey()),false,null)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->messageTasks.create(outsider,id,request,false,null)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->messageTasks.create(alice,id,request,true,null)).isInstanceOf(ResponseStatusException.class);
        when(taskOwner.allowed(any())).thenReturn(false);
        assertThat(messageTasks.context(alice,false,null).canCreate()).isFalse();
        assertThatThrownBy(()->messageTasks.create(alice,id,request,false,null)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void directPairIsUniqueAndRetriesDoNotDuplicateMessages() {
        var request=create("DIRECT",bob.membershipId());
        var first=service.create(alice,request);
        assertThat(service.create(alice,request).conversation().id()).isEqualTo(first.conversation().id());
        var reverse=service.create(bob,create("DIRECT",alice.membershipId()));
        assertThat(reverse.conversation().id()).isEqualTo(first.conversation().id());
        assertThat(reverse.messages().items()).hasSize(2);
        var send=new Send("Repeated safely","PUBLIC",key());
        var saved=service.send(alice,first.conversation().id(),send);
        assertThat(service.send(alice,first.conversation().id(),send).id()).isEqualTo(saved.id());
        assertThatThrownBy(()->service.send(alice,first.conversation().id(),new Send("Changed","PUBLIC",send.requestKey())))
            .isInstanceOf(ResponseStatusException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM messaging_notification_outbox WHERE message_id=?",Integer.class,saved.id())).isEqualTo(1);
    }
    @Test void careHistoryAndInternalNotesHaveSeparateVisibility() {
        var id=service.create(alice,create("SUPPORT",null)).conversation().id();
        service.send(root,id,new Send("Internal diagnosis","INTERNAL",key()));
        service.send(root,id,new Send("Customer response","PUBLIC",key()));
        assertThat(service.detail(alice,id,0,0).messages().items()).extracting(Message::body).doesNotContain("Internal diagnosis").contains("Customer response");
        assertThat(service.detail(root,id,0,0).messages().items()).hasSize(3);
        assertThat(service.detail(alice,id,0,0).conversation().status()).isEqualTo("WAITING_CUSTOMER");
        assertThatThrownBy(()->service.detail(bob,id,0,0)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.send(alice,id,new Send("Hidden","INTERNAL",key()))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void assignmentRejectsAStaleVersionAndCustomerReplyReopens() {
        var id=service.create(alice,create("SUPPORT",null)).conversation().id();
        var c=service.detail(root,id,0,0).conversation();
        var originalVersion=c.version();
        service.change(root,id,new Change(c.version(),"ASSIGN",root.userId(),null));
        assertThatThrownBy(()->service.change(root,id,new Change(originalVersion,"ASSIGN",null,null)))
            .isInstanceOf(ResponseStatusException.class);
        c=service.detail(root,id,0,0).conversation();
        service.change(root,id,new Change(c.version(),"STATUS",null,"RESOLVED"));
        service.send(alice,id,new Send("Still need help","PUBLIC",key()));
        assertThat(service.detail(alice,id,0,0).conversation().status()).isEqualTo("OPEN");
        assertThat(service.audit(root,id,0)).extracting(Audit::action).contains("ASSIGN","STATUS","REOPENED");
    }
    @Test void distributorTransferSharesPublicHistoryAndRevokesItsAccess() {
        jdbc.update("UPDATE companies SET distributor_company_id=? WHERE id=?",distributor.companyId(),alice.companyId());
        var id=service.create(alice,create("DISTRIBUTOR",null)).conversation().id();
        service.send(distributor,id,new Send("Dealer internal","INTERNAL",key()));
        assertThat(service.list(distributor,"ALL","",0).items()).hasSize(1);
        assertThatThrownBy(()->service.detail(root,id,0,0)).isInstanceOf(ResponseStatusException.class);
        var c=service.detail(distributor,id,0,0).conversation();
        service.change(distributor,id,new Change(c.version(),"TRANSFER",null,null));
        assertThat(service.detail(root,id,0,0).messages().items()).extracting(Message::body).doesNotContain("Dealer internal");
        assertThatThrownBy(()->service.detail(distributor,id,0,0)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void changingDistributorRevokesFormerPortfolioAccess() {
        jdbc.update("UPDATE companies SET distributor_company_id=? WHERE id=?",distributor.companyId(),alice.companyId());
        var id=service.create(alice,create("DISTRIBUTOR",null)).conversation().id();
        jdbc.update("UPDATE companies SET distributor_company_id=? WHERE id=?",outsider.companyId(),alice.companyId());
        assertThat(service.list(distributor,"ALL","",0).items()).isEmpty();
        assertThatThrownBy(()->service.detail(distributor,id,0,0)).isInstanceOf(RuntimeException.class);
    }
    @Test void revokedParticipantsCannotReadOrReceiveNewDirectMessages() {
        var id=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE id=?",bob.membershipId());
        assertThatThrownBy(()->service.detail(bob,id,0,0)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.send(alice,id,new Send("Not delivered","PUBLIC",key()))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void unreadCursorsAreMonotonicAndCannotReferenceAnotherConversation() {
        var id=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        var first=service.detail(bob,id,0,0).messages().items().getFirst();
        var second=service.send(alice,id,new Send("Second","PUBLIC",key()));
        assertThat(service.unread(bob)).isEqualTo(2);
        service.read(bob,id,new Read(second.id())); service.read(bob,id,new Read(first.id()));
        assertThat(service.unread(bob)).isZero();
        var other=service.create(alice,create("SUPPORT",null)).messages().items().getFirst();
        assertThatThrownBy(()->service.read(bob,id,new Read(other.id()))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void paginationRecoversMissedMessagesInOrderWithoutLoadingEntireHistory() {
        var id=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        var initial=service.detail(bob,id,0,0).messages().items().getFirst().id();
        for(int i=0;i<70;i++) jdbc.update("INSERT INTO messaging_messages(conversation_id,sender_user_id,sender_scope,visibility,request_key,body) VALUES (?,?,'MEMBER','PUBLIC',?,?)",id,alice.userId(),key(),"History "+i);
        var first=service.detail(bob,id,initial,0).messages();
        assertThat(first.items()).hasSize(50); assertThat(first.hasMore()).isTrue();
        var next=service.detail(bob,id,first.items().getLast().id(),0).messages();
        assertThat(next.items()).hasSize(20); assertThat(next.hasMore()).isFalse();
        var latest=service.detail(bob,id,0,0).messages();
        assertThat(latest.items()).hasSize(50); assertThat(latest.hasMore()).isTrue();
        assertThat(service.detail(bob,id,0,latest.items().getFirst().id()).messages().items()).hasSize(21);
    }
    @Test void supportOnlyRecoveryCannotBypassOperationalRestrictions() {
        var direct=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        var support=service.create(alice,create("SUPPORT",null)).conversation().id();
        var restricted=new Actor(alice.userId(),alice.companyId(),alice.membershipId(),"MEMBER",true);
        assertThat(service.list(restricted,"ALL","",0).items()).extracting(Conversation::id).containsExactly(support);
        assertThat(service.context(restricted).supportOnly()).isTrue();
        assertThatThrownBy(()->service.directory(restricted,"")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.detail(restricted,direct,0,0)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.create(restricted,create("DIRECT",bob.membershipId()))).isInstanceOf(ResponseStatusException.class);
        service.send(restricted,support,new Send("Billing question","PUBLIC",key()));
    }
    @Test void requestsRequireSessionMembershipAndCsrf() {
        var req=new MockHttpServletRequest("POST","/api/v1/messaging/conversations");
        assertThatThrownBy(()->access.actor(req)).isInstanceOf(ResponseStatusException.class);
        var session=new MockHttpSession(); req.setSession(session);
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(alice.userId(),alice.companyId(),alice.membershipId(),"Alice","user")));
        assertThatThrownBy(()->access.actor(req)).isInstanceOf(IllegalArgumentException.class);
        req.addHeader("X-CSRF-Token",csrf.ensureCsrf(session));
        assertThat(access.actor(req).membershipId()).isEqualTo(alice.membershipId());
        when(subscription.currentStatus(alice.companyId())).thenReturn(CompanySubscriptionStatus.blocked("test"));
        assertThat(access.actor(req).supportOnly()).isTrue();
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE id=?",alice.membershipId());
        assertThatThrownBy(()->access.actor(req)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void httpRoutesEnforceAuthenticationCsrfAndPlatformAuthority() throws Exception {
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new MessagingController(access,service,photos,messageTasks))
            .setControllerAdvice(new MessagingExceptionHandler()).build();
        var session=new MockHttpSession();
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(alice.userId(),alice.companyId(),alice.membershipId(),"Alice","user")));
        var json=new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(create("SUPPORT",null));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/messaging/conversations"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/messaging/conversations").session(session)
            .contentType("application/json").content(json)).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/messaging/conversations").session(session)
            .header("X-CSRF-Token",csrf.ensureCsrf(session)).contentType("application/json").content(json))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.messages.items[0].body").value("First message"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/platform-admin/customer-care/conversations").session(session))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/messaging/summary").session(session))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        var conversation=service.create(alice,create("SUPPORT",null)).conversation().id();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/messaging/conversations/"+conversation+"/attachments")
            .session(session).contentType("application/json").content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(upload())))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
    }
    @Test void recoveryClassificationOnlyExemptsDocumentedCustomerRoutes() {
        assertThat(com.indice.erp.billing.collection.PaymentCollectionAccessService.permitsRecovery("POST","/api/v1/messaging/conversations/12/messages")).isTrue();
        assertThat(com.indice.erp.billing.collection.PaymentCollectionAccessService.permitsRecovery("GET","/api/v1/messaging/conversations/12")).isTrue();
        assertThat(com.indice.erp.billing.collection.PaymentCollectionAccessService.permitsRecovery("GET","/api/v1/messaging/directory")).isFalse();
        assertThat(com.indice.erp.billing.collection.PaymentCollectionAccessService.permitsRecovery("PATCH","/api/v1/messaging/conversations/12")).isFalse();
        assertThat(com.indice.erp.billing.collection.PaymentCollectionAccessService.permitsRecovery("POST","/api/v1/messaging/conversations/12/attachments")).isTrue();
        assertThat(com.indice.erp.billing.collection.PaymentCollectionAccessService.permitsRecovery("GET","/api/v1/messaging/conversations/12/attachments/"+key())).isTrue();
        assertThat(com.indice.erp.billing.collection.PaymentCollectionAccessService.permitsRecovery("DELETE","/api/v1/messaging/conversations/12/attachments/"+key())).isFalse();
    }
    @Test void rateLimitAndValidationRejectExcessiveOrInvalidSends() {
        var request=create("SUPPORT",null);
        var id=service.create(alice,request).conversation().id();
        var altered=new Create("SUPPORT",null,"Different subject",request.topic(),request.moduleName(),request.language(),request.body(),request.requestKey());
        assertThatThrownBy(()->service.create(alice,altered)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.send(alice,id,new Send("x".repeat(8001),"PUBLIC",key()))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.send(alice,id,new Send("Text","PUBLIC","bad-key"))).isInstanceOf(ResponseStatusException.class);
        for(int i=0;i<29;i++) service.send(alice,id,new Send("Text "+i,"PUBLIC",key()));
        assertThatThrownBy(()->service.send(alice,id,new Send("Too many","PUBLIC",key())))
            .isInstanceOfSatisfying(ResponseStatusException.class,e->assertThat(e.getStatusCode().value()).isEqualTo(429));
    }
    @Test void queueSummaryAndFiltersAreScopedAndSearchable() {
        service.create(alice,create("SUPPORT",null)); service.create(alice,create("DIRECT",bob.membershipId()));
        assertThat(service.summary(root).waitingCare()).isGreaterThanOrEqualTo(1);
        assertThat(service.list(root,"UNASSIGNED","Help",0).items()).allMatch(c->c.kind().equals("SUPPORT"));
        assertThat(service.assignees(root)).extracting(Person::id).contains(root.userId());
        assertThat(service.directory(alice,"Bob")).extracting(Person::id).containsExactly(bob.membershipId());
    }
    @Test
    @org.springframework.transaction.annotation.Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentSendsCommitOnceAndConcurrentAssignmentsHaveOneWinner() throws Exception {
        var id=service.create(alice,create("SUPPORT",null)).conversation().id();
        var photo=photos.presign(alice,id,upload());
        var request=new Send("Concurrent retry","PUBLIC",key(),java.util.List.of(photo.id()));
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var gate=new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Callable<Message> send=()->{gate.await();return service.send(alice,id,request);};
            var first=pool.submit(send); var second=pool.submit(send); gate.countDown();
            assertThat(first.get(15,java.util.concurrent.TimeUnit.SECONDS).id()).isEqualTo(second.get(15,java.util.concurrent.TimeUnit.SECONDS).id());
            var version=service.detail(root,id,0,0).conversation().version();
            java.util.concurrent.Callable<Boolean> assign=()->{
                try { service.change(root,id,new Change(version,"ASSIGN",root.userId(),null)); return true; }
                catch(ResponseStatusException e) { assertThat(e.getStatusCode().value()).isEqualTo(409); return false; }
            };
            var a=pool.submit(assign); var b=pool.submit(assign);
            assertThat(java.util.List.of(a.get(15,java.util.concurrent.TimeUnit.SECONDS),b.get(15,java.util.concurrent.TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
        }
        // A fresh repository reads the committed history independently of the original service instance.
        var fresh=new MessagingRepository(jdbc);
        assertThat(fresh.messages(alice,id,0,0).items()).hasSize(2);
        verify(meter,times(1)).commitMoved(eq(alice.companyId()),anyString(),anyString(),anyString(),eq(100L));
    }
    @Test
    @org.springframework.transaction.annotation.Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void failedUseCaseRollsBackAndNotificationDeliveryRetriesAfterFailure() {
        var id=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        var transaction=new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        assertThatThrownBy(()->transaction.executeWithoutResult(status->{
            service.send(alice,id,new Send("Must roll back","PUBLIC",key()));
            throw new IllegalStateException("synthetic failure");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(service.detail(bob,id,0,0).messages().items()).hasSize(1);
        var notifications=mock(com.indice.erp.notifications.AppNotificationService.class);
        doThrow(new IllegalStateException("synthetic notification outage")).when(notifications).publish(any());
        var dispatcher=new MessagingNotificationDispatcher(jdbc,notifications,transactionManager);
        // Isolate dispatch to this fixture's pending outbox entries.
        var outbox=jdbc.queryForObject("SELECT id FROM messaging_notification_outbox WHERE company_id=?",Long.class,alice.companyId());
        dispatcher.dispatchOne(outbox);
        assertThat(jdbc.queryForObject("SELECT attempts FROM messaging_notification_outbox WHERE id=?",Integer.class,outbox)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT delivered_at FROM messaging_notification_outbox WHERE id=?",java.sql.Timestamp.class,outbox)).isNull();
        jdbc.update("UPDATE messaging_notification_outbox SET available_at=CURRENT_TIMESTAMP WHERE id=?",outbox);
        var real=new com.indice.erp.notifications.AppNotificationService(jdbc);
        var recovered=new MessagingNotificationDispatcher(jdbc,real,transactionManager);
        recovered.dispatchOne(outbox); recovered.dispatchOne(outbox);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND source_module='messaging'",Integer.class,alice.companyId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT delivered_at FROM messaging_notification_outbox WHERE id=?",java.sql.Timestamp.class,outbox)).isNotNull();
    }
    @AfterEach void cleanCommittedFixtures() {
        if(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive() || alice==null) return;
        // Only fixture-owned rows in the isolated test schema are removed.
        for(String table:java.util.List.of("messaging_notification_outbox","app_notifications")) jdbc.update("DELETE FROM "+table+" WHERE company_id=?",alice.companyId());
        for(String table:java.util.List.of("messaging_attachments","messaging_audit","messaging_reads","messaging_participants","messaging_messages"))
            jdbc.update("DELETE child FROM "+table+" child JOIN messaging_conversations c ON c.id=child.conversation_id WHERE c.company_id=?",alice.companyId());
        jdbc.update("DELETE FROM messaging_conversations WHERE company_id=?",alice.companyId());
        jdbc.update("DELETE FROM platform_administrators WHERE user_id=?",root.userId());
        for(var a:java.util.List.of(alice,bob,outsider,root,distributor)) {
            jdbc.update("DELETE FROM user_companies WHERE id=?",a.membershipId()); jdbc.update("DELETE FROM users WHERE id=?",a.userId());
        }
        for(long company:java.util.List.of(alice.companyId(),outsider.companyId(),root.companyId(),distributor.companyId())) jdbc.update("DELETE FROM companies WHERE id=?",company);
    }
    private Create create(String kind,Long recipient) { return new Create(kind,recipient,"Help","CONSULTATION","","en-CA","First message",key()); }
    private PhotoUpload upload() { return new PhotoUpload("photo.png","image/png",100,key()); }
    @Test void photoOnlyMessagesAreAtomicIdempotentAndScopedToParticipants() {
        var id=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        var request=upload();
        var photo=photos.presign(alice,id,request);
        assertThat(photos.presign(alice,id,request).id()).isEqualTo(photo.id());
        assertThatThrownBy(()->photos.download(alice,id,photo.id())).isInstanceOf(ResponseStatusException.class);
        var send=new Send("","PUBLIC",key(),java.util.List.of(photo.id()));
        var message=service.send(alice,id,send);
        assertThat(service.send(alice,id,send)).isEqualTo(message);
        assertThat(message.attachments()).extracting(Attachment::id).containsExactly(photo.id());
        assertThat(service.detail(bob,id,0,0).messages().items().getLast().attachments()).hasSize(1);
        assertThat(photos.download(bob,id,photo.id()).url()).isNotBlank();
        verify(storage).presignDownload(anyString(),anyString(),eq(60),eq(request.fileName()));
        assertThatThrownBy(()->photos.download(outsider,id,photo.id())).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->photos.download(root,id,photo.id())).isInstanceOf(ResponseStatusException.class);
        verify(meter,times(1)).commitMoved(eq(alice.companyId()),anyString(),contains("/pending/"),contains("/photos/"),eq(100L));
        assertThatThrownBy(()->service.send(alice,id,new Send("","PUBLIC",key(),java.util.List.of(photo.id())))).isInstanceOf(ResponseStatusException.class);
        jdbc.update("UPDATE user_companies SET status='inactive' WHERE id=?",bob.membershipId());
        assertThatThrownBy(()->photos.download(bob,id,photo.id())).isInstanceOf(ResponseStatusException.class);
    }
    @Test void photosCannotBeStolenFromAnotherSenderOrConversation() {
        var id=service.create(alice,create("DIRECT",bob.membershipId())).conversation().id();
        var photo=photos.presign(alice,id,upload());
        assertThatThrownBy(()->service.send(bob,id,new Send("","PUBLIC",key(),java.util.List.of(photo.id())))).isInstanceOf(ResponseStatusException.class);
        var other=service.create(alice,create("SUPPORT",null)).conversation().id();
        assertThatThrownBy(()->service.send(alice,other,new Send("","PUBLIC",key(),java.util.List.of(photo.id())))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->photos.presign(outsider,id,upload())).isInstanceOf(ResponseStatusException.class);
    }
    @Test void internalPhotosStayPrivateAfterDistributorTransfer() {
        jdbc.update("UPDATE companies SET distributor_company_id=? WHERE id=?",distributor.companyId(),alice.companyId());
        var id=service.create(alice,create("DISTRIBUTOR",null)).conversation().id();
        var photo=photos.presign(distributor,id,upload());
        service.send(distributor,id,new Send("","INTERNAL",key(),java.util.List.of(photo.id())));
        assertThat(photos.download(distributor,id,photo.id()).url()).isNotBlank();
        assertThatThrownBy(()->photos.download(alice,id,photo.id())).isInstanceOf(ResponseStatusException.class);
        var c=service.detail(distributor,id,0,0).conversation();
        service.change(distributor,id,new Change(c.version(),"TRANSFER",null,null));
        assertThatThrownBy(()->photos.download(root,id,photo.id())).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->photos.download(distributor,id,photo.id())).isInstanceOf(ResponseStatusException.class);
    }
    @Test void photoUploadRejectsBadTypesSizesDuplicatesAndExcessCount() {
        var id=service.create(alice,create("SUPPORT",null)).conversation().id();
        for(var request:java.util.List.of(new PhotoUpload("x.svg","image/svg+xml",100,key()),new PhotoUpload("x.png","image/png",0,key()),new PhotoUpload("x.png","image/png",8L*1024*1024+1,key())))
            assertThatThrownBy(()->photos.presign(alice,id,request)).isInstanceOf(ResponseStatusException.class);
        var photo=photos.presign(alice,id,upload());
        assertThatThrownBy(()->service.send(alice,id,new Send("","PUBLIC",key(),java.util.List.of(photo.id(),photo.id())))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.send(alice,id,new Send("","PUBLIC",key(),java.util.stream.IntStream.range(0,6).mapToObj(i->key()).toList()))).isInstanceOf(ResponseStatusException.class);
        when(storage.readObjectPrefix(anyString(),anyString(),anyInt())).thenReturn("<script>bad</script>".getBytes());
        assertThatThrownBy(()->service.send(alice,id,new Send("","PUBLIC",key(),java.util.List.of(photo.id())))).isInstanceOf(ResponseStatusException.class);
        verify(meter,never()).commitMoved(anyLong(),anyString(),anyString(),anyString(),anyLong());
    }
    @Test
    @org.springframework.transaction.annotation.Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void photoCommitFailureRollsBackMessageAndRetrySucceeds() {
        var id=service.create(alice,create("SUPPORT",null)).conversation().id();
        var photo=photos.presign(alice,id,upload());
        var request=new Send("","PUBLIC",key(),java.util.List.of(photo.id()));
        when(meter.commitMoved(anyLong(),anyString(),anyString(),anyString(),anyLong())).thenThrow(new IllegalStateException("storage outage"));
        assertThatThrownBy(()->service.send(alice,id,request)).isInstanceOf(IllegalStateException.class);
        assertThat(service.detail(alice,id,0,0).messages().items()).hasSize(1);
        verify(storage).deleteObject(anyString(),contains("/photos/"));
        doReturn(null).when(meter).commitMoved(anyLong(),anyString(),anyString(),anyString(),anyLong());
        var sent=service.send(alice,id,request);
        assertThat(service.send(alice,id,request).id()).isEqualTo(sent.id());
        assertThat(service.detail(alice,id,0,0).messages().items()).hasSize(2);
    }
    @Test void expiredStagingIsCleanedWithoutDeletingSentPhotographs() {
        var id=service.create(alice,create("SUPPORT",null)).conversation().id();
        var photo=photos.presign(alice,id,upload());
        service.send(alice,id,new Send("","PUBLIC",key(),java.util.List.of(photo.id())));
        jdbc.update("UPDATE messaging_attachments SET expires_at=CURRENT_TIMESTAMP - INTERVAL 2 MINUTE WHERE id=?",photo.id());
        photos.cleanupStaging();
        verify(storage).deleteObject(anyString(),contains("/pending/"));
        verify(storage,never()).deleteObject(anyString(),contains("/photos/"));
        verify(meter,never()).release(anyLong(),anyString(),anyString());
        assertThat(photos.download(alice,id,photo.id()).url()).isNotBlank();
    }
    @Test void expiredUploadRenewsTheSameAttachmentAndCannotRenewSentObjects() {
        var id=service.create(alice,create("SUPPORT",null)).conversation().id();
        var request=upload(); var pending=photos.presign(alice,id,request);
        jdbc.update("UPDATE messaging_attachments SET expires_at=CURRENT_TIMESTAMP - INTERVAL 2 MINUTE WHERE id=?",pending.id());
        var renewed=photos.presign(alice,id,request);
        assertThat(renewed.id()).isEqualTo(pending.id());
        assertThat(renewed.expiresAt()).isAfter(java.time.Instant.now());
        verify(meter).release(eq(alice.companyId()),anyString(),eq("messaging_upload_renewed"));
        var send=new Send("","PUBLIC",key(),java.util.List.of(renewed.id()));
        var saved=service.send(alice,id,send);
        assertThat(service.send(alice,id,send).id()).isEqualTo(saved.id());
        assertThatThrownBy(()->photos.presign(alice,id,request)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void pdfMessagesArePrivateAndInboxPreviewNeverLeaksInternalNotes() {
        var id=service.create(alice,create("SUPPORT",null)).conversation().id();
        var pdf=photos.presign(alice,id,new PhotoUpload("evidence.pdf","application/pdf",100,key()));
        when(storage.objectMetadata(anyString(),anyString())).thenReturn(new com.indice.erp.storage.StoredObjectMetadata(100,"application/pdf"));
        when(storage.readObjectPrefix(anyString(),anyString(),anyInt())).thenReturn("%PDF-1.7".getBytes());
        var saved=service.send(alice,id,new Send("","PUBLIC",key(),java.util.List.of(pdf.id())));
        assertThat(saved.attachments().getFirst().contentType()).isEqualTo("application/pdf");
        assertThat(service.detail(alice,id,0,0).conversation().lastMessageHasAttachments()).isTrue();
        assertThatThrownBy(()->photos.download(bob,id,pdf.id())).isInstanceOf(ResponseStatusException.class);
        service.send(root,id,new Send("Private staff diagnosis","INTERNAL",key()));
        assertThat(service.list(alice,"ALL","",0).items().getFirst().lastMessagePreview()).isEmpty();
        assertThat(service.list(root,"ALL","",0).items().getFirst().lastMessagePreview()).isEqualTo("Private staff diagnosis");
    }
    @Test void initialAttachmentsAreSenderOwnedAtomicAndCreationRetriesDoNotDuplicate() {
        var staged=photos.presignDraft(alice,upload());
        assertThat(photos.presignDraft(alice,new PhotoUpload(upload().fileName(),"image/png",100,
            jdbc.queryForObject("SELECT request_key FROM messaging_attachments WHERE id=?",String.class,staged.id()))).id()).isEqualTo(staged.id());
        var request=new Create("DIRECT",bob.membershipId(),"",null,"","es-MX","",key(),null,null,java.util.List.of(staged.id()));
        var result=service.create(alice,request);
        assertThat(result.messages().items()).hasSize(1);
        assertThat(result.messages().items().getFirst().attachments()).extracting(Attachment::id).containsExactly(staged.id());
        assertThat(service.create(alice,request).messages().items()).hasSize(1);
        assertThat(photos.download(bob,result.conversation().id(),staged.id()).url()).isNotBlank();
        assertThatThrownBy(()->photos.presignDraft(root,upload())).isInstanceOf(ResponseStatusException.class);
        var restricted=new Actor(alice.userId(),alice.companyId(),alice.membershipId(),"MEMBER",true);
        assertThatThrownBy(()->photos.presignDraft(restricted,upload())).isInstanceOf(ResponseStatusException.class);
        var another=photos.presignDraft(alice,upload());
        assertThatThrownBy(()->service.create(bob,new Create("DIRECT",alice.membershipId(),"",null,"","es-MX","",key(),null,null,java.util.List.of(another.id())))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.create(outsider,new Create("SUPPORT",null,"Help","CONSULTATION","","es-MX","",key(),null,null,java.util.List.of(another.id())))).isInstanceOf(ResponseStatusException.class);
    }
    private String key() { return UUID.randomUUID().toString(); }
    private long company(String type) { jdbc.update("INSERT INTO companies(name,commercial_account_type,platform_status) VALUES (?,?,'ACTIVE')","Messaging test "+key(),type); return jdbc.queryForObject("SELECT LAST_INSERT_ID()",Long.class); }
    private Actor member(long company,String name,String role) {
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test-only',?)","messaging-"+key()+"@example.invalid",name);
        long user=jdbc.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status) VALUES (?,?,?,'active')",user,company,role);
        return new Actor(user,company,jdbc.queryForObject("SELECT LAST_INSERT_ID()",Long.class),"MEMBER");
    }
}
