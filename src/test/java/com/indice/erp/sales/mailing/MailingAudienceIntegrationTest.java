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

@SpringBootTest(properties={"app.email.enabled=false","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
@Transactional
class MailingAudienceIntegrationTest {
    @Autowired MailingTemplateService templateService;
    @Autowired MailingAudienceService audience;
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
    MailingAudienceContracts.Filters filters(String search,String source,Long owner,String tag,String state) {return new MailingAudienceContracts.Filters(search,source,owner,tag,"",state,"name","asc");}
    @Test void directoryFiltersPersonOwnerSourceAndTagsAcrossPages() {
        db.update("UPDATE sales_contacts SET contact_person='Ricardo',owner_user_company_id=?,owner_name='Test seller',source='website',tags_json=JSON_ARRAY('clinic','active') WHERE id=? AND company_id=?",membership,contact,company);
        var page=audience.contacts(actor,filters("Ricardo","website",membership,"clinic","READY"),1,10);
        assertThat(page.total()).isEqualTo(1);assertThat(page.items().getFirst().name()).isEqualTo("Ricardo");assertThat(page.items().getFirst().companyName()).isEqualTo("Synthetic contact");
        assertThat(audience.contacts(actor,filters("","other",null,"",""),1,10).total()).isZero();
        assertThat(audience.contacts(actor,filters("Foreign","",null,"",""),1,10).total()).isZero();
        assertThat(audience.options(actor).tags()).containsExactly("active","clinic");assertThat(audience.options(actor).owners()).hasSize(1);assertThat(audience.options(actor).sources()).containsExactly("website");
    }
    @Test void selectionNeverTruncatesBeyondFiveHundredAndSearchCanNarrowIt() {
        for(int i=0;i<500;i++)db.update("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,?,?,?)",company,"BULK-"+i,"Bulk "+i,"bulk"+i+"@example.com");
        assertThatThrownBy(()->audience.selection(actor,filters("","",null,"",""))).hasMessageContaining("mailing_selection_limit");
        assertThat(audience.selection(actor,filters("Bulk","",null,"",""))).hasSize(500);
        assertThat(audience.contacts(actor,filters("Bulk","",null,"",""),2,25).items()).hasSize(25);
    }
    @Test void previewUsesAddressesAndUnsubscribesWithoutCreatingConsent() {
        long duplicate=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'DUP','Duplicate','CONTACT@example.com')",company);
        long invalid=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'BAD','Invalid','broken')",company);
        var first=audience.preview(actor,List.of(contact,duplicate,invalid));assertThat(first.consentRequired()).isZero();assertThat(first.excluded()).isEqualTo(2);assertThat(first.ready()).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_permissions WHERE company_id=?",Long.class,company)).isZero();
        db.update("INSERT INTO sales_mailing_permissions(company_id,email,status,evidence,recorded_by,recorded_at) VALUES(?,'contact@example.com','CONSENTED','Synthetic evidence',?,NOW())",company,user);
        assertThat(audience.preview(actor,List.of(contact)).ready()).isEqualTo(1);
        db.update("UPDATE sales_mailing_permissions SET status='SUPPRESSED' WHERE company_id=?",company);
        assertThat(audience.preview(actor,List.of(contact)).items().getFirst().eligibility()).isEqualTo("SUPPRESSED");
        assertThatThrownBy(()->audience.preview(actor,List.of(foreignContact))).hasMessageContaining("mailing_contact_unavailable");
    }
    @Test void listsPersistMembershipUpdateWithVersionArchiveAndKeepCampaignsIndependent() {
        String id=UUID.randomUUID().toString();var saved=audience.save(actor,id,new MailingAudienceContracts.ListInput("Clinics",List.of(contact,contact),0));
        assertThat(saved.contactCount()).isEqualTo(1);assertThat(audience.list(actor,id).items()).hasSize(1);
        assertThatThrownBy(()->audience.save(actor,id,new MailingAudienceContracts.ListInput("Retry",List.of(contact),0))).hasMessageContaining("mailing_version_conflict");
        String campaign=UUID.randomUUID().toString();service.save(actor,campaign,input("Campaign",0,List.of(contact)));
        assertThatThrownBy(()->audience.save(actor,id,new MailingAudienceContracts.ListInput("Bad",List.of(foreignContact),1))).hasMessageContaining("mailing_contact_unavailable");
        assertThat(audience.list(actor,id).list().name()).isEqualTo("Clinics");
        var updated=audience.save(actor,id,new MailingAudienceContracts.ListInput("Renamed",List.of(contact),1));assertThat(updated.version()).isEqualTo(2);
        db.update("UPDATE sales_contacts SET status='inactive' WHERE company_id=? AND id=?",company,contact);
        assertThat(audience.list(actor,id).unavailable()).isEqualTo(1);assertThat(audience.list(actor,id).items()).isEmpty();
        audience.archive(actor,id,2);assertThat(audience.lists(actor)).isEmpty();assertThat(service.get(actor,campaign).recipients()).hasSize(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_mailing_audience_events WHERE company_id=? AND list_id=?",Long.class,company,id)).isEqualTo(3);
    }
    @Test void historyShowsDraftParticipationAndActualDeliverySnapshotWithoutClaimingDelivery() {
        String campaign=UUID.randomUUID().toString();service.save(actor,campaign,input("Campaign",0,List.of(contact)));
        assertThat(audience.history(actor,contact,1,10).items().getFirst().deliveryState()).isEqualTo("DRAFT");
        db.update("UPDATE sales_mailing_campaigns SET status='COMPLETED' WHERE company_id=? AND id=?",company,campaign);
        db.update("INSERT INTO sales_mailing_deliveries(company_id,campaign_id,id,contact_id,email,name,state,completed_at) VALUES(?,?,?,?,?,?,'ACCEPTED',NOW())",company,campaign,UUID.randomUUID().toString(),contact,"original@example.com","Snapshot");
        var history=audience.history(actor,contact,1,10);assertThat(history.total()).isEqualTo(1);assertThat(history.items().getFirst().email()).isEqualTo("original@example.com");assertThat(history.items().getFirst().deliveryState()).isEqualTo("ACCEPTED");
        assertThatThrownBy(()->audience.history(actor,foreignContact,1,10)).hasMessageContaining("mailing_contact_unavailable");
    }
    @Test void audienceEndpointsRequireSessionTabsCsrfAndMutationRole() throws Exception {
        String id=UUID.randomUUID().toString(),url="/api/v1/mailing/audience/lists/"+id;
        String body=mapper.writeValueAsString(new MailingAudienceContracts.ListInput("List",List.of(contact),0));
        mvc.perform(get("/api/v1/mailing/audience")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/mailing/audience").session(session()).param("sort","name;DROP TABLE x")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/mailing/audience").session(session()).param("pageSize","501")).andExpect(status().isBadRequest());
        mvc.perform(put(url).session(session()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put(url).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(post(url+"/archive").session(session()).contentType(MediaType.APPLICATION_JSON).content("{\"version\":1}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/mailing/audience/preview").session(session()).contentType(MediaType.APPLICATION_JSON).content("{\"contactIds\":[]}")).andExpect(status().isForbidden());
        db.update("UPDATE user_companies SET role='user' WHERE company_id=? AND id=?",company,membership);
        mvc.perform(put(url).session(session()).header("X-CSRF-Token","synthetic-csrf").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='mailing'",membership);
        mvc.perform(get("/api/v1/mailing/contacts/"+contact+"/history").session(session())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/mailing/audience/options").session(session())).andExpect(status().isForbidden());
    }
    @Test void otherTenantListsCannotBeReadReusedOrArchived() {
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO sales_mailing_audience_lists(company_id,id,name,created_by,updated_by) VALUES(?,?,'Private list',?,?)",other,id,user,user);
        db.update("INSERT INTO sales_mailing_audience_members(company_id,list_id,contact_id) VALUES(?,?,?)",other,id,foreignContact);
        assertThat(audience.lists(actor)).isEmpty();
        assertThatThrownBy(()->audience.list(actor,id)).hasMessageContaining("mailing_list_not_found");
        assertThatThrownBy(()->audience.archive(actor,id,1)).hasMessageContaining("mailing_list_not_found");
        var filter=new MailingAudienceContracts.Filters("","",null,"",id,"","name","asc");
        assertThatThrownBy(()->audience.selection(actor,filter)).hasMessageContaining("mailing_list_not_found");
        assertThat(db.queryForObject("SELECT status FROM sales_mailing_audience_lists WHERE company_id=? AND id=?",String.class,other,id)).isEqualTo("ACTIVE");
    }

}
