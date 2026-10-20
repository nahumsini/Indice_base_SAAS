package com.indice.erp.email.accounts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.*;
import com.indice.erp.sales.mailing.*;
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
import static com.indice.erp.email.accounts.EmailAccountContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.email.enabled=false","app.mail-accounts.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@AutoConfigureMockMvc
@Transactional
class EmailAccountIntegrationTest {
    @Autowired JdbcTemplate db;@Autowired EmailAccountService accounts;@Autowired MailingService mailing;
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;
    @MockitoBean MailConnectionProbe probe;
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
    AccountInput input(String label,long version,String password,boolean mailing) {
        return new AccountInput(label,"sender@example.com","Clinic","smtp.example.com",465,"TLS","sender@example.com",password,
            "IMAP","imap.example.com",993,"sender@example.com",password,mailing,version);
    }
    Account create() {return accounts.save(actor,UUID.randomUUID().toString(),input("Private sender",0,"synthetic-password",true));}
    MockHttpSession session(){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,user);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,company);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    @Test void savesEncryptedSecretsAndReturnsOnlySafeProjection() throws Exception {
        var account=create();
        String ciphertext=db.queryForObject("SELECT smtp_secret FROM email_accounts WHERE company_id=? AND id=?",String.class,company,account.id());
        assertThat(ciphertext).startsWith("v1.").doesNotContain("synthetic-password");
        assertThat(json.writeValueAsString(account)).doesNotContain("synthetic-password","smtpPassword","smtp_secret");
        assertThat(json.writeValueAsString(accounts.senders(actor))).doesNotContain("smtpHost","smtpUsername","Password");
        assertThat(account.hasSmtpPassword()).isTrue();assertThat(account.smtpStatus()).isEqualTo("NOT_TESTED");
        var edited=accounts.save(actor,account.id(),input("Updated",1,"",true));
        assertThat(edited.version()).isEqualTo(2);
        assertThat(db.queryForObject("SELECT smtp_secret FROM email_accounts WHERE company_id=? AND id=?",String.class,company,account.id())).isEqualTo(ciphertext);
        assertThatThrownBy(()->accounts.save(actor,account.id(),input("Stale",1,"",true))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    @Test void ownerAndTenantIsolationAlsoApplyToPrivilegedUsers() {
        var account=create();
        var coworker=new AuthSessionUser(otherUser,company,"Admin","superadmin");
        assertThat(accounts.list(coworker).items()).isEmpty();assertThat(accounts.senders(coworker)).isEmpty();
        assertThatThrownBy(()->accounts.get(coworker,account.id())).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThatThrownBy(()->accounts.save(coworker,account.id(),input("Hijack",1,"",true))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThatThrownBy(()->accounts.get(new AuthSessionUser(user,other,"Other","superadmin"),account.id())).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThat(accounts.get(actor,account.id()).label()).isEqualTo("Private sender");
    }
    @Test void connectionChecksAreIndependentRateLimitedAndNeverSend() {
        var account=create();when(probe.verify(anyString(),anyString(),anyInt(),anyString(),anyString(),anyString())).thenReturn(true);
        var tested=accounts.test(actor,account.id(),new ConnectionTest(1,"SMTP"));
        assertThat(tested.smtpStatus()).isEqualTo("VERIFIED");assertThat(tested.receiveStatus()).isEqualTo("NOT_TESTED");
        verify(probe).verify("SMTP","smtp.example.com",465,"TLS","sender@example.com","synthetic-password");
        assertThatThrownBy(()->accounts.test(actor,account.id(),new ConnectionTest(1,"RECEIVE"))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        db.update("UPDATE email_accounts SET last_test_at=NULL WHERE company_id=? AND id=?",company,account.id());
        when(probe.verify(eq("IMAP"),anyString(),anyInt(),anyString(),anyString(),anyString())).thenReturn(false);
        var failed=accounts.test(actor,account.id(),new ConnectionTest(1,"RECEIVE"));
        assertThat(failed.receiveStatus()).isEqualTo("ERROR");assertThat(failed.smtpStatus()).isEqualTo("VERIFIED");
        assertThat(accounts.save(actor,account.id(),input("Changed settings",1,"",true)).smtpStatus()).isEqualTo("NOT_TESTED");
    }
    @Test void aStaleProbeCannotVerifyNewSettings() {
        var account=create();
        when(probe.verify(anyString(),anyString(),anyInt(),anyString(),anyString(),anyString())).thenAnswer(invocation->{
            accounts.save(actor,account.id(),input("New settings",1,"replacement-password",true));return true;
        });
        assertThatThrownBy(()->accounts.test(actor,account.id(),new ConnectionTest(1,"SMTP"))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThat(accounts.get(actor,account.id()).smtpStatus()).isEqualTo("NOT_TESTED");
    }
    @Test void connectionDiagnosticsAreAdditiveSafeAndPersistTheFailedStatus() throws Exception {
        var account=create();
        when(probe.verify(anyString(),anyString(),anyInt(),anyString(),anyString(),anyString()))
            .thenThrow(MailConnectionFailure.classify(new jakarta.mail.AuthenticationFailedException("synthetic-password provider-private-text")));
        String endpoint="/api/v1/email/accounts/"+account.id()+"/test";
        mvc.perform(post(endpoint).session(session()).header("X-CSRF-Token","synthetic-csrf")
            .contentType(MediaType.APPLICATION_JSON).content("{\"version\":1,\"channel\":\"SMTP\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(account.id()))
            .andExpect(jsonPath("$.smtpStatus").value("ERROR"))
            .andExpect(jsonPath("$.receiveStatus").value("NOT_TESTED"))
            .andExpect(jsonPath("$.failureCode").value("AUTHENTICATION_FAILED"))
            .andExpect(result->assertThat(result.getResponse().getContentAsString()).doesNotContain("synthetic-password","provider-private-text","smtpPassword","smtp_secret"));
        assertThat(accounts.get(actor,account.id()).smtpStatus()).isEqualTo("ERROR");
        db.update("UPDATE email_accounts SET last_test_at=NULL WHERE company_id=? AND id=?",company,account.id());
        doReturn(true).when(probe).verify(anyString(),anyString(),anyInt(),anyString(),anyString(),anyString());
        var recovered=accounts.testWithDiagnostic(actor,account.id(),new ConnectionTest(1,"SMTP"));
        assertThat(recovered.account().smtpStatus()).isEqualTo("VERIFIED");assertThat(recovered.failureCode()).isNull();
    }
    @Test void campaignStoresOnlyAnAuthorizedSenderReferenceAndDisconnectRevokesIt() {
        var account=create();String id=UUID.randomUUID().toString();
        var campaign=mailing.save(actor,id,new MailingContracts.DraftInput("Campaign","Subject","Clinic","sender@example.com","","Message",List.of(),0,account.id()));
        assertThat(campaign.senderAccountId()).isEqualTo(account.id());
        accounts.disconnect(actor,account.id(),1);
        assertThat(accounts.senders(actor)).isEmpty();assertThat(mailing.get(actor,id).bodyText()).isEqualTo("Message");
        assertThat(db.queryForObject("SELECT smtp_secret FROM email_accounts WHERE company_id=? AND id=?",String.class,company,account.id())).isEmpty();
        assertThatThrownBy(()->mailing.save(actor,id,new MailingContracts.DraftInput("Bad","","","","","",List.of(),1,account.id()))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThat(mailing.get(actor,id).version()).isEqualTo(1);
        assertThat(mailing.save(actor,id,new MailingContracts.DraftInput("Detached","","","","","",List.of(),1,null)).senderAccountId()).isNull();
    }
    @Test void mailingRequiresExplicitAccountOptIn() {
        var account=accounts.save(actor,UUID.randomUUID().toString(),input("Private",0,"synthetic",false));
        assertThat(accounts.senders(actor)).isEmpty();
        assertThatThrownBy(()->accounts.requireSender(actor,account.id())).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    @Test void endpointsRequireSessionCsrfTabAndEntitlement() throws Exception {
        String endpoint="/api/v1/email/accounts/"+UUID.randomUUID();String body=json.writeValueAsString(input("API account",0,"synthetic-password",true));
        mvc.perform(get("/api/v1/email/accounts")).andExpect(status().isUnauthorized());
        mvc.perform(put(endpoint).session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put(endpoint).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("$.smtpPassword").doesNotExist());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND module_slug='correo' AND tab_key='accounts'",membership);
        mvc.perform(get("/api/v1/email/accounts").session(session())).andExpect(status().isForbidden());
        // Sales projection needs Mailing, not the private account-settings tab.
        mvc.perform(get("/api/v1/mailing/senders").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$[0].email").value("sender@example.com"));
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='correo'",company);
        mvc.perform(get("/api/v1/mailing/senders").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void credentialValidationDoesNotEchoRejectedValues() throws Exception {
        String sensitive = "synthetic-sensitive-".repeat(130);
        var body=json.writeValueAsString(input("Validation",0,sensitive,false));
        mvc.perform(put("/api/v1/email/accounts/"+UUID.randomUUID()).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest()).andExpect(content().string("{\"code\":\"email_input_invalid\"}"));
    }
    @Test void insecurePortsAndMissingCredentialsAreRejected() throws Exception {
        var bad=new AccountInput("Bad","sender@example.com","Sender","smtp.example.com",25,"TLS","sender@example.com","synthetic","NONE","",993,"","",false,0);
        mvc.perform(put("/api/v1/email/accounts/"+UUID.randomUUID()).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(bad))).andExpect(status().isBadRequest());
        assertThatThrownBy(()->accounts.save(actor,UUID.randomUUID().toString(),input("No password",0,"",false))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
