package com.indice.erp.email.mailbox;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.*;
import com.indice.erp.email.accounts.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.email.mailbox.MailboxContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"app.email.enabled=false","app.mail-accounts.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@AutoConfigureMockMvc
@Transactional
class MailboxIntegrationTest {
    @Autowired JdbcTemplate db; @Autowired EmailAccountService accounts; @Autowired MailboxService mailbox; @Autowired MailDraftService drafts;
    @Autowired MockMvc mvc; @Autowired ObjectMapper json;
    @MockitoBean MailboxTransport transport;
    @MockitoBean com.indice.erp.storage.ObjectStorageService storage;
    @Autowired MailPreferencesService preferences;@Autowired MailSentCopyService sentCopies;@Autowired MailAttachmentService files;@Autowired MailOperationsRepository operations;
    long company,other,user,otherUser,membership;AuthSessionUser actor;
    long insert(String sql,Object...args){var key=new GeneratedKeyHolder();db.update(c->{var s=c.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);return key.getKey().longValue();}
    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        db.update("UPDATE modules SET lifecycle_status='pilot',assignment_enabled=TRUE,is_active=TRUE WHERE slug='correo'");
        company=insert("INSERT INTO companies(name) VALUES(?)","Email "+UUID.randomUUID());
        other=insert("INSERT INTO companies(name) VALUES(?)","Other "+UUID.randomUUID());
        user=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Email test')","email-"+UUID.randomUUID()+"@example.com");
        otherUser=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Other test')","email-"+UUID.randomUUID()+"@example.com");
        membership=insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'admin','active')",user,company);
        for(String module:List.of("correo","crm")) {
            db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,?,'active','test')",company,module);
            db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,?,'admin')",membership,module);
        }
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'correo','accounts'),(?,'correo','mail'),(?,'crm','mailing'),(?,'crm','contacts')",membership,membership,membership,membership);
        actor=new AuthSessionUser(user,company,"Email test","admin");
    }
    EmailAccountContracts.AccountInput input(String label,long version,String password,boolean mailing) {
        return new EmailAccountContracts.AccountInput(label,"sender@example.com","Clinic","smtp.example.com",465,"TLS","sender@example.com",password,
            "IMAP","imap.example.com",993,"sender@example.com",password,mailing,version);
    }
    EmailAccountContracts.Account create() {return accounts.save(actor,UUID.randomUUID().toString(),input("Private sender",0,"synthetic-password",true));}
    MockHttpSession session(){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,user);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,company);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    DraftInput draft(long version){return new DraftInput(version,1,List.of("recipient@example.com"),List.of(),List.of("hidden@example.com"),"Synthetic subject","Synthetic body",null);}
    String draft(String account){var id=UUID.randomUUID().toString();drafts.save(actor,account,id,draft(0));return id;}
    Workspace sync(String account,long validity){
        when(transport.folders(any())).thenReturn(List.of(new MailboxTransport.FolderInfo("INBOX","INBOX"),new MailboxTransport.FolderInfo("Archive","ARCHIVE")));
        var header=new MailboxTransport.RemoteHeader(10,"Incoming","visitor@example.com","Visitor",List.of("sender@example.com"),List.of(),List.of("reply@example.com"),"<original@example.com>",null,Instant.now(),false,false);
        when(transport.sync(any(),any(),anyBoolean(),any())).thenReturn(new MailboxTransport.Batch(validity,10,10,false,List.of(header),List.of()));
        return mailbox.sync(actor,account,new SyncInput(null,false));
    }
    @Test void draftsPersistWithOptimisticVersionsAndCannotEscapeAccountOwnership() {
        var account=create();String id=draft(account.id());var saved=mailbox.get(actor,account.id(),id);
        assertThat(saved.bodyText()).isEqualTo("Synthetic body");assertThat(saved.bcc()).containsExactly("hidden@example.com");
        assertThat(drafts.save(actor,account.id(),id,draft(1)).version()).isEqualTo(2);
        assertThatThrownBy(()->drafts.save(actor,account.id(),id,draft(1))).hasMessageContaining("email_message_changed");
        assertThatThrownBy(()->mailbox.get(new AuthSessionUser(otherUser,company,"Other","superadmin"),account.id(),id)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThatThrownBy(()->mailbox.get(new AuthSessionUser(user,other,"Other","superadmin"),account.id(),id)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThat(mailbox.list(actor,account.id(),"DRAFTS","Synthetic",0).items()).hasSize(1);
    }
    @Test void acceptedSendPersistsLocalSentCopyAndDuplicateRequestsNeverResend() {
        var account=create();String id=draft(account.id());
        when(transport.send(any(),any())).thenAnswer(call->{
            assertThat(drafts.send(actor,account.id(),id,new Version(1,1)).state()).isEqualTo("SUBMITTING");
            assertThatThrownBy(()->accounts.save(actor,account.id(),input("Changed",1,"",true))).hasMessageContaining("email_operation_in_progress");
            return MailboxTransport.Outcome.ACCEPTED;
        });
        assertThat(drafts.send(actor,account.id(),id,new Version(1,1)).state()).isEqualTo("ACCEPTED");
        assertThat(drafts.send(actor,account.id(),id,new Version(1,1)).state()).isEqualTo("ACCEPTED");
        assertThat(mailbox.list(actor,account.id(),"SENT","",0).items()).hasSize(1);verify(transport,times(1)).send(any(),any());
        assertThat(mailbox.list(actor,account.id(),"DRAFTS","",0).items()).isEmpty();
        assertThatThrownBy(()->drafts.save(actor,account.id(),id,draft(3))).hasMessageContaining("email_message_changed");
    }
    @Test void uncertainSmtpAndProcessInterruptionAreNeverRetried() {
        var account=create();String id=draft(account.id());when(transport.send(any(),any())).thenReturn(MailboxTransport.Outcome.UNKNOWN);
        assertThat(drafts.send(actor,account.id(),id,new Version(1,1)).state()).isEqualTo("UNKNOWN");
        assertThat(drafts.send(actor,account.id(),id,new Version(1,1)).state()).isEqualTo("UNKNOWN");verify(transport,times(1)).send(any(),any());
        db.update("UPDATE email_messages SET state='SUBMITTING',send_started_at=CURRENT_TIMESTAMP(6)-INTERVAL 10 MINUTE WHERE company_id=? AND account_id=? AND id=?",company,account.id(),id);
        assertThat(mailbox.get(actor,account.id(),id).state()).isEqualTo("UNKNOWN");
        assertThat(drafts.send(actor,account.id(),id,new Version(1,1)).state()).isEqualTo("UNKNOWN");verify(transport,times(1)).send(any(),any());
    }
    @Test void failedSendRemainsVisibleWithoutClaimingDelivery() {
        var account=create();String id=draft(account.id());when(transport.send(any(),any())).thenReturn(MailboxTransport.Outcome.FAILED);
        assertThat(drafts.send(actor,account.id(),id,new Version(1,1)).state()).isEqualTo("FAILED");
        assertThat(mailbox.list(actor,account.id(),"OUTBOX","",0).items()).hasSize(1);
        assertThat(mailbox.list(actor,account.id(),"SENT","",0).items()).isEmpty();
    }
    @Test void safeSmtpDiagnosticIsPersistedWithoutRetrying() {
        var account=create();String id=draft(account.id());when(transport.send(any(),any())).thenThrow(new MailSendRejection("email_send_recipient_rejected"));
        var result=drafts.send(actor,account.id(),id,new Version(1,1));
        assertThat(result.state()).isEqualTo("FAILED");assertThat(result.failureCode()).isEqualTo("email_send_recipient_rejected");
        drafts.send(actor,account.id(),id,new Version(1,1));verify(transport,times(1)).send(any(),any());
    }
    @Test void folderCreationRequiresCsrfOwnershipVersionAndValidName()throws Exception {
        var account=create();String endpoint="/api/v1/email/mailboxes/"+account.id()+"/folders";
        var input=new FolderInput("Clientes",1);
        mvc.perform(post(endpoint).session(session()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input))).andExpect(status().isForbidden());
        when(transport.folders(any())).thenReturn(List.of());when(transport.createFolder(any(),eq("Clientes"))).thenReturn(new MailboxTransport.FolderInfo("INBOX.Clientes","CUSTOM"));
        assertThat(mailbox.createFolder(actor,account.id(),input).folders()).extracting(Folder::name).contains("INBOX.Clientes");
        assertThat(mailbox.createFolder(actor,account.id(),input).folders()).hasSize(1);
        assertThatThrownBy(()->mailbox.createFolder(actor,account.id(),new FolderInput("../private",1))).hasMessageContaining("email_folder_name_invalid");
        assertThatThrownBy(()->mailbox.createFolder(actor,account.id(),new FolderInput("Another",99))).hasMessageContaining("email_account_changed");
        assertThatThrownBy(()->mailbox.createFolder(new AuthSessionUser(otherUser,company,"Other","admin"),account.id(),input)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND module_slug='correo' AND tab_key='mail'",membership);
        mvc.perform(post(endpoint).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input))).andExpect(status().isForbidden());
    }
    @Test void filtersApplyBeforePaginationAndSearchIncludesRecipients() {
        var account=create();String id=draft(account.id());
        assertThat(mailbox.list(actor,account.id(),"DRAFTS","recipient@example.com",0,"ALL").items()).hasSize(1);
        assertThat(mailbox.list(actor,account.id(),"DRAFTS","",0,"UNREAD").items()).isEmpty();
        assertThat(mailbox.list(actor,account.id(),"DRAFTS","",0,"STARRED").items()).isEmpty();
        db.update("UPDATE email_messages SET is_starred=TRUE WHERE company_id=? AND id=?",company,id);
        assertThat(mailbox.list(actor,account.id(),"DRAFTS","",0,"STARRED").items()).hasSize(1);
        assertThatThrownBy(()->mailbox.list(actor,account.id(),"DRAFTS","",0,"invalid")).hasMessageContaining("email_filter_invalid");
    }
    @Test void imapSyncIsIdempotentAndUidValiditySeparatesMessages() {
        var account=create();var workspace=sync(account.id(),100);String inbox=workspace.folders().getFirst().id();
        String original=mailbox.list(actor,account.id(),inbox,"",0).items().getFirst().id();
        assertThat(mailbox.list(actor,account.id(),inbox,"",0).items()).hasSize(1);
        db.update("UPDATE email_mailboxes SET last_attempt_at=NULL WHERE company_id=? AND account_id=?",company,account.id());sync(account.id(),100);
        assertThat(mailbox.list(actor,account.id(),inbox,"",0).items()).hasSize(1);
        db.update("UPDATE email_mailboxes SET last_attempt_at=NULL WHERE company_id=? AND account_id=?",company,account.id());sync(account.id(),200);
        assertThat(mailbox.list(actor,account.id(),inbox,"",0).items()).hasSize(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM email_messages WHERE company_id=? AND account_id=?",Long.class,company,account.id())).isEqualTo(2);
        assertThatThrownBy(()->mailbox.open(actor,account.id(),original)).hasMessageContaining("email_folder_changed");verify(transport,never()).open(any(),any(),anyLong());
    }
    @Test void openReadsRealBodyAndReplyUsesServerOwnedThreadHeaders() {
        var account=create();var inbox=sync(account.id(),100).folders().getFirst();String id=mailbox.list(actor,account.id(),inbox.id(),"",0).items().getFirst().id();
        when(transport.open(any(),any(),eq(10L))).thenReturn(new MailboxTransport.Body("Hello from IMAP",false,true));
        var message=mailbox.open(actor,account.id(),id);assertThat(message.bodyText()).isEqualTo("Hello from IMAP");assertThat(message.read()).isTrue();assertThat(message.hasAttachments()).isTrue();
        String reply=UUID.randomUUID().toString();drafts.save(actor,account.id(),reply,new DraftInput(0,1,List.of("reply@example.com"),List.of(),List.of(),"Re: Incoming","Reply",id));
        when(transport.send(any(),any())).thenAnswer(call->{var outgoing=(MailboxTransport.Outgoing)call.getArgument(1);assertThat(outgoing.inReplyTo()).isEqualTo("<original@example.com>");return MailboxTransport.Outcome.ACCEPTED;});
        drafts.send(actor,account.id(),reply,new Version(1,1));
    }
    @Test void changesAreAppliedOnlyAfterProviderSuccessAndMoveKeepsHistory() {
        var account=create();var ws=sync(account.id(),100);var inbox=ws.folders().getFirst();String id=mailbox.list(actor,account.id(),inbox.id(),"",0).items().getFirst().id();
        doThrow(new MailboxTransport.Failure("email_provider_unavailable")).when(transport).action(any(),any(),anyLong(),eq("UNREAD"),isNull());
        assertThatThrownBy(()->mailbox.action(actor,account.id(),id,new ActionInput(1,1,"UNREAD",null))).hasMessageContaining("email_provider_unavailable");
        assertThat(mailbox.get(actor,account.id(),id).version()).isEqualTo(1);
        mailbox.action(actor,account.id(),id,new ActionInput(1,1,"MOVE",ws.folders().get(1).id()));
        assertThat(mailbox.list(actor,account.id(),inbox.id(),"",0).items()).isEmpty();assertThat(mailbox.get(actor,account.id(),id)).isNotNull();
    }
    @Test void changedAccountRequiresDraftReviewAndOldRemoteMessagesCannotBeOpened() {
        var account=create();String id=draft(account.id());var inbox=sync(account.id(),100).folders().getFirst();String remote=mailbox.list(actor,account.id(),inbox.id(),"",0).items().getFirst().id();
        accounts.save(actor,account.id(),input("New config",1,"",true));
        assertThatThrownBy(()->drafts.send(actor,account.id(),id,new Version(1,2))).hasMessageContaining("email_account_changed");
        assertThatThrownBy(()->mailbox.open(actor,account.id(),remote)).hasMessageContaining("email_message_not_found");verify(transport,never()).send(any(),any());
    }
    @Test void mailboxEndpointsRequireCsrfMailTabOwnershipAndEntitlement() throws Exception {
        var account=create();String base="/api/v1/email/mailboxes/"+account.id();
        mvc.perform(get("/api/v1/email/mailboxes")).andExpect(status().isUnauthorized());
        mvc.perform(post(base+"/sync").session(session()).contentType(MediaType.APPLICATION_JSON).content("{\"older\":false}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/email/mailboxes").session(session())).andExpect(status().isOk()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("smtpHost"))));
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND module_slug='correo' AND tab_key='mail'",membership);
        mvc.perform(get(base).session(session())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/email/accounts").session(session())).andExpect(status().isOk());
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='correo'",company);
        assertThatThrownBy(()->drafts.save(actor,account.id(),UUID.randomUUID().toString(),draft(0))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    @Test void validatesHeaderInjectionAndRecipientCountsWithoutEchoingContent() throws Exception {
        var account=create();String base="/api/v1/email/mailboxes/"+account.id()+"/drafts/"+UUID.randomUUID();
        var invalid=new DraftInput(0,1,List.of("person@example.com"),List.of(),List.of(),"Injected\r\nBcc: secret@example.com","Private body",null);
        mvc.perform(put(base).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(invalid))).andExpect(status().isBadRequest()).andExpect(content().string("{\"code\":\"email_header_invalid\"}"));
        assertThatThrownBy(()->drafts.save(actor,account.id(),UUID.randomUUID().toString(),new DraftInput(0,1,Collections.nCopies(21,"person@example.com"),List.of(),List.of(),"Subject","Body",null))).hasMessageContaining("email_recipient_limit");
    }

    @Test void sentCopiesAreIndependentFromSmtpAndUncertainAppendIsOnlySearched() {
        var account=create();var id=draft(account.id());when(transport.send(any(),any())).thenReturn(MailboxTransport.Outcome.ACCEPTED);
        drafts.send(actor,account.id(),id,new Version(1,1));
        when(transport.folders(any())).thenReturn(List.of(new MailboxTransport.FolderInfo("Sent","SENT")));
        when(transport.copySent(any(),any(),eq("Sent"),eq(true))).thenReturn(MailboxTransport.CopyOutcome.UNKNOWN);
        assertThat(sentCopies.copy(actor,account.id(),id).sentCopyState()).isEqualTo("UNKNOWN");
        when(transport.copySent(any(),any(),eq("Sent"),eq(false))).thenReturn(MailboxTransport.CopyOutcome.COPIED);
        assertThat(sentCopies.copy(actor,account.id(),id).sentCopyState()).isEqualTo("COPIED");
        sentCopies.copy(actor,account.id(),id);verify(transport,times(1)).copySent(any(),any(),eq("Sent"),eq(true));verify(transport,times(1)).copySent(any(),any(),eq("Sent"),eq(false));verify(transport,times(1)).send(any(),any());
    }
    @Test void preferencesAndWorkerPersistAcrossClosedBrowserAndRecheckMembership() {
        var account=create();assertThat(preferences.get(actor,account.id()).backgroundEnabled()).isFalse();
        preferences.save(actor,account.id(),new PreferencesInput(true,null,1,1));
        when(transport.folders(any())).thenReturn(List.of(new MailboxTransport.FolderInfo("INBOX","INBOX")));
        when(transport.sync(any(),any(),eq(false),any())).thenReturn(new MailboxTransport.Batch(1,0,0,false,List.of(),List.of()));
        new MailboxScheduler(operations,mailbox,sentCopies).tick();assertThat(mailbox.workspace(actor,account.id()).lastSyncAt()).isNotNull();verify(transport,times(1)).sync(any(),any(),eq(false),any());
        db.update("UPDATE email_mailboxes SET next_sync_at=CURRENT_TIMESTAMP(6)-INTERVAL 1 MINUTE WHERE company_id=? AND account_id=?",company,account.id());
        db.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND id=?",company,membership);
        new MailboxScheduler(operations,mailbox,sentCopies).tick();verify(transport,times(1)).sync(any(),any(),eq(false),any());
        assertThat(db.queryForObject("SELECT sync_failures FROM email_mailboxes WHERE company_id=? AND account_id=?",Integer.class,company,account.id())).isEqualTo(1);
    }
    @Test void attachmentUploadSealsVerifiedObjectAndInvalidatesPriorSendReview() {
        var account=create();var id=draft(account.id());when(storage.isEnabled()).thenReturn(true);
        when(storage.presignUpload(anyString(),anyString(),anyString(),anyLong(),anyInt())).thenAnswer(call->new com.indice.erp.storage.PresignedUpload(call.getArgument(1),"https://storage.example.invalid/upload",Instant.now().plusSeconds(300),Map.of()));
        var upload=files.upload(actor,account.id(),id,new UploadInput("sample.txt","text/plain",3,1,1));
        when(storage.objectExists(anyString(),anyString())).thenReturn(true);when(storage.objectMetadata(anyString(),anyString())).thenReturn(new com.indice.erp.storage.StoredObjectMetadata(3,"text/plain"));when(storage.readObject(anyString(),anyString(),anyInt())).thenReturn("abc".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        var saved=files.register(actor,account.id(),id,upload.id(),new Version(1,1));assertThat(saved.version()).isEqualTo(2);assertThat(saved.hasAttachments()).isTrue();assertThat(files.list(actor,account.id(),id)).hasSize(1);
        verify(storage).copyObject(anyString(),contains("/staging/"),contains("/files/"));
        assertThatThrownBy(()->drafts.send(actor,account.id(),id,new Version(1,1))).hasMessageContaining("email_message_changed");
        when(transport.send(any(),any())).thenAnswer(call->{MailboxTransport.Outgoing outgoing=call.getArgument(1);assertThat(outgoing.files()).hasSize(1);assertThat(outgoing.files().getFirst().bytes()).isEqualTo("abc".getBytes());return MailboxTransport.Outcome.ACCEPTED;});
        assertThat(drafts.send(actor,account.id(),id,new Version(2,1)).state()).isEqualTo("ACCEPTED");
        assertThatThrownBy(()->files.download(new AuthSessionUser(otherUser,company,"Other","superadmin"),account.id(),id,upload.id())).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    @Test void attachmentTypeMismatchAndOversizeAreRejectedBeforePresign() {
        var account=create();var id=draft(account.id());when(storage.isEnabled()).thenReturn(true);
        assertThatThrownBy(()->files.upload(actor,account.id(),id,new UploadInput("script.html","text/plain",3,1,1))).hasMessageContaining("email_attachment_blocked");
        assertThatThrownBy(()->files.upload(actor,account.id(),id,new UploadInput("big.txt","text/plain",6*1024*1024,1,1))).hasMessageContaining("email_attachment_blocked");
        verify(storage,never()).presignUpload(anyString(),anyString(),anyString(),anyLong(),anyInt());
    }
    @Test void htmlDraftIsSanitizedOnPersistenceAndRemoteReads() {
        var account=create();var id=UUID.randomUUID().toString();var value=new DraftInput(0,1,List.of("safe@example.com"),List.of(),List.of(),"Safe","Plain",null,"<p onclick='bad()'>Hello <b>bold</b><img src='https://track.invalid'><script>bad()</script></p>");
        var saved=drafts.save(actor,account.id(),id,value);assertThat(saved.bodyHtml()).contains("<b>bold</b>").doesNotContain("onclick","img","script","track.invalid","bad()");
    }
    @Test void newMailboxMutationsRequireCsrfAndPreferencesAreOwnerScoped() throws Exception {
        var account=create();String url="/api/v1/email/mailboxes/"+account.id();
        mvc.perform(put(url+"/preferences").session(session()).contentType(MediaType.APPLICATION_JSON).content("{\"backgroundEnabled\":true,\"version\":1,\"accountVersion\":1}")).andExpect(status().isForbidden());
        assertThatThrownBy(()->preferences.get(new AuthSessionUser(otherUser,company,"Other","superadmin"),account.id())).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
