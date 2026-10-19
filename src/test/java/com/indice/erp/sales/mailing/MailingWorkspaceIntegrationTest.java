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
class MailingWorkspaceIntegrationTest {
    @Autowired MailingWorkspaceService workspace;
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

    String draft(String name) {String id=UUID.randomUUID().toString();service.save(actor,id,input(name,0,List.of(contact)));return id;}
    MailingWorkspaceService.Workspace list(String search,String state,String sender,int page,String direction) {
        return workspace.list(actor,search,state,sender,page,10,"name",direction,true);
    }
    String account(long owner,long tenant) {
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO email_accounts(id,company_id,owner_user_id,label,email,display_name,smtp_host,smtp_port,smtp_security,smtp_username,smtp_secret,mailing_enabled,smtp_status) VALUES(?,?,?,'Synthetic sender','sender@example.com','Sender','smtp.example.com',465,'TLS','sender@example.com','synthetic-not-a-secret',TRUE,'VERIFIED')",id,tenant,owner);
        return id;
    }
    void delivery(String campaign,String state,int index) {
        db.update("INSERT INTO sales_mailing_deliveries(company_id,campaign_id,id,contact_id,email,name,state) VALUES(?,?,?,?,?,?,?)",company,campaign,UUID.randomUUID().toString(),contact,"recipient"+index+"@example.com","Synthetic",state);
    }
    @Test void summaryCoversAllPagesAndStatusIsAFacetRatherThanChangingSummary() {
        for(int i=0;i<27;i++)draft(String.format("Campaign %02d",i));
        var first=list("Campaign","ALL","",1,"asc");assertThat(first.total()).isEqualTo(27);assertThat(first.summary().draft()).isEqualTo(27);assertThat(first.items()).hasSize(10);
        assertThat(first.items().getFirst().name()).isEqualTo("Campaign 00");assertThat(list("Campaign","ALL","",2,"asc").items().getFirst().name()).isEqualTo("Campaign 10");
        assertThat(list("Campaign","ALL","",1,"desc").items().getFirst().name()).isEqualTo("Campaign 26");
        var empty=list("Campaign","COMPLETED","",1,"asc");assertThat(empty.items()).isEmpty();assertThat(empty.summary().total()).isEqualTo(27);
        assertThat(list("Campaign 01","ALL","",1,"asc").summary().total()).isEqualTo(1);
    }
    @Test void snapshotsAndAttentionRemainAccurateWhenContactsChange() {
        String id=draft("Completed");db.update("UPDATE sales_mailing_campaigns SET status='COMPLETED' WHERE company_id=? AND id=?",company,id);
        for(int i=0;i<7;i++)delivery(id,List.of("PENDING","SUBMITTING","ACCEPTED","FAILED","UNKNOWN","SUPPRESSED","CANCELLED").get(i),i);
        db.update("UPDATE sales_contacts SET email='changed@example.com',status='inactive' WHERE company_id=? AND id=?",company,contact);
        var result=list("","ATTENTION","",1,"asc");assertThat(result.total()).isEqualTo(1);assertThat(result.summary().attention()).isEqualTo(1);
        var counts=result.items().getFirst().delivery();assertThat(counts.total()).isEqualTo(7);assertThat(counts.accepted()).isEqualTo(1);assertThat(counts.unknown()).isEqualTo(1);assertThat(counts.failed()).isEqualTo(1);assertThat(counts.pending()).isEqualTo(1);assertThat(counts.submitting()).isEqualTo(1);assertThat(counts.suppressed()).isEqualTo(1);assertThat(counts.cancelled()).isEqualTo(1);
    }
    @Test void selectedContactsAreNotReportedAsEligibleAndUnsentDraftsHaveNoProgress() {
        long duplicate=insert("INSERT INTO sales_contacts(company_id,contact_code,company_name,email) VALUES(?,'DUP','Duplicate','contact@example.com')",company);
        String id=UUID.randomUUID().toString();service.save(actor,id,input("Draft",0,List.of(contact,duplicate)));
        var row=list("","DRAFT","NONE",1,"asc").items().getFirst();assertThat(row.selectedCount()).isEqualTo(2);assertThat(row.delivery().total()).isZero();assertThat(row.scheduledAt()).isNull();assertThat(row.requiresAttention()).isFalse();
    }
    @Test void accountFiltersAndScheduledTimeUseTenantOwnedRunsWithoutLeakingOtherOwnersAccounts() {
        db.update("UPDATE modules SET lifecycle_status='pilot',assignment_enabled=TRUE,is_active=TRUE WHERE slug='correo'");
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'correo','active','test')",company);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'correo','admin')",membership);
        String own=account(user,company),foreign=account(user,other);
        long colleague=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic','Other owner')",UUID.randomUUID()+"@example.com");
        String privateAccount=account(colleague,company);
        String id=draft("Scheduled");db.update("UPDATE sales_mailing_campaigns SET sender_account_id=?,status='SCHEDULED' WHERE company_id=? AND id=?",own,company,id);
        db.update("INSERT INTO sales_mailing_runs(company_id,campaign_id,actor_user_id,account_id,account_version,scheduled_at,footer,last_error) VALUES(?,?,?,?,1,'2027-01-10 12:00:00','Synthetic footer','mailing_sender_changed')",company,id,user,own);
        var result=list("","ALL",own,1,"asc");assertThat(result.total()).isEqualTo(1);assertThat(result.items().getFirst().scheduledAt()).isEqualTo(java.time.Instant.parse("2027-01-10T12:00:00Z"));assertThat(result.summary().attention()).isEqualTo(1);
        assertThat(result.senders()).extracting(com.indice.erp.email.accounts.EmailAccountContracts.Sender::id).containsExactly(own);
        assertThat(list("","ALL",foreign,1,"asc").total()).isZero();assertThat(list("","ALL",privateAccount,1,"asc").total()).isZero();
    }
    @Test void endpointFailsClosedAndSeparatesListingFromContactDetailCapability() throws Exception {
        draft("Visible");
        mvc.perform(get("/api/v1/mailing/workspace")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/mailing/workspace").session(session()).param("status","INVALID")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/mailing/workspace").session(session()).param("sort","name;DROP TABLE companies")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/mailing/workspace").session(session()).param("pageSize","501")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/mailing/workspace").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.canEdit").value(true));
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='contacts'",membership);
        mvc.perform(get("/api/v1/mailing/workspace").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.canViewDetails").value(false)).andExpect(jsonPath("$.canEdit").value(false));
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND tab_key='mailing'",membership);
        mvc.perform(get("/api/v1/mailing/workspace").session(session())).andExpect(status().isForbidden());
    }
    @Test void literalSearchAndCrossTenantCampaignsNeverBleedIntoTheWorkspace() {
        draft("Offer 100%");draft("Offer 1000");
        String id=UUID.randomUUID().toString();db.update("INSERT INTO sales_mailing_campaigns(id,company_id,name,subject,sender_name,reply_to,preview_text,body_text,created_by,updated_by) VALUES(?,?,'Foreign','','','','','',?,?)",id,other,user,user);
        assertThat(list("100%","ALL","",1,"asc").total()).isEqualTo(1);assertThat(list("Foreign","ALL","",1,"asc").total()).isZero();assertThat(list("","ALL","",1,"asc").summary().total()).isEqualTo(2);
    }
}
