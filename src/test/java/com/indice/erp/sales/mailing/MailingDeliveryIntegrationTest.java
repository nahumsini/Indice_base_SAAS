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
        String id=campaign(List.of(contact));consent(contact);var input=launchInput(id,null);delivery.launch(actor,id,input);delivery.launch(actor,id,input);
        db.update("UPDATE sales_contacts SET email='changed@example.com',company_name='Changed' WHERE company_id=? AND id=?",company,contact);
        when(transport.send(any(),any())).thenAnswer(call->{MailboxTransport.Outgoing m=call.getArgument(1);assertThat(m.to()).containsExactly("customer@example.com");assertThat(m.text()).contains("Hello Synthetic customer","/mailing/unsubscribe#","123 Test Street");assertThat(m.replyTo()).isEqualTo("reply@example.com");assertThat(m.displayName()).isEqualTo("Campaign clinic");assertThat(m.text()).startsWith("Preview\n\n");return MailboxTransport.Outcome.ACCEPTED;});
        delivery.tick();due(id);delivery.tick();due(id);delivery.tick();assertThat(delivery.results(actor,id).status()).isEqualTo("COMPLETED");assertThat(delivery.results(actor,id).items()).extracting(Delivery::state).containsExactly("ACCEPTED");verify(transport,times(1)).send(any(),any());
        assertThatThrownBy(()->campaigns.save(actor,id,new MailingContracts.DraftInput("Changed","X","Sender","","","X",List.of(contact),campaigns.get(actor,id).version(),account))).hasMessageContaining("mailing_campaign_locked");
    }
    @Test void reviewDigestRejectsChangedAudienceAndNoConsentCannotLaunch(){
        String id=campaign(List.of(contact));assertThatThrownBy(()->delivery.launch(actor,id,launchInput(id,null))).hasMessageContaining("mailing_no_consented_recipients");consent(contact);var input=launchInput(id,null);
        db.update("UPDATE sales_contacts SET email='changed@example.com' WHERE company_id=? AND id=?",company,contact);
        assertThatThrownBy(()->delivery.launch(actor,id,input)).hasMessageContaining("mailing_review_changed");verifyNoInteractions(transport);
    }
    @Test void schedulePauseResumeCancelAndCurrentPermissionGateAreDurable(){
        String id=campaign(List.of(contact));consent(contact);delivery.launch(actor,id,launchInput(id,Instant.now().plusSeconds(3600)));delivery.tick();verifyNoInteractions(transport);
        var result=delivery.results(actor,id);result=delivery.control(actor,id,new Control(result.version(),"PAUSE"));due(id);delivery.tick();verifyNoInteractions(transport);
        result=delivery.control(actor,id,new Control(result.version(),"RESUME"));assertThat(result.status()).isEqualTo("RUNNING");result=delivery.control(actor,id,new Control(result.version(),"CANCEL"));delivery.tick();verifyNoInteractions(transport);assertThat(result.items()).extracting(Delivery::state).containsExactly("CANCELLED");
    }
    @Test void unsubscribeIsAuthenticatedIdempotentAndOverridesLaterConsent(){
        String id=campaign(List.of(contact));consent(contact);delivery.launch(actor,id,launchInput(id,null));String recipient=delivery.results(actor,id).items().getFirst().id();String token=unsubscribe.link(recipient).split("#")[1];
        unsubscribe.unsubscribe(token.substring(0,token.length()-1)+"x","synthetic-a");assertThat(delivery.review(actor,id).audience().getFirst().eligibility()).isEqualTo("READY");
        unsubscribe.unsubscribe(token,"synthetic-b");unsubscribe.unsubscribe(token,"synthetic-b");consent(contact);delivery.tick();assertThat(delivery.results(actor,id).items().getFirst().state()).isEqualTo("SUPPRESSED");verifyNoInteractions(transport);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_permission_events WHERE company_id=? AND action='UNSUBSCRIBED'",Long.class,company)).isEqualTo(1);
    }
    @Test void lostSmtpAckAndRecoveredWorkerNeverAutomaticallyRepeatTransport(){
        String id=campaign(List.of(contact));consent(contact);delivery.launch(actor,id,launchInput(id,null));when(transport.send(any(),any())).thenReturn(MailboxTransport.Outcome.UNKNOWN);
        delivery.tick();due(id);delivery.tick();assertThat(delivery.results(actor,id).items().getFirst().state()).isEqualTo("UNKNOWN");verify(transport,times(1)).send(any(),any());
    }
    @Test void interruptedWorkerReconcilesEmailLedgerBeforeAnyRetry(){
        String id=campaign(List.of(contact));consent(contact);delivery.launch(actor,id,launchInput(id,null));delivery.tick();
        db.update("UPDATE sales_mailing_deliveries SET state='SUBMITTING' WHERE company_id=? AND campaign_id=?",company,id);due(id);delivery.tick();assertThat(delivery.results(actor,id).items().getFirst().state()).isEqualTo("ACCEPTED");verify(transport,times(1)).send(any(),any());
    }
    @Test void workerStopsWhenSenderOrSendPermissionChanges(){
        String id=campaign(List.of(contact));consent(contact);delivery.launch(actor,id,launchInput(id,null));db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='mailing_send'",membership);delivery.tick();assertThat(delivery.results(actor,id).status()).isEqualTo("PAUSED");verifyNoInteractions(transport);
    }
    @Test void duplicatesAreExcludedAndTestSendIsIdempotentWithoutCampaignLaunch(){
        long duplicate=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'CAM-2','Duplicate','CUSTOMER@example.com')",company);String id=campaign(List.of(contact,duplicate));consent(contact);assertThat(delivery.review(actor,id).audience()).extracting(Audience::eligibility).containsExactly("READY","DUPLICATE");
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
}
