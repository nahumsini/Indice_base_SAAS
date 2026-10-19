package com.indice.erp.notifications;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.auth.*;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.announcements.*;
import com.indice.erp.messaging.MessagingAccess;
import com.indice.erp.billing.subscription.*;
import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@JdbcTest(properties={"logging.level.org.springframework=WARN","logging.level.org.springframework.jdbc.core=WARN"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import({NotificationAccessService.class,NotificationPreferencesService.class,NotificationQueryService.class,
    NotificationCommandService.class,NotificationService.class,NotificationResponseFactory.class,
    NotificationApiController.class,HrAnnouncementSecurityService.class,HrAccessService.class,
    ModuleAccessService.class,TabPermissionAccessService.class,AnnVisSvc.class,AnnReadSvc.class,
    SessionCsrfService.class,MessagingAccess.class,BillingAccountAuthorityService.class,ObjectMapper.class})
class NotificationPreferencesIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired NotificationApiController controller;
    @Autowired NotificationPreferencesService preferences;
    @Autowired NotificationAccessService access;
    @Autowired NotificationQueryService query;
    @Autowired NotificationCommandService commands;
    @Autowired HrAnnouncementSecurityService identities;
    @Autowired MessagingAccess messaging;
    @MockitoBean SessionAuthService auth;
    @MockitoBean HrAnnouncementPublisher publisher;
    @MockitoBean NotificationSyncSvc sync;
    @MockitoBean OperationalNotificationSyncService operational;
    @MockitoBean DistributorPortfolioAccessPolicy distributors;
    @MockitoBean PlatformAdminAccessService platform;
    @MockitoBean CompanySubscriptionStatusProvider subscription;
    @MockitoBean CommercialLifecycleAccessService lifecycle;
    MockMvc mvc;
    AuthSessionUser alice,bob,otherCompany;
    MockHttpSession session;

    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        mvc=MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new NotificationApiExceptionHandler()).build();
        long company=company();
        alice=member(company,null); bob=member(company,null); otherCompany=member(company(),alice.userId());
        grant(alice,"expenses","expenses"); grant(bob,"expenses","expenses"); grant(otherCompany,"expenses","expenses");
        session=session(alice);
        when(subscription.currentStatus(anyLong())).thenReturn(CompanySubscriptionStatus.activeLegacy());
    }

    @Test void expensesUserWithoutHrPermissionCanUseInboxAndSavePersonalSettings() throws Exception {
        notification(alice,"expenses","expense_paid");
        mvc.perform(get("/api/v1/notifications").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(get("/api/v1/notifications/preferences").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(3));
        mvc.perform(put("/api/v1/notifications/preferences").session(session).header("X-CSRF-Token","test-csrf")
            .contentType("application/json").content("""
                {"version":0,"userId":999,"companyId":999,"items":[{"module":"expenses","eventType":"expense_paid","enabled":false}]}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        assertThat(preferences.saved(actor(alice)).shows("expenses","expense_paid")).isFalse();
        assertThat(preferences.saved(actor(bob)).shows("expenses","expense_paid")).isTrue();
        assertThat(preferences.saved(actor(otherCompany)).shows("expenses","expense_paid")).isTrue();
        mvc.perform(get("/api/v1/notifications").session(session(alice))).andExpect(jsonPath("$.items.length()").value(0));
        var fresh=new NotificationPreferencesService(db,new ObjectMapper(),access);
        assertThat(fresh.get(actor(alice)).version()).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM notification_preferences WHERE company_id=? AND user_id=?",Integer.class,alice.companyId(),alice.userId())).isEqualTo(1);
    }

    @Test void csrfAuthenticationInactiveMembershipAndForbiddenSettingsFailClosed() throws Exception {
        mvc.perform(get("/api/v1/notifications/preferences")).andExpect(status().isUnauthorized());
        String patch="{\"version\":0,\"quietMode\":true}";
        mvc.perform(put("/api/v1/notifications/preferences").session(session).contentType("application/json").content(patch)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/notifications/preferences").session(session).header("X-CSRF-Token","test-csrf").contentType("application/json")
            .content("{\"version\":0,\"items\":[{\"module\":\"human_resources\",\"eventType\":\"general\",\"enabled\":false}]}"))
            .andExpect(status().isForbidden());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM notification_preferences WHERE company_id=?",Integer.class,alice.companyId())).isZero();
        db.update("UPDATE user_companies SET status='inactive' WHERE id=?",alice.userCompanyId());
        mvc.perform(get("/api/v1/notifications/preferences").session(session)).andExpect(status().isForbidden());
    }

    @Test void invalidAndDuplicateKeysDoNotWrite() throws Exception {
        for(String items:List.of("[]","[{\"module\":\"expenses\",\"eventType\":\"invented\",\"enabled\":false}]",
            "[{\"module\":\"expenses\",\"eventType\":\"expense_paid\",\"enabled\":null}]",
            "[{\"module\":\"expenses\",\"eventType\":\"expense_paid\",\"enabled\":false},{\"module\":\"expenses\",\"eventType\":\"expense_paid\",\"enabled\":true}]")) {
            mvc.perform(put("/api/v1/notifications/preferences").session(session).header("X-CSRF-Token","test-csrf").contentType("application/json")
                .content("{\"version\":0,\"items\":"+items+"}")).andExpect(status().isBadRequest());
        }
    }

    @Test void lostAcknowledgementIsRetryableButConcurrentDifferentChoiceDoesNotOverwrite() throws Exception {
        var change=patch(0,"expense_paid",false);
        assertThat(preferences.save(actor(alice),change).version()).isEqualTo(1);
        assertThat(preferences.save(actor(alice),change).version()).isEqualTo(1);
        preferences.save(actor(alice),patch(1,"expense_paid",true));
        mvc.perform(put("/api/v1/notifications/preferences").session(session).header("X-CSRF-Token","test-csrf").contentType("application/json")
            .content("{\"version\":1,\"items\":[{\"module\":\"expenses\",\"eventType\":\"expense_paid\",\"enabled\":false}]}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("notification_preferences_changed"));
        assertThat(preferences.saved(actor(alice)).shows("expenses","expense_paid")).isTrue();
    }

    @Test void preferencesFilterBeforeLimitAndMarkAllTouchesOnlyVisibleAuthorizedRows() {
        long allowed=notification(alice,"expenses","expense_due");
        for(int i=0;i<60;i++) notification(alice,"expenses","expense_paid");
        long forbidden=notification(alice,"sales","sales_quote_follow_up");
        long foreign=notification(bob,"expenses","expense_due");
        preferences.save(actor(alice),patch(0,"expense_paid",false));
        @SuppressWarnings("unchecked") var items=(List<Map<String,Object>>)query.list(actor(alice)).get("items");
        assertThat(items).hasSize(1); assertThat(items.getFirst().get("id")).isEqualTo(-allowed);
        assertThatThrownBy(()->commands.markRead(actor(alice),-forbidden)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->commands.dismiss(actor(alice),-forbidden)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->commands.markRead(actor(alice),-foreign)).isInstanceOf(NoSuchElementException.class);
        assertThat(commands.markAllRead(actor(alice)).get("updated_count")).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND read_at IS NOT NULL",Integer.class,alice.companyId())).isEqualTo(1);
        preferences.save(actor(alice),patch(1,"expense_paid",true));
        assertThat(((List<?>)query.list(actor(alice)).get("items"))).hasSize(50);
    }

    @Test void revokingTabOrEntitlementHidesHistoryAndBlocksActionsAndPreferenceWrites() throws Exception {
        long id=notification(alice,"expenses","expense_due");
        db.update("UPDATE user_company_tab_permissions SET can_view=0 WHERE user_company_id=? AND module_slug='expenses'",alice.userCompanyId());
        assertThat(((List<?>)query.list(actor(alice)).get("items"))).isEmpty();
        assertThat(preferences.get(actor(alice)).items()).isEmpty();
        assertThatThrownBy(()->commands.dismiss(actor(alice),-id)).isInstanceOf(NoSuchElementException.class);
        db.update("UPDATE user_company_tab_permissions SET can_view=1 WHERE user_company_id=?",alice.userCompanyId());
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='expenses'",alice.companyId());
        assertThat(((List<?>)query.list(actor(alice)).get("items"))).isEmpty();
        assertThatThrownBy(()->preferences.save(actor(alice),patch(0,"expense_paid",false))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test void quietModePreservesUrgentWorkAndCurrentMessageParticipationIsRequired() {
        notification(alice,"expenses","expense_paid"); notification(alice,"expenses","expense_due");
        notification(alice,"unknown_source","test");
        preferences.save(actor(alice),new NotificationPreferencesService.Change(0L,true,null));
        assertThat(((List<?>)query.list(actor(alice)).get("items"))).hasSize(1);
        db.update("INSERT INTO messaging_conversations(company_id,kind,subject,created_by_membership_id,request_key,creation_fingerprint) VALUES (?,'DIRECT','test',?,?,?)",
            alice.companyId(),alice.userCompanyId(),UUID.randomUUID().toString(),"a".repeat(64));
        long conversation=db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
        var row=new AppNotificationRow(1,"messaging","conversation",conversation,"new_message","test","test","delivered",null,null,"/dashboard");
        assertThat(access.scope(actor(alice)).app(row)).isFalse();
        db.update("INSERT INTO messaging_participants(conversation_id,membership_id) VALUES (?,?)",conversation,alice.userCompanyId());
        assertThat(access.scope(actor(alice)).app(row)).isTrue();
        db.update("DELETE FROM messaging_participants WHERE conversation_id=?",conversation);
        assertThat(access.scope(actor(alice)).app(row)).isFalse();
    }

    @Test void inventoryNoticesUseInventoryAuthorityAndCurrentBillingOwnerKeepsAccess() {
        grant(alice,"inventory","inventory");
        notification(alice,"point_of_sale","pos_stock_low");
        notification(alice,"point_of_sale","pos_purchase_pending");
        @SuppressWarnings("unchecked") var items=(List<Map<String,Object>>)query.list(actor(alice)).get("items");
        assertThat(items).hasSize(1);
        assertThat(items.getFirst().get("module_slug")).isEqualTo("inventory");
        assertThat(preferences.get(actor(alice)).items()).anyMatch(item->item.module().equals("inventory")&&item.eventType().equals("pos_stock_low"));
        assertThat(preferences.get(actor(alice)).items()).noneMatch(item->item.module().equals("point_of_sale"));
        assertThat(access.scope(actor(alice)).allowed("billing","payment_requested")).isFalse();
        db.update("INSERT INTO company_ownerships(company_id,owner_user_id,owner_user_company_id) VALUES (?,?,?)",alice.companyId(),alice.userId(),alice.userCompanyId());
        assertThat(access.scope(actor(alice)).allowed("billing","payment_requested")).isTrue();
        assertThat(access.scope(actor(bob)).allowed("billing","payment_requested")).isFalse();
    }

    private NotificationPreferencesService.Change patch(long version,String type,boolean enabled) {
        return new NotificationPreferencesService.Change(version,null,List.of(new NotificationPreferencesService.Item("expenses",type,enabled)));
    }
    private HrAnnouncementActor actor(AuthSessionUser user) { return identities.delegatedActor(user); }
    private MockHttpSession session(AuthSessionUser user) {
        var result=new MockHttpSession(); result.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"test-csrf");
        when(auth.currentUser(result)).thenReturn(Optional.of(user)); return result;
    }
    private long company() {
        db.update("INSERT INTO companies(name,commercial_account_type,platform_status) VALUES (?,'SUPER_ADMIN','ACTIVE')","Notification test "+UUID.randomUUID());
        return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
    }
    private AuthSessionUser member(long company,Long existingUser) {
        if(existingUser==null) {
            db.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test-only','Notification user')",UUID.randomUUID()+"@example.invalid");
            existingUser=db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
        }
        db.update("INSERT INTO user_companies(user_id,company_id,role,status) VALUES (?,?,'user','active')",existingUser,company);
        long membership=db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
        return new AuthSessionUser(existingUser,company,membership,"Notification user","user");
    }
    private void grant(AuthSessionUser user,String module,String tab) {
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status) VALUES (?,?,'active') ON DUPLICATE KEY UPDATE status='active'",user.companyId(),module);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role,skill_level) VALUES (?,?,'user',0)",user.userCompanyId(),module);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES (?,?,?,1)",user.userCompanyId(),module,tab);
    }
    private long notification(AuthSessionUser user,String module,String event) {
        db.update("INSERT INTO app_notifications(company_id,recipient_user_company_id,source_module,source_type,source_id,event_type,event_key,title,description,action_url) VALUES (?,?,?,'record',1,?,?,?,'test','/expenses')",
            user.companyId(),user.userCompanyId(),module,event,UUID.randomUUID().toString(),"Test "+event);
        return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
    }
}
