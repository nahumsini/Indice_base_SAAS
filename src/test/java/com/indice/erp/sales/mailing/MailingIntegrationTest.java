package com.indice.erp.sales.mailing;

import com.indice.erp.auth.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.sales.mailing.MailingContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.email.enabled=false"})
@AutoConfigureMockMvc
@Transactional
class MailingIntegrationTest {
    @Autowired MailingTemplateService templateService;
    @Autowired JdbcTemplate db;@Autowired MailingService service;@Autowired MockMvc mvc;@Autowired ObjectMapper mapper;
    long company,other,user,membership,contact,foreignContact;AuthSessionUser actor;
    long insert(String sql,Object...args){var key=new GeneratedKeyHolder();db.update(c->{var s=c.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);return key.getKey().longValue();}
    @BeforeEach void setup(){
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        company=insert("INSERT INTO companies(name) VALUES(?)","Mailing "+UUID.randomUUID());other=insert("INSERT INTO companies(name) VALUES(?)","Other "+UUID.randomUUID());
        user=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-only','Mailing test')","mailing-"+UUID.randomUUID()+"@example.com");
        membership=insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'admin','active')",user,company);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')",company);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'crm','admin')",membership);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','mailing'),(?,'crm','contacts')",membership,membership);
        contact=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'TEST-1','Synthetic contact','contact@example.com')",company);
        foreignContact=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'TEST-2','Foreign contact','other@example.com')",other);
        actor=new AuthSessionUser(user,company,"Mailing test","admin");
    }
    DraftInput input(String name,long version,List<Long> ids){return new DraftInput(name,"Subject","Sender","reply@example.com","Preview","Hello {{name}}",ids,version);}
    MockHttpSession session(){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,user);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,company);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    @Test void draftPersistsAndRejectsStaleRetriesWithoutDuplicates(){
        String id=UUID.randomUUID().toString();var saved=service.save(actor,id,input("Draft",0,List.of(contact,contact)));
        assertThat(saved.version()).isEqualTo(1);assertThat(saved.recipients()).hasSize(1);assertThat(saved.recipientCount()).isEqualTo(1);
        assertThatThrownBy(()->service.save(actor,id,input("Retry",0,List.of(contact)))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        var updated=service.save(actor,id,input("Updated",1,List.of(contact)));assertThat(updated.version()).isEqualTo(2);
        assertThat(service.get(actor,id).bodyText()).isEqualTo("Hello {{name}}");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_campaigns WHERE company_id=?",Long.class,company)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_audit WHERE company_id=?",Long.class,company)).isEqualTo(2);
    }
    @Test void tenantAndContactOwnershipAreEnforcedAndFailedUpdateIsAtomic(){
        String id=UUID.randomUUID().toString();service.save(actor,id,input("Original",0,List.of(contact)));
        assertThatThrownBy(()->service.get(new AuthSessionUser(user,other,"Other","admin"),id)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThatThrownBy(()->service.save(actor,id,input("Bad change",1,List.of(foreignContact)))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThat(service.get(actor,id).name()).isEqualTo("Original");assertThat(service.get(actor,id).version()).isEqualTo(1);
        assertThat(service.contacts(actor,"Foreign",1,25).total()).isZero();
        db.update("UPDATE sales_contacts SET deleted_at=NOW() WHERE company_id=? AND id=?",company,contact);
        assertThatThrownBy(()->service.save(actor,id,input("Removed contact",1,List.of(contact)))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    @Test void uniqueEmailCountDoesNotClaimInvalidOrDuplicateAddresses(){
        long duplicate=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'DUP','Duplicate','CONTACT@example.com')",company);
        long invalid=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'BAD','Invalid','not-an-email')",company);
        var saved=service.save(actor,UUID.randomUUID().toString(),input("Audience",0,List.of(contact,duplicate,invalid)));
        assertThat(saved.recipients()).hasSize(3);assertThat(saved.recipientCount()).isEqualTo(1);
    }
    @Test @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void endpointRequiresSessionCsrfModuleAndDedicatedTab() throws Exception {
        String url="/api/v1/mailing/campaigns/"+UUID.randomUUID();String body=mapper.writeValueAsString(input("Draft",0,List.of(contact)));
        mvc.perform(get("/api/v1/mailing/campaigns")).andExpect(status().isUnauthorized());
        mvc.perform(put(url).session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put(url).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='mailing'",membership);
        mvc.perform(get("/api/v1/mailing/campaigns").session(session())).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','mailing')",membership);
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='crm'",company);
        mvc.perform(get("/api/v1/mailing/campaigns").session(session())).andExpect(status().isForbidden());
    }
    @Test void editingRequiresCurrentAdministratorAndContactAccess() throws Exception {
        db.update("UPDATE user_companies SET role='user' WHERE company_id=? AND id=?",company,membership);
        mvc.perform(put("/api/v1/mailing/campaigns/"+UUID.randomUUID()).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input("Draft",0,List.of(contact))))).andExpect(status().isForbidden());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='contacts'",membership);
        mvc.perform(get("/api/v1/mailing/contacts").session(session())).andExpect(status().isForbidden());
    }

    @Test void sharedFormattedTemplatesCarryIntoCampaignsWithoutLosingLegacyText() {
        String id=UUID.randomUUID().toString();String html="<p style='color:#2563eb'><b>Hello {{name}}</b></p>";
        var saved=templateService.save(actor,id,new MailingTemplateContracts.TemplateInput("Styled","Subject","","Hello {{name}}",0,html));
        assertThat(saved.bodyHtml()).contains("color:#2563eb");
        var legacy=templateService.save(actor,id,new MailingTemplateContracts.TemplateInput("Renamed","Subject","","Hello {{name}}",saved.version()));
        assertThat(legacy.bodyHtml()).isEqualTo(saved.bodyHtml());
        var campaign=service.save(actor,UUID.randomUUID().toString(),new DraftInput("Campaign","Subject","Team","","","Hello {{name}}",List.of(),0,null,saved.bodyHtml()));
        assertThat(campaign.bodyHtml()).isEqualTo(saved.bodyHtml());
        assertThat(MailingDeliveryService.formatted(campaign,"<img src=x>","Footer")).contains("&lt;img src=x&gt;","Footer").doesNotContain("<img src=x>");
        var plain=templateService.save(actor,id,new MailingTemplateContracts.TemplateInput("Renamed","Subject","","Changed text",legacy.version()));
        assertThat(plain.bodyHtml()).isNull();
        assertThat(templateService.get(actor,id).bodyText()).isEqualTo("Changed text");
    }
    MailingTemplateContracts.TemplateInput template(String name,long version) {
        return new MailingTemplateContracts.TemplateInput(name,"Template subject","Template preview","Hello {{name}}",version);
    }
    @Test void templatesPersistVersionArchiveAndRestoreWithoutDeletingHistory() {
        String id=UUID.randomUUID().toString();var created=templateService.save(actor,id,template("Welcome",0));
        assertThat(created.status()).isEqualTo("ACTIVE");
        assertThat(templateService.get(actor,id).bodyText()).isEqualTo("Hello {{name}}");
        assertThatThrownBy(()->templateService.save(actor,id,template("Duplicate retry",0))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        var edited=templateService.save(actor,id,template("Updated welcome",1));
        assertThat(edited.version()).isEqualTo(2);
        var archived=templateService.status(actor,id,new MailingTemplateContracts.TemplateStatus("ARCHIVED",2));
        assertThat(templateService.list(actor,"","ACTIVE",1,25,"updatedAt","desc").total()).isZero();
        assertThat(templateService.list(actor,"Updated","ARCHIVED",1,25,"name","asc").total()).isEqualTo(1);
        assertThatThrownBy(()->templateService.status(actor,id,new MailingTemplateContracts.TemplateStatus("ACTIVE",2))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        var restored=templateService.status(actor,id,new MailingTemplateContracts.TemplateStatus("ACTIVE",archived.version()));
        assertThat(restored.status()).isEqualTo("ACTIVE");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_template_audit WHERE company_id=? AND template_id=?",Long.class,company,id)).isEqualTo(4);
    }
    @Test void templateTenantBoundariesAndCampaignCopiesRemainIndependent() {
        String id=UUID.randomUUID().toString();var source=templateService.save(actor,id,template("Welcome",0));
        var outsider=new AuthSessionUser(user,other,"Other company","admin");
        assertThatThrownBy(()->templateService.get(outsider,id)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThat(templateService.list(outsider,"","ALL",1,25,"updatedAt","desc").total()).isZero();
        String campaignId=UUID.randomUUID().toString();
        service.save(actor,campaignId,new DraftInput("Campaign copy",source.subject(),"Sender","reply@example.com",source.previewText(),source.bodyText(),List.of(contact),0));
        templateService.save(actor,id,new MailingTemplateContracts.TemplateInput("Changed","Different subject","","Different body",source.version()));
        assertThat(service.get(actor,campaignId).bodyText()).isEqualTo("Hello {{name}}");
        assertThat(service.get(actor,campaignId).subject()).isEqualTo("Template subject");
        assertThatThrownBy(()->templateService.save(new AuthSessionUser(user,company,"Reader","user"),id,template("Unauthorized",2))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    @Test @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void templateEndpointsRequireCsrfMailingAndCurrentAdministrator() throws Exception {
        String id=UUID.randomUUID().toString();String url="/api/v1/mailing/templates/"+id;
        String body=mapper.writeValueAsString(template("Endpoint template",0));
        mvc.perform(get("/api/v1/mailing/templates")).andExpect(status().isUnauthorized());
        mvc.perform(put(url).session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='contacts'",membership);
        mvc.perform(put(url).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(get(url).session(session())).andExpect(status().isOk());
        mvc.perform(put("/api/v1/mailing/templates/"+UUID.randomUUID()).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new MailingTemplateContracts.TemplateInput("Blank","","","",0)))).andExpect(status().isBadRequest());
        db.update("UPDATE user_companies SET role='user' WHERE company_id=? AND id=?",company,membership);
        mvc.perform(post(url+"/status").session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ARCHIVED\",\"version\":1}")).andExpect(status().isForbidden());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='mailing'",membership);
        mvc.perform(get("/api/v1/mailing/templates").session(session())).andExpect(status().isForbidden());
    }
}
