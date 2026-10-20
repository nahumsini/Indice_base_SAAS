package com.indice.erp.auth.passwordreset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.*;
import com.indice.erp.auth.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.*;

@SpringBootTest(properties={"app.auth.local-mfa-bypass-enabled=true","app.auth.mfa-required=false",
 "server.address=127.0.0.1","app.web.public-url=http://localhost:5204","app.email.enabled=false",
 "app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false",
 "app.entitlements.enforcement-enabled=false","app.entitlements.projection-enabled=false"})
@ActiveProfiles("local")
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
@Transactional
class PasswordRecoveryFlowIntegrationTest {
 static final String OLD=" exact synthetic old password ",NEXT=" exact synthetic new password ";
 @Autowired MockMvc http; @Autowired JdbcTemplate db; @Autowired ObjectMapper json;
 @Autowired BCryptPasswordEncoder encoder; @Autowired PasswordResetService reset;
 @Autowired SessionAuthService sessions; @Autowired LoginMfaChallengeService mfa;
 @MockitoBean PasswordResetEmailService mail; @MockitoBean LoginOtpEmailService otpMail;
 final AtomicReference<String> lastLink=new AtomicReference<>(),otp=new AtomicReference<>();
 @BeforeEach void delivery(){
  assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
  when(mail.sendPasswordReset(anyString(),anyString(),anyString())).thenAnswer(call->{lastLink.set(call.getArgument(2));return EmailDeliveryResult.sentSuccessfully();});
  when(otpMail.sendOtp(any(),anyString(),anyInt())).thenAnswer(call->{otp.set(call.getArgument(1));return new LoginOtpEmailService.DeliveryResult(true,"sent","");});
 }
 record Account(long user,long company,String name,String email){}
 Account account(){String suffix=UUID.randomUUID().toString(),name="Synthetic recovery "+suffix,email=suffix+"@example.invalid";
  db.update("INSERT INTO companies(name) VALUES (?)",name);long company=id();
  db.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,?,'Synthetic Recovery')",email,encoder.encode(OLD));long user=id();
  db.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES (?,?,'user','active','all')",user,company);long membership=id();
  db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role,skill_level) VALUES (?,'config_center','viewer',0)",membership);
  new com.indice.erp.configcenter.users.ConfigCenterTabPermissionAccess(db).replaceUserTabPermissions(membership,List.of("config_center.profile"),List.of("config_center"));
  return new Account(user,company,name,email);
 }
 long id(){return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);}
 record Browser(MockHttpSession session,String csrf){}
 Browser browser()throws Exception{var r=http.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();return new Browser((MockHttpSession)r.getRequest().getSession(false),json.readTree(r.getResponse().getContentAsString()).path("csrfToken").asText());}
 MockHttpSession login(Account a,String password,int status)throws Exception{var b=browser();var r=http.perform(post("/api/v1/auth/login").session(b.session()).header("X-CSRF-Token",b.csrf()).contentType(APPLICATION_JSON).content(json.writeValueAsString(Map.of("companyName",a.name(),"email",a.email(),"password",password)))).andExpect(status().is(status)).andReturn();return (MockHttpSession)r.getRequest().getSession(false);}
 String request(Account a)throws Exception{var r=http.perform(post("/api/v1/auth/password-reset/request").contentType(APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",a.email())))).andExpect(status().isOk()).andExpect(jsonPath("$.token").doesNotExist()).andReturn();assertThat(json.readTree(r.getResponse().getContentAsString()).path("message").asText()).isEqualTo(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE);return lastLink.get().substring(lastLink.get().lastIndexOf('/')+1);}
 void complete(String token,String password,int status)throws Exception{http.perform(post("/api/v1/auth/password-reset/{token}/complete",token).contentType(APPLICATION_JSON).content(json.writeValueAsString(Map.of("password",password,"confirm_password",password)))).andExpect(status().is(status));}
 @Test void requestChangeAndLoginPreserveAccessInvalidateOldSessionsAndUnlockPasswordFailures()throws Exception{
  var a=account();var oldSession=login(a,OLD,200);
  var login=sessions.verifyLoginCredentials(a.name(),a.email(),OLD).login();
  var challenge=mfa.startChallenge(login,"synthetic-browser",LoginAuditContext.empty());assertThat(challenge.started()).isTrue();
  for(int attempt=1;attempt<=5;attempt++)login(a,"synthetic wrong password",attempt==5?423:401);
  String token=request(a);http.perform(get("/api/v1/auth/password-reset/{token}",token)).andExpect(status().isOk()).andExpect(jsonPath("$.valid").value(true));
  complete(token,NEXT,200);complete(token,NEXT,400);
  http.perform(get("/api/v1/auth/me").session(oldSession)).andExpect(status().isUnauthorized());
  assertThat(mfa.verify(challenge.challengeReference(),otp.get(),"synthetic-browser",LoginAuditContext.empty()).success()).isFalse();
  login(a,OLD,401);var fresh=login(a,NEXT,200);
  var response=http.perform(get("/api/v1/auth/me").session(fresh)).andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("user")).andExpect(jsonPath("$.company.id").value(a.company())).andReturn();
  assertThat(json.convertValue(json.readTree(response.getResponse().getContentAsString()).path("user").path("tab_permission_keys"),List.class)).containsExactly("config_center.profile");
 }
 @Test void failedDeliveryKeepsTheOldLinkAndSuccessfulResendReplacesIt()throws Exception{
  var a=account();String old=request(a);
  when(mail.sendPasswordReset(anyString(),anyString(),anyString())).thenReturn(EmailDeliveryResult.disabled());request(a);
  http.perform(get("/api/v1/auth/password-reset/{token}",old)).andExpect(status().isOk());
  when(mail.sendPasswordReset(anyString(),anyString(),anyString())).thenAnswer(call->{lastLink.set(call.getArgument(2));return EmailDeliveryResult.sentSuccessfully();});String next=request(a);
  http.perform(get("/api/v1/auth/password-reset/{token}",old)).andExpect(status().isNotFound());complete(next,NEXT,200);
 }
 @Test void expiredOversizedAndBlankPasswordsLeaveCredentialsAndTokenUnchanged()throws Exception{
  var a=account();String token=request(a);complete(token,"🙂".repeat(25),400);complete(token,"        ",400);
  assertThat(encoder.matches(OLD,db.queryForObject("SELECT password_hash FROM users WHERE id=?",String.class,a.user()))).isTrue();
  db.update("UPDATE user_password_reset_tokens SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 MINUTE) WHERE user_id=?",a.user());complete(token,NEXT,400);
 }
 @Test void knownUnknownAndLimitedRequestsDoNotRevealAccountExistence()throws Exception{
  var a=account();for(int i=0;i<7;i++)request(a);
  assertThat(db.queryForObject("SELECT COUNT(*) FROM user_password_reset_tokens WHERE user_id=? AND status='active'",Integer.class,a.user())).isEqualTo(1);
  http.perform(post("/api/v1/auth/password-reset/request").contentType(APPLICATION_JSON).content("{\"email\":\"synthetic-missing@example.invalid\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.message").value(PasswordResetService.GENERIC_RESET_REQUEST_MESSAGE));
 }
 @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
 void simultaneousUseChangesThePasswordOnlyOnce()throws Exception{
  var a=account();String token=request(a);var gate=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
  try{var first=pool.submit(()->use(token,NEXT,gate));var second=pool.submit(()->use(token,"another synthetic password",gate));gate.countDown();assertThat(List.of(first.get(45,TimeUnit.SECONDS),second.get(45,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);}finally{pool.shutdownNow();}
 }
 boolean use(String token,String password,CountDownLatch gate){try{gate.await();reset.completeReset(token,password,password);return true;}catch(Exception error){return false;}}
}
