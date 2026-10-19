package com.indice.erp.configcenter.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.configcenter.ConfigCenterService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Real HTTP owners and session/authorization against the isolated test database. */
@SpringBootTest(properties = {
    "app.auth.local-mfa-bypass-enabled=true", "app.auth.mfa-required=false",
    "server.address=127.0.0.1", "app.web.public-url=http://localhost:5203",
    "app.email.enabled=false", "app.mail-accounts.worker-enabled=false", "app.mailing.worker-enabled=false",
    "app.entitlements.enforcement-enabled=false", "app.entitlements.projection-enabled=false"
})
@ActiveProfiles("local")
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class InvitationEntryFlowIntegrationTest {
    private static final String PASSWORD = " exact synthetic password ";
    @Autowired JdbcTemplate db;
    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired BCryptPasswordEncoder encoder;
    @Autowired ConfigCenterService users;

    record Account(long company, long user, String companyName, String email) {}
    record SignedIn(MockHttpSession session, JsonNode body) {
        String csrf() { return body.path("csrfToken").asText(); }
    }
    long id() { return db.queryForObject("SELECT LAST_INSERT_ID()", Long.class); }
    Account company() {
        assertThat(db.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        String suffix = UUID.randomUUID().toString();
        String name = "Synthetic entry " + suffix, email = suffix + "@example.invalid";
        db.update("INSERT INTO companies(name) VALUES (?)", name); long company = id();
        db.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,?,'Synthetic Administrator')", email, encoder.encode(PASSWORD)); long user = id();
        db.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES (?,?,'root','active','all')", user, company);
        for (String module : List.of("config_center", "human_resources", "crm"))
            db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES (?,?,'active','test')", company, module);
        return new Account(company,user,name,email);
    }
    SignedIn login(String company, String email) throws Exception {
        var start = http.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) start.getRequest().getSession(false);
        String csrf = json.readTree(start.getResponse().getContentAsString()).path("csrfToken").asText();
        var result = http.perform(post("/api/v1/auth/login").session(session).header("X-CSRF-Token",csrf)
            .contentType(APPLICATION_JSON).content(json.writeValueAsString(Map.of("companyName",company,"email",email,"password",PASSWORD))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.user.id").exists()).andReturn();
        return new SignedIn((MockHttpSession)result.getRequest().getSession(false),json.readTree(result.getResponse().getContentAsString()));
    }
    String invite(Account company, String email, Long unit, Long business) throws Exception {
        var admin = login(company.companyName(),company.email());
        var payload = new LinkedHashMap<String,Object>();
        payload.put("name","Synthetic Invitee"); payload.put("email",email); payload.put("role","user");
        payload.put("module_slugs",List.of("config_center","human_resources"));
        payload.put("tab_permission_keys",List.of("config_center.profile","human_resources.attendance"));
        payload.put("unit_id",unit); payload.put("business_id",business); payload.put("kiosk_definition_ids",List.of());
        var result = http.perform(post("/api/v1/config-center/users/invite").session(admin.session()).header("X-CSRF-Token",admin.csrf())
            .contentType(APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isCreated()).andReturn();
        String link=json.readTree(result.getResponse().getContentAsString()).path("invite_link").asText();
        return link.substring(link.lastIndexOf('/')+1);
    }
    void accept(String token, String password, int expectedStatus) throws Exception {
        http.perform(post("/api/v1/invitations/{token}/accept",token).contentType(APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("password",password,"confirm_password",password))))
            .andExpect(status().is(expectedStatus));
    }
    @Test void invitationToLoginEnforcesExactAssignedModulesTabsScopeAndLaterRevocation() throws Exception {
        var company=company(); String email=UUID.randomUUID()+"@example.invalid";
        db.update("INSERT INTO units(company_id,name,status) VALUES (?,'Synthetic Unit','active')",company.company());long unit=id();
        db.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES (?,?,'Synthetic Branch','active')",company.company(),unit);long business=id();
        String token=invite(company,email,unit,business);
        http.perform(get("/api/v1/invitations/{token}",token)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("pending"));
        accept(token,PASSWORD,200);accept(token,PASSWORD,400);
        var signed=login(company.companyName(),email);
        assertThat(signed.body().path("user").path("role").asText()).isEqualTo("user");
        assertThat(json.convertValue(signed.body().path("user").path("module_slugs"),List.class)).containsExactlyInAnyOrder("config_center","human_resources");
        assertThat(json.convertValue(signed.body().path("user").path("tab_permission_keys"),List.class)).containsExactlyInAnyOrder("config_center.profile","human_resources.attendance");
        assertThat(signed.body().path("company").path("scope").path("business_id").asLong()).isEqualTo(business);
        assertThat(signed.body().path("company").path("scope").path("unit_id").asLong()).isEqualTo(unit);
        var modules=http.perform(get("/api/v1/modules").session(signed.session()).header("X-CSRF-Token",signed.csrf())).andExpect(status().isOk()).andReturn();
        List<String> slugs=new ArrayList<>(); json.readTree(modules.getResponse().getContentAsString()).forEach(row->slugs.add(row.path("slug").asText()));
        assertThat(slugs).containsExactlyInAnyOrder("config_center","human_resources");
        http.perform(get("/api/v1/config-center/current-user").session(signed.session())).andExpect(status().isOk());
        for(String path:List.of("/api/v1/config-center/users","/api/v1/config-center/company"))
            http.perform(get(path).session(signed.session())).andExpect(status().isForbidden());
        http.perform(post("/api/v1/config-center/users/invite").session(signed.session()).header("X-CSRF-Token",signed.csrf()).contentType(APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
        long user=signed.body().path("user").path("id").asLong();
        users.deleteUser(company.company(),company.user(),"root",user);
        http.perform(get("/api/v1/auth/me").session(signed.session())).andExpect(status().isUnauthorized());
    }
    @Test void existingAccountJoinsAnotherCompanyWithoutChangingItsOriginalMembership() throws Exception {
        var original=company(); var target=company();
        String token=invite(target,original.email(),null,null);accept(token,PASSWORD,200);
        var joined=login(target.companyName(),original.email());
        assertThat(joined.body().path("user").path("id").asLong()).isEqualTo(original.user());
        assertThat(joined.body().path("user").path("role").asText()).isEqualTo("user");
        assertThat(login(original.companyName(),original.email()).body().path("user").path("role").asText()).isEqualTo("root");
    }
    @Test void archivedScopeAndOversizedPasswordCannotCreateAnUnusableMembership() throws Exception {
        var company=company();String email=UUID.randomUUID()+"@example.invalid";
        db.update("INSERT INTO units(company_id,name,status) VALUES (?,'Synthetic Unit','active')",company.company());long unit=id();
        String token=invite(company,email,unit,null);
        accept(token,"🙂".repeat(30),400);
        db.update("UPDATE units SET status='inactive' WHERE id=?",unit);accept(token,PASSWORD,400);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM users WHERE email=?",Integer.class,email)).isZero();
        assertThat(db.queryForObject("SELECT status FROM user_invitations WHERE token=?",String.class,token)).isEqualTo("pending");
    }
    @Test void deletedCompanyCannotCreateAMembershipFromAnOlderInvitation() throws Exception {
        var company=company();String email=UUID.randomUUID()+"@example.invalid";
        String token=invite(company,email,null,null);
        db.update("UPDATE companies SET platform_status='DELETED' WHERE id=?",company.company());
        accept(token,PASSWORD,400);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM users WHERE email=?",Integer.class,email)).isZero();
    }
}
