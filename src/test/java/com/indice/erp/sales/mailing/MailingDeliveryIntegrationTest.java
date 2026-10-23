package com.indice.erp.sales.mailing;
import com.indice.erp.auth.*;
import com.indice.erp.email.accounts.*;
import com.indice.erp.email.mailbox.MailboxTransport;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.Test;
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
import static com.indice.erp.sales.mailing.MailingDeliveryContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"app.email.enabled=false","app.mail-accounts.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","app.web.public-url=https://indice.example.invalid","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
@Transactional
class MailingDeliveryIntegrationTest {
    @Autowired JdbcTemplate db;@Autowired MailingService campaigns;@Autowired MailingDeliveryService delivery;@Autowired EmailAccountService accounts;@Autowired MailingUnsubscribeService unsubscribe;@Autowired MockMvc mvc;@Autowired ObjectMapper json;
    @MockitoBean MailboxTransport transport;
    @MockitoBean com.indice.erp.storage.ObjectStorageService storage;
    @Autowired MailingTemplateService templates;
    long company,other,user,membership,contact;String account;AuthSessionUser actor;
    long insert(String sql,Object...args){var key=new GeneratedKeyHolder();db.update(c->{var s=c.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);return key.getKey().longValue();}
    @BeforeEach void setup(){
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        db.update("UPDATE modules SET lifecycle_status='pilot',assignment_enabled=TRUE,is_active=TRUE WHERE slug='correo'");
        company=insert("INSERT INTO companies(name) VALUES(?)","Campaign "+UUID.randomUUID());other=insert("INSERT INTO companies(name) VALUES(?)","Other "+UUID.randomUUID());
        user=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Campaign test')","campaign-"+UUID.randomUUID()+"@example.com");membership=insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'admin','active')",user,company);
        for(String module:List.of("correo","crm")){db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,?,'active','test')",company,module);db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,?,'admin')",membership,module);}
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'correo','mail'),(?,'correo','accounts'),(?,'crm','mailing'),(?,'crm','contacts'),(?,'crm','mailing_send')",membership,membership,membership,membership,membership);
        actor=new AuthSessionUser(user,company,"Campaign test","admin");
        contact=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'CAM-1','Synthetic customer','customer@example.com')",company);
        account=accounts.save(actor,UUID.randomUUID().toString(),new EmailAccountContracts.AccountInput("Sender","sender@example.com","Clinic","smtp.example.invalid",465,"TLS","sender@example.com","synthetic","IMAP","imap.example.invalid",993,"sender@example.com","synthetic",true,0)).id();
        db.update("UPDATE email_accounts SET smtp_status='VERIFIED' WHERE company_id=? AND id=?",company,account);
        when(transport.send(any(),any())).thenReturn(MailboxTransport.Outcome.ACCEPTED);
    }
    String campaign(List<Long> contacts){String id=UUID.randomUUID().toString();campaigns.save(actor,id,new MailingContracts.DraftInput("Campaign","Hello","Campaign clinic","reply@example.com","Preview","Hello {{name}}",contacts,0,account));return id;}
    void consent(long...ids){delivery.consent(actor,new Consent(Arrays.stream(ids).boxed().toList(),"Synthetic signed opt-in fixture",Instant.now().minusSeconds(86400)));}
    Launch launchInput(String id,Instant when){var r=delivery.review(actor,id);return new Launch(r.version(),r.sender().version(),r.digest(),when,"Synthetic Clinic — 123 Test Street");}
    void due(String id){db.update("UPDATE sales_mailing_runs SET scheduled_at=CURRENT_TIMESTAMP(6)-INTERVAL 1 MINUTE,next_attempt_at=CURRENT_TIMESTAMP(6)-INTERVAL 1 MINUTE WHERE company_id=? AND campaign_id=?",company,id);}
    MockHttpSession session(){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,user);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,company);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    @Test void launchSnapshotsRecipientsPersonalizesAndRepeatedRequestsNeverResend(){
        String id=campaign(List.of(contact));var input=launchInput(id,null);delivery.launch(actor,id,input);delivery.launch(actor,id,input);
        db.update("UPDATE sales_contacts SET email='changed@example.com',company_name='Changed' WHERE company_id=? AND id=?",company,contact);
        when(transport.send(any(),any())).thenAnswer(call->{MailboxTransport.Outgoing m=call.getArgument(1);assertThat(m.to()).containsExactly("customer@example.com");assertThat(m.text()).contains("Hello Synthetic customer","/mailing/unsubscribe#","123 Test Street");assertThat(m.replyTo()).isEqualTo("reply@example.com");assertThat(m.displayName()).isEqualTo("Campaign clinic");assertThat(m.text()).startsWith("Preview\n\n");return MailboxTransport.Outcome.ACCEPTED;});
        delivery.tick();due(id);delivery.tick();due(id);delivery.tick();assertThat(delivery.results(actor,id).status()).isEqualTo("COMPLETED");assertThat(delivery.results(actor,id).items()).extracting(Delivery::state).containsExactly("ACCEPTED");verify(transport,times(1)).send(any(),any());
        assertThatThrownBy(()->campaigns.save(actor,id,new MailingContracts.DraftInput("Changed","X","Sender","","","X",List.of(contact),campaigns.get(actor,id).version(),account))).hasMessageContaining("mailing_campaign_locked");
    }
    @Test void scheduledDeliveryUsesItsFrozenFilesAfterTheSourceTemplateChanges(){
        byte[] bytes="Frozen campaign brochure".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String file=UUID.randomUUID().toString(),key="mailing/"+company+"/files/"+file+"/"+UUID.randomUUID(),template=UUID.randomUUID().toString();
        db.update("INSERT INTO sales_mailing_files(company_id,id,created_by,filename,content_type,size_bytes,object_key,status) VALUES(?,?,?,'brochure.txt','text/plain',?,?,'READY')",company,file,user,bytes.length,key);
        when(storage.readObject(anyString(),eq(key),anyInt())).thenAnswer(call->{assertThat((Integer)call.getArgument(2)).isBetween(1,com.indice.erp.email.mailbox.MailFilePolicy.MAX);return bytes;});
        templates.save(actor,template,new MailingTemplateContracts.TemplateInput("Brochure","Hello","","Hello {{name}}",0,null,List.of(file),UUID.randomUUID().toString()));
        String id=UUID.randomUUID().toString();
        campaigns.save(actor,id,new MailingContracts.DraftInput("With brochure","Hello","Campaign clinic","reply@example.com","","Hello {{name}}",List.of(contact),0,account,null,List.of(file)));
        assertThat(delivery.review(actor,id).attachments()).extracting(MailingFileContracts.File::id).containsExactly(file);
        delivery.launch(actor,id,launchInput(id,null));
        templates.save(actor,template,new MailingTemplateContracts.TemplateInput("Changed","Hello","","Changed",1,null,List.of(),UUID.randomUUID().toString()));
        when(transport.send(any(),any())).thenAnswer(call->{MailboxTransport.Outgoing outgoing=call.getArgument(1);assertThat(outgoing.files()).hasSize(1);assertThat(outgoing.files().getFirst().bytes()).isEqualTo(bytes);return MailboxTransport.Outcome.ACCEPTED;});
        delivery.tick();due(id);delivery.tick();
        assertThat(delivery.results(actor,id).items()).extracting(Delivery::state).containsExactly("ACCEPTED");
        verify(transport,times(1)).send(any(),any());
    }
    @Test void expandedHtmlIsRejectedBeforeCreatingDeliveryWork(){
        String id=campaign(List.of(contact));
        db.update("UPDATE sales_mailing_campaigns SET body_html=? WHERE company_id=? AND id=?", "<span>".repeat(38460)+"{{name}}"+"</span>".repeat(38460), company,id);
        assertThatThrownBy(()->delivery.launch(actor,id,launchInput(id,null))).hasMessageContaining("mailing_content_too_long");
        assertThat(delivery.results(actor,id).status()).isEqualTo("DRAFT");
        assertThat(delivery.results(actor,id).items()).isEmpty();verifyNoInteractions(transport);
    }
    @Test void reviewAcceptsContactsWithoutConsentAndRejectsChangedAudience(){
        String id=campaign(List.of(contact));assertThat(delivery.review(actor,id).audience().getFirst().eligibility()).isEqualTo("READY");var input=launchInput(id,null);
        db.update("UPDATE sales_contacts SET email='changed@example.com' WHERE company_id=? AND id=?",company,contact);
        assertThatThrownBy(()->delivery.launch(actor,id,input)).hasMessageContaining("mailing_review_changed");verifyNoInteractions(transport);
    }
    @Test void schedulePauseResumeCancelAndCurrentPermissionGateAreDurable(){
        String id=campaign(List.of(contact));delivery.launch(actor,id,launchInput(id,Instant.now().plusSeconds(3600)));delivery.tick();verifyNoInteractions(transport);
        var result=delivery.results(actor,id);result=delivery.control(actor,id,new Control(result.version(),"PAUSE"));due(id);delivery.tick();verifyNoInteractions(transport);
        result=delivery.control(actor,id,new Control(result.version(),"RESUME"));assertThat(result.status()).isEqualTo("RUNNING");result=delivery.control(actor,id,new Control(result.version(),"CANCEL"));delivery.tick();verifyNoInteractions(transport);assertThat(result.items()).extracting(Delivery::state).containsExactly("CANCELLED");
    }
    @Test void unsubscribeIsAuthenticatedIdempotentAndOverridesLaterConsent(){
        String id=campaign(List.of(contact));delivery.launch(actor,id,launchInput(id,null));String recipient=delivery.results(actor,id).items().getFirst().id();String token=unsubscribe.link(recipient).split("#")[1];
        unsubscribe.unsubscribe(token.substring(0,token.length()-1)+"x","synthetic-a");assertThat(delivery.review(actor,id).audience().getFirst().eligibility()).isEqualTo("READY");
        unsubscribe.unsubscribe(token,"synthetic-b");unsubscribe.unsubscribe(token,"synthetic-b");consent(contact);delivery.tick();assertThat(delivery.results(actor,id).items().getFirst().state()).isEqualTo("SUPPRESSED");verifyNoInteractions(transport);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_permission_events WHERE company_id=? AND action='UNSUBSCRIBED'",Long.class,company)).isEqualTo(1);
    }
    @Test void lostSmtpAckAndRecoveredWorkerNeverAutomaticallyRepeatTransport(){
        String id=campaign(List.of(contact));delivery.launch(actor,id,launchInput(id,null));when(transport.send(any(),any())).thenReturn(MailboxTransport.Outcome.UNKNOWN);
        delivery.tick();due(id);delivery.tick();assertThat(delivery.results(actor,id).items().getFirst().state()).isEqualTo("UNKNOWN");verify(transport,times(1)).send(any(),any());
    }
    @Test void interruptedWorkerReconcilesEmailLedgerBeforeAnyRetry(){
        String id=campaign(List.of(contact));delivery.launch(actor,id,launchInput(id,null));delivery.tick();
        db.update("UPDATE sales_mailing_deliveries SET state='SUBMITTING' WHERE company_id=? AND campaign_id=?",company,id);due(id);delivery.tick();assertThat(delivery.results(actor,id).items().getFirst().state()).isEqualTo("ACCEPTED");verify(transport,times(1)).send(any(),any());
    }
    @Test void workerStopsWhenSenderOrSendPermissionChanges(){
        String id=campaign(List.of(contact));delivery.launch(actor,id,launchInput(id,null));db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='mailing_send'",membership);delivery.tick();assertThat(delivery.results(actor,id).status()).isEqualTo("PAUSED");verifyNoInteractions(transport);
    }
    @Test void duplicatesAreExcludedAndTestSendIsIdempotentWithoutCampaignLaunch(){
        long duplicate=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'CAM-2','Duplicate','CUSTOMER@example.com')",company);String id=campaign(List.of(contact,duplicate));assertThat(delivery.review(actor,id).audience()).extracting(Audience::eligibility).containsExactly("READY","DUPLICATE");
        var input=new TestInput(1,"test@example.com",UUID.randomUUID().toString());assertThat(delivery.test(actor,id,input).state()).isEqualTo("ACCEPTED");delivery.test(actor,id,input);verify(transport,times(1)).send(any(),any());assertThat(delivery.results(actor,id).status()).isEqualTo("DRAFT");
    }
    @Test void nativeSendPermissionCsrfAndTenantIsolationProtectNewEndpoints() throws Exception {
        String id=campaign(List.of(contact));String body=json.writeValueAsString(new Consent(List.of(contact),"Synthetic permission evidence",Instant.now().minusSeconds(60)));
        mvc.perform(post("/api/v1/mailing/consents").session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='mailing_send'",membership);
        mvc.perform(post("/api/v1/mailing/consents").session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        assertThatThrownBy(()->delivery.review(new AuthSessionUser(user,other,"Foreign","superadmin"),id)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        mvc.perform(post("/api/public/mailing/unsubscribe").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"invalid\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.received").value(true));
        mvc.perform(get("/api/public/mailing/unsubscribe")).andExpect(status().isMethodNotAllowed());
    }
    @Test void personNamePersonalizesNewCampaignsAndChangesInvalidateReview() {
        db.update("UPDATE sales_contacts SET contact_person='Ricardo' WHERE company_id=? AND id=?",company,contact);
        String id=campaign(List.of(contact));var old=launchInput(id,null);
        assertThat(delivery.review(actor,id).audience().getFirst().name()).isEqualTo("Ricardo");
        db.update("UPDATE sales_contacts SET contact_person='Ana' WHERE company_id=? AND id=?",company,contact);
        assertThatThrownBy(()->delivery.launch(actor,id,old)).hasMessageContaining("mailing_review_changed");
        delivery.launch(actor,id,launchInput(id,null));
        when(transport.send(any(),any())).thenAnswer(call->{MailboxTransport.Outgoing message=call.getArgument(1);assertThat(message.text()).contains("Hello Ana");return MailboxTransport.Outcome.ACCEPTED;});
        delivery.tick();verify(transport,times(1)).send(any(),any());
    }


    Launch selection(String id,List<Long> ids){var r=delivery.review(actor,id);return new Launch(r.version(),r.sender().version(),r.digest(),null,"Synthetic Clinic — 123 Test Street",ids);}
    @Test void selectedSubsetIsTheDurableAudienceAndReplayCannotAddRecipients() {
        long second=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'SECOND','Second','second@example.com')",company);
        String id=campaign(List.of(contact,second));
        var result=delivery.launch(actor,id,selection(id,List.of(second,second)));
        assertThat(result.items()).extracting(Delivery::email).containsExactly("second@example.com");
        delivery.launch(actor,id,selection(id,List.of(contact,second)));
        delivery.tick();due(id);delivery.tick();
        var capture=org.mockito.ArgumentCaptor.forClass(MailboxTransport.Outgoing.class);
        verify(transport,times(1)).send(any(),capture.capture());assertThat(capture.getValue().to()).containsExactly("second@example.com");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_permissions WHERE company_id=?",Long.class,company)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_permission_events WHERE company_id=?",Long.class,company)).isZero();
    }
    @Test void emptyOrUnavailableSelectionNeverFallsBackToSendingEverybody() {
        long foreign=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'FOREIGN','Foreign','foreign@example.com')",other);
        long outside=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'OUTSIDE','Outside','outside@example.com')",company);
        String id=campaign(List.of(contact));
        assertThatThrownBy(()->delivery.launch(actor,id,selection(id,List.of()))).hasMessageContaining("mailing_no_recipients");
        for(long unavailable:List.of(foreign,outside))assertThatThrownBy(()->delivery.launch(actor,id,selection(id,List.of(contact,unavailable)))).hasMessageContaining("mailing_recipient_unavailable");
        assertThat(delivery.results(actor,id).status()).isEqualTo("DRAFT");assertThat(delivery.results(actor,id).items()).isEmpty();verifyNoInteractions(transport);
    }
    @Test void unsubscribesAndInvalidAddressesRemainExcludedAndTenantScoped() {
        long suppressed=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'STOP','Unsubscribed','stop@example.com')",company);
        long invalid=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'BAD','Invalid','broken')",company);
        long duplicate=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'DUP','Duplicate','CUSTOMER@example.com')",company);
        db.update("INSERT INTO sales_mailing_permissions(company_id,email,status,evidence,recorded_by,recorded_at) VALUES(?,'stop@example.com','SUPPRESSED','Synthetic unsubscribe',?,NOW()),(?,'customer@example.com','SUPPRESSED','Other tenant',?,NOW())",company,user,other,user);
        String id=campaign(List.of(contact,suppressed,invalid,duplicate));
        assertThat(delivery.review(actor,id).audience()).extracting(Audience::eligibility).containsExactly("READY","SUPPRESSED","INVALID","DUPLICATE");
        for(long unavailable:List.of(suppressed,invalid,duplicate))assertThatThrownBy(()->delivery.launch(actor,id,selection(id,List.of(contact,unavailable)))).hasMessageContaining("mailing_recipient_unavailable");
        // The compatible request with no selection includes all and only eligible recipients.
        assertThat(delivery.launch(actor,id,launchInput(id,null)).items()).extracting(Delivery::email).containsExactly("customer@example.com");
        delivery.tick();verify(transport,times(1)).send(any(),any());
    }
    @Test void launchSelectionRequiresCsrfNativeSendPermissionAndValidIds() throws Exception {
        String id=campaign(List.of(contact)),url="/api/v1/mailing/campaigns/"+id+"/launch";
        String body=json.writeValueAsString(selection(id,List.of(contact)));
        mvc.perform(post(url).session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        String bad=json.writeValueAsString(selection(id,Arrays.asList(contact,null)));
        mvc.perform(post(url).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(bad)).andExpect(status().isBadRequest());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='mailing_send'",membership);
        mvc.perform(post(url).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','mailing_send')",membership);
        mvc.perform(post(url).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        verifyNoInteractions(transport);
    }

}
