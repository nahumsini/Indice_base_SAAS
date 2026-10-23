package com.indice.erp.security;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.*;
import com.indice.erp.auth.passwordreset.*;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.users.HrUserService;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false","app.web.public-url=http://localhost:5190"})
@Transactional
class HrIdentityIsolationIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired HrUserService hr;
    @Autowired PasswordResetService recovery;
    @MockitoBean PasswordResetEmailService resetEmail;
    long a,b,victim,manager,managerMembership,unit,business;
    String email;
    AuthSessionUser actor;
    @BeforeEach void setup(){
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        a=company();b=company();
        db.update("INSERT INTO units(company_id,name,status) VALUES(?,'Synthetic unit','active')",a);unit=id();
        db.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES(?,?,'Synthetic business','active')",a,unit);business=id();
        email=UUID.randomUUID()+"@example.invalid";
        victim=user(email,"Original Account Owner");membership(b,victim,"superadmin");
        db.update("INSERT INTO user_profiles(user_id,full_name,phone,country,preferred_language) VALUES(?,'Original Profile','+14165550100','CA','en-CA')",victim);
        manager=user(UUID.randomUUID()+"@example.invalid","HR Manager");managerMembership=membership(a,manager,"admin");
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id,business_id,position,department,status) VALUES(?,?,?,?,?,'HR Manager','HR','active')",a,managerMembership,manager,unit,business);
        actor=new AuthSessionUser(manager,a,managerMembership,"HR Manager","admin");
        when(resetEmail.sendPasswordReset(anyString(),anyString(),anyString())).thenReturn(EmailDeliveryResult.sentSuccessfully());
    }
    long company(){db.update("INSERT INTO companies(name) VALUES(?)","Security synthetic "+UUID.randomUUID());return id();}
    long user(String mail,String name){db.update("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-no-login',?)",mail,name);return id();}
    long membership(long company,long user,String role){db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,?,'active','all')",company,user,role);return id();}
    long id(){return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);}
    Map<String,Object> draft(String mail){var value=new LinkedHashMap<String,Object>();value.put("first_name","Work");value.put("last_name","Contact");value.put("email",mail);value.put("phone","+14165550101");value.put("position","Operator");value.put("department","Operations");value.put("salary","100");value.put("unit_id",unit);value.put("business_id",business);value.put("status","active");return value;}
    @Test void cannotAttachAnAccountFromAnotherCompanyWithoutAnAcceptedMembership(){
        assertThatThrownBy(()->hr.createUser(actor,draft(email))).isInstanceOf(HrAccessDeniedException.class);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM user_companies WHERE company_id=? AND user_id=?",Integer.class,a,victim)).isZero();
        assertThat(db.queryForObject("SELECT full_name FROM users WHERE id=?",String.class,victim)).isEqualTo("Original Account Owner");
    }
    @Test void acceptedMembershipAllowsWorkProfileButDoesNotRewriteGlobalIdentity(){
        long member=membership(a,victim,"user");
        hr.createUser(actor,draft(email));
        var updates=draft("changed-work-contact@example.invalid");
        hr.updateUser(actor,member,updates);
        assertThat(db.queryForObject("SELECT email FROM users WHERE id=?",String.class,victim)).isEqualTo(email);
        assertThat(db.queryForObject("SELECT full_name FROM users WHERE id=?",String.class,victim)).isEqualTo("Original Account Owner");
        assertThat(db.queryForObject("SELECT phone FROM user_profiles WHERE user_id=?",String.class,victim)).isEqualTo("+14165550100");
        assertThat(db.queryForObject("SELECT email FROM hr_users WHERE company_id=? AND id=?",String.class,a,member)).isEqualTo("changed-work-contact@example.invalid");
        assertThat(db.queryForObject("SELECT full_name FROM hr_users WHERE company_id=? AND id=?",String.class,a,member)).isEqualTo("Work Contact");
        assertThat(db.queryForObject("SELECT email FROM hr_users WHERE company_id=? AND user_id=?",String.class,b,victim)).isEqualTo(email);
        recovery.requestReset(email,"http://localhost:5190","127.0.0.1","synthetic-browser");
        verify(resetEmail).sendPasswordReset(eq(email),anyString(),anyString());
        verify(resetEmail,never()).sendPasswordReset(eq("changed-work-contact@example.invalid"),anyString(),anyString());
    }
    @Test void cannotElevateOwnRoleThroughAnyAliasOrNestedPayload(){
        for(String alias:List.of("role","user_role","access_role")){
            var payload=draft(UUID.randomUUID()+"@example.invalid");payload.put(alias,"root");
            assertThatThrownBy(()->hr.updateUser(actor,managerMembership,Map.of("user",payload))).isInstanceOf(HrAccessDeniedException.class);
        }
        assertThat(db.queryForObject("SELECT role FROM user_companies WHERE company_id=? AND id=?",String.class,a,managerMembership)).isEqualTo("admin");
    }
    @Test void cannotCreateAPrivilegedUserOrChangeAnotherTenant(){
        var payload=draft(UUID.randomUUID()+"@example.invalid");payload.put("role","superadmin");
        assertThatThrownBy(()->hr.createUser(actor,payload)).isInstanceOf(HrAccessDeniedException.class);
        long foreign=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,b,victim);
        assertThatThrownBy(()->hr.updateUser(actor,foreign,draft(email))).isInstanceOf(NoSuchElementException.class);
    }
    @Test void employmentEditsCannotRestoreAdministrativelyDisabledAccess(){
        long member=membership(a,victim,"user");hr.createUser(actor,draft(email));
        db.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND id=?",a,member);
        hr.updateUser(actor,member,draft("work-contact@example.invalid"));
        assertThat(db.queryForObject("SELECT status FROM user_companies WHERE company_id=? AND id=?",String.class,a,member)).isEqualTo("inactive");
    }
    @Test void creationCannotBypassTheScopedEmployeeUpdateAction(){
        membership(a,victim,"user");hr.createUser(actor,draft(email));
        assertThatThrownBy(()->hr.createUser(actor,draft(email))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void newEmployeeRemainsAnOrdinaryUser(){
        String mail=UUID.randomUUID()+"@example.invalid";hr.createUser(actor,draft(mail));
        assertThat(db.queryForObject("SELECT uc.role FROM user_companies uc JOIN users u ON u.id=uc.user_id WHERE uc.company_id=? AND u.email=?",String.class,a,mail)).isEqualTo("user");
    }
}
