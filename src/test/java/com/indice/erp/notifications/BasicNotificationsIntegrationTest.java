package com.indice.erp.notifications;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.auth.*;
import com.indice.erp.hr.*;
import com.indice.erp.hr.permissions.HrPermissionNotificationSource;
import com.indice.erp.hr.announcements.*;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.pettycash.PettyCashNotificationSource;
import com.indice.erp.finance.receivables.ReceivablesNotificationSource;
import com.indice.erp.finance.reporting.ReportNotificationSource;
import com.indice.erp.pos.PosAccessService;
import com.indice.erp.pos.shift.ShiftNotificationSource;
import com.indice.erp.kpis.KpiRequestAccessService;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.*;
import org.springframework.context.annotation.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@JdbcTest(properties={"logging.level.org.springframework=WARN","logging.level.org.springframework.jdbc.core=WARN"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import({HrPermissionNotificationSource.class,PettyCashNotificationSource.class,ReceivablesNotificationSource.class,
    ShiftNotificationSource.class,ReportNotificationSource.class,ModuleAccessService.class,TabPermissionAccessService.class,
    HrAccessService.class,HrOperationalScopeService.class,FinanceAccessService.class,PosAccessService.class,
    KpiRequestAccessService.class,FinanceBusinessTimeZoneResolver.class,ObjectMapper.class,
    AppNotificationService.class,BasicNotificationDelivery.class,NotificationAccessService.class,
    NotificationPreferencesService.class,HrAnnouncementSecurityService.class,SessionCsrfService.class,AnnVisSvc.class,
    BasicNotificationsIntegrationTest.Time.class})
class BasicNotificationsIntegrationTest {
    @TestConfiguration static class Time {@Bean Clock clock(){return Clock.fixed(Instant.parse("2026-10-19T02:00:00Z"),ZoneOffset.UTC);}}
    @Autowired JdbcTemplate db;
    @Autowired HrPermissionNotificationSource hr;
    @Autowired PettyCashNotificationSource funds;
    @Autowired ReceivablesNotificationSource receivables;
    @Autowired ShiftNotificationSource shifts;
    @Autowired ReportNotificationSource reports;
    @Autowired BasicNotificationDelivery delivery;
    @MockitoBean SessionAuthService sessions;
    @MockitoBean com.indice.erp.messaging.MessagingAccess messaging;
    @MockitoBean com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy distributors;
    @MockitoBean com.indice.erp.billing.subscription.BillingAccountAuthorityService billing;
    @Autowired NotificationPreferencesService preferences;
    @Autowired HrAnnouncementSecurityService identities;
    AuthSessionUser root,employee,foreign;
    long unit,business;

    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        long company=company();root=member(company,"superadmin");employee=member(company,"user");foreign=member(company(),"superadmin");
        for(String module:List.of("human_resources","petty_cash","expenses","receivables","pos","kpis","processes","crm","inventory")) {
            db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status) VALUES (?,?,'active')",company,module);
            db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status) VALUES (?,?,'active')",foreign.companyId(),module);
        }
        db.update("INSERT INTO units(company_id,name) VALUES (?,'Notification unit')",company);unit=id();
        db.update("INSERT INTO businesses(company_id,unit_id,name) VALUES (?,?,'Notification business')",company,unit);business=id();
        when(sessions.scheduledActor(anyLong(),anyLong())).thenAnswer(call->db.query("SELECT id,role FROM user_companies WHERE user_id=? AND company_id=? AND status='active'",
            (rs,n)->new AuthSessionUser(call.getArgument(0,Long.class),call.getArgument(1,Long.class),rs.getLong(1),"",rs.getString(2)),call.getArgument(0),call.getArgument(1)).stream().findFirst());
    }
    @Test void hrRequestsReachReviewerAndOnlyTheRequesterGetsTheDecisionWithoutSensitiveReasons() {
        grant(employee,"human_resources","permissions");
        long request=permission(employee,"pending");
        assertThat(hr.current(root)).hasSize(1);assertThat(hr.current(employee)).isEmpty();assertThat(hr.current(foreign)).isEmpty();
        delivery.deliver(root.userId(),root.companyId(),hr);
        assertThat(db.queryForObject("SELECT description FROM app_notifications WHERE company_id=? AND recipient_user_company_id=?",String.class,root.companyId(),root.userCompanyId())).isEqualTo("PER-TEST");
        assertThat(hr.visible(employee,"permission_request",request,"hr_permission_pending")).isFalse();
        db.update("UPDATE user_permission_requests SET status='approved',reviewed_at=UTC_TIMESTAMP() WHERE id=?",request);
        assertThat(hr.current(root)).isEmpty();
        assertThat(hr.current(employee)).extracting(NotificationSignalSource.Signal::event).containsExactly("hr_permission_resolved");
        assertThat(hr.visible(root,"permission_request",request,"hr_permission_pending")).isFalse();
        assertThat(hr.visible(root,"permission_request",request,"hr_permission_resolved")).isFalse();
    }
    @Test void fundsUseNativeLowBalanceAndOnlyPendingAttachedReceipts() {
        long fund=fund();long receipt=receipt(fund);
        assertThat(funds.current(root)).extracting(NotificationSignalSource.Signal::event).containsExactlyInAnyOrder("petty_cash_low_balance","petty_cash_receipt_pending");
        assertThat(funds.current(foreign)).isEmpty();
        db.update("UPDATE finance_petty_cash_funds SET status='OPEN',current_balance_amount=1000 WHERE id=?",fund);
        db.update("UPDATE finance_petty_cash_settlement_lines SET status='VALIDATED' WHERE id=?",receipt);
        assertThat(funds.current(root)).isEmpty();
        assertThat(funds.visible(root,"fund_balance",fund,"petty_cash_low_balance")).isFalse();
        assertThat(funds.visible(root,"fund_receipt",receipt,"petty_cash_receipt_pending")).isFalse();
    }
    @Test void fundResponsibilityAndTabRevocationAreEnforced() {
        long fund=fund();grant(employee,"petty_cash","cash");
        assertThat(funds.current(employee)).isEmpty();
        db.update("UPDATE finance_petty_cash_funds SET responsible_user_id=? WHERE id=?",employee.userId(),fund);
        assertThat(funds.current(employee)).hasSize(1);
        db.update("UPDATE user_company_tab_permissions SET can_view=0 WHERE user_company_id=? AND module_slug='petty_cash'",employee.userCompanyId());
        assertThat(funds.current(employee)).isEmpty();
    }
    @Test void collectionDatesUseCompanyTimezoneAndResolvedOrCancelledInstallmentsDisappear() {
        long account=account();long overdue=installment(account,1,"2026-10-17");long today=installment(account,2,"2026-10-18");installment(account,3,"2026-10-19");
        assertThat(receivables.current(root)).extracting(NotificationSignalSource.Signal::event).containsExactlyInAnyOrder("receivable_due_today","receivable_overdue");
        assertThat(receivables.current(foreign)).isEmpty();
        db.update("UPDATE finance_receivable_installments SET status='PAID',balance_amount=0 WHERE id=?",overdue);
        db.update("UPDATE finance_receivable_installments SET status='CANCELLED' WHERE id=?",today);
        assertThat(receivables.current(root)).isEmpty();
        assertThat(receivables.visible(root,"receivable_installment",overdue,"receivable_overdue")).isFalse();
    }
    @Test void organizationalScopePreventsCrossBusinessCollections() {
        long account=account();installment(account,1,"2026-10-17");grant(employee,"receivables","accounts-receivable");
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,user_code,position,unit_id,business_id,status) VALUES (?,?,?,'NOTIF-USER','Test',?,?,'active')",employee.companyId(),employee.userCompanyId(),employee.userId(),unit,business);
        db.update("UPDATE finance_receivable_accounts SET unit_id=?,business_id=? WHERE id=?",unit,business,account);
        assertThat(receivables.current(employee)).hasSize(1);
        db.update("UPDATE finance_receivable_accounts SET business_id=NULL WHERE id=?",account);
        assertThat(receivables.current(employee)).isEmpty();
    }
    @Test void posDistinguishesOpenCleanClosingAndClosingDifferenceWithoutDuplicateClosingSignals() {
        long shift=shift();assertThat(shifts.current(root)).extracting(NotificationSignalSource.Signal::event).containsExactly("pos_shift_opened");
        assertThat(shifts.current(foreign)).isEmpty();
        db.update("UPDATE pos_shifts SET status='CLOSED',closed_at=UTC_TIMESTAMP(),over_short_amount=0 WHERE id=?",shift);
        assertThat(shifts.current(root)).extracting(NotificationSignalSource.Signal::event).containsExactly("pos_shift_closed");
        db.update("UPDATE pos_shifts SET over_short_amount=-25 WHERE id=?",shift);
        assertThat(shifts.current(root)).extracting(NotificationSignalSource.Signal::event).containsExactly("pos_shift_difference");
        assertThat(shifts.visible(root,"cash_shift",shift,"pos_shift_opened")).isFalse();
    }
    @Test void reportsArePrivateAndRequireTheUnderlyingReportPermissionAndScope() {
        long rule=rule();long run=run(rule);
        assertThat(reports.current(root)).extracting(NotificationSignalSource.Signal::event).containsExactly("kpi_report_ready");
        assertThat(reports.current(foreign)).isEmpty();
        db.update("UPDATE kpi_automated_report_rules SET status='paused',last_error_code='REVIEW_REQUIRED' WHERE id=?",rule);
        assertThat(reports.current(root)).hasSize(2);
        var outsider=new AuthSessionUser(employee.userId(),root.companyId(),employee.userCompanyId(),"","superadmin");
        assertThat(reports.current(outsider)).isEmpty();
        db.update("UPDATE kpi_automated_report_rules SET status='ready',last_error_code=NULL WHERE id=?",rule);
        assertThat(reports.visible(root,"automated_report_rule",rule,"kpi_report_attention")).isFalse();
        assertThat(reports.visible(root,"automated_report_run",run,"kpi_report_ready")).isTrue();
    }
    @Test void reportSourceTabAndSnapshotScopeAreRecheckedForTheOwner() {
        long rule=rule();long run=run(rule);
        grant(employee,"kpis","automated-reports");
        db.update("UPDATE user_companies SET role='admin' WHERE id=?",employee.userCompanyId());
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,user_code,position,unit_id,status) VALUES (?,?,?,'KPI-OWNER','Test',?,'active')",employee.companyId(),employee.userCompanyId(),employee.userId(),unit);
        db.update("UPDATE kpi_automated_report_rules SET created_by_user_id=?,unit_id=? WHERE id=?",employee.userId(),unit,rule);
        db.update("UPDATE kpi_automated_report_runs SET requested_by_user_id=?,unit_id=? WHERE id=?",employee.userId(),unit,run);
        var owner=new AuthSessionUser(employee.userId(),employee.companyId(),employee.userCompanyId(),"","admin");
        assertThat(reports.canConfigure(owner,"kpi_report_ready")).isTrue();
        assertThat(reports.current(owner)).isEmpty();
        grant(employee,"kpis","kpis");
        assertThat(reports.current(owner)).hasSize(1);
        db.update("UPDATE kpi_automated_report_runs SET unit_id=NULL WHERE id=?",run);
        assertThat(reports.current(owner)).isEmpty();
        db.update("UPDATE kpi_automated_report_runs SET unit_id=? WHERE id=?",unit,run);
        db.update("UPDATE user_company_tab_permissions SET can_view=0 WHERE user_company_id=? AND module_slug='kpis' AND tab_key='kpis'",employee.userCompanyId());
        assertThat(reports.visible(owner,"automated_report_run",run,"kpi_report_ready")).isFalse();
    }
    @Test void rescansDoNotDuplicateOrResurrectDismissedSignalsAndInactiveMembersReceiveNothing() {
        fund();delivery.deliver(root.userId(),root.companyId(),funds);
        db.update("UPDATE app_notifications SET status='dismissed',dismissed_at=UTC_TIMESTAMP(),dismissed_by=? WHERE company_id=?",root.userId(),root.companyId());
        delivery.deliver(root.userId(),root.companyId(),funds);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=?",Integer.class,root.companyId())).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND dismissed_at IS NOT NULL",Integer.class,root.companyId())).isEqualTo(1);
        permission(employee,"pending");db.update("UPDATE user_companies SET status='inactive' WHERE id=?",root.userCompanyId());
        delivery.deliver(root.userId(),root.companyId(),hr);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=?",Integer.class,root.companyId())).isEqualTo(1);
    }
    @Test void dispatcherTraversesRecipientsAndIsolatesAnOwnerFailure() {
        fund();AuthSessionUser last=null;
        for(int i=0;i<65;i++) last=member(root.companyId(),"user");
        var inactive=member(root.companyId(),"user");
        db.update("UPDATE user_companies SET status='inactive' WHERE id=?",inactive.userCompanyId());
        var failing=mock(NotificationSignalSource.class);when(failing.module()).thenReturn("petty_cash");
        when(failing.current(any())).thenAnswer(call->{
            AuthSessionUser actor=call.getArgument(0);
            if(actor.userId().equals(root.userId())) throw new IllegalStateException("Synthetic owner failure");
            return List.of();
        });
        var dispatcher=new BasicNotificationDispatcher(db,delivery,List.of(failing,funds));
        int members=db.queryForObject("SELECT COUNT(*) FROM user_companies WHERE status='active'",Integer.class);
        for(int batch=0;batch<members/50+2;batch++) dispatcher.dispatch();
        verify(sessions,atLeastOnce()).scheduledActor(last.userId(),last.companyId());
        verify(sessions,never()).scheduledActor(inactive.userId(),inactive.companyId());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND recipient_user_company_id=? AND event_type='petty_cash_low_balance'",Integer.class,root.companyId(),root.userCompanyId())).isEqualTo(1);
    }
    @Test void necessaryEventsAreConfigurablePerUserAndCompanyAndRespectRevokedEntitlements() {
        var actor=identities.delegatedActor(root);
        var events=preferences.get(actor).items();
        for(var pair:List.of(new String[]{"human_resources","hr_permission_pending"},new String[]{"processes_tasks","finalized_with_incidents"},
                new String[]{"sales","sales_call_reminder"},new String[]{"point_of_sale","pos_shift_difference"},
                new String[]{"inventory","pos_stock_low"},new String[]{"expenses","expense_due"},
                new String[]{"petty_cash","petty_cash_receipt_pending"},new String[]{"receivables","receivable_overdue"},new String[]{"kpis","kpi_report_attention"})) {
            assertThat(events).anyMatch(item->item.module().equals(pair[0])&&item.eventType().equals(pair[1]));
            var current=preferences.get(actor);
            preferences.save(actor,new NotificationPreferencesService.Change(current.version(),null,
                List.of(new NotificationPreferencesService.Item(pair[0],pair[1],false))));
            assertThat(preferences.saved(actor).shows(pair[0],pair[1])).isFalse();
            assertThat(preferences.saved(identities.delegatedActor(foreign)).shows(pair[0],pair[1])).isTrue();
        }
        assertThat(events).noneMatch(item->Set.of("expense_submitted","sales_order_ready","sales_invoice_overdue").contains(item.eventType()));
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='petty_cash'",root.companyId());
        assertThat(preferences.get(actor).items()).noneMatch(item->item.module().equals("petty_cash"));
    }
    private long company(){db.update("INSERT INTO companies(name,platform_status,commercial_account_type) VALUES (?,'ACTIVE','SUPER_ADMIN')",UUID.randomUUID().toString());return id();}
    private AuthSessionUser member(long company,String role){db.update("INSERT INTO users(email,password_hash) VALUES (?,'test-only')",UUID.randomUUID()+"@example.invalid");long user=id();db.update("INSERT INTO user_companies(company_id,user_id,role,status) VALUES (?,?,?,'active')",company,user,role);return new AuthSessionUser(user,company,id(),"",role);}
    private void grant(AuthSessionUser user,String module,String tab){db.update("INSERT IGNORE INTO user_company_module_roles(user_company_id,module_slug,role,skill_level) VALUES (?,?,'user',0)",user.userCompanyId(),module);db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES (?,?,?,1)",user.userCompanyId(),module,tab);}
    private long id(){return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);}
    private long permission(AuthSessionUser employee,String status){db.update("""
        INSERT INTO user_permission_requests(company_id,user_company_id,user_id,user_name_snapshot,request_number,permission_type,start_date,end_date,requested_days,status,reason,created_by_user_id,updated_by_user_id)
        VALUES (?,?,?,'Test employee','PER-TEST','vacation','2026-10-20','2026-10-20',1,?,'Private reason must not leave HR',?,?)
        """,employee.companyId(),employee.userCompanyId(),employee.userId(),status,employee.userId(),employee.userId());return id();}
    private long fund(){db.update("INSERT INTO finance_petty_cash_funds(company_id,name,currency_code,limit_amount,current_balance_amount,cut_off_day,status,fund_type,responsible_user_id) VALUES (?,'Test fund','MXN',1000,100,31,'LOW_BALANCE','INTERNAL_COMPANY',?)",root.companyId(),root.userId());return id();}
    private long receipt(long fund){db.update("INSERT INTO finance_petty_cash_statements(company_id,petty_cash_fund_id,folio,period_key,period_start,period_end,cut_off_date,currency_code,status,fund_type_snapshot) VALUES (?,?,'TEST-CUT','2026-10','2026-10-01','2026-10-31','2026-10-31','MXN','OPEN','INTERNAL_COMPANY')",root.companyId(),fund);long statement=id();db.update("INSERT INTO finance_petty_cash_settlement_lines(company_id,petty_cash_fund_id,petty_cash_statement_id,description,total_amount,currency_code,expense_date,status) VALUES (?,?,?,'Test receipt',100,'MXN','2026-10-17','RECEIPT_ATTACHED')",root.companyId(),fund,statement);return id();}
    private long account(){db.update("INSERT INTO finance_credit_sales(company_id,sale_number,customer_name,source,sale_date,original_amount,financed_amount,currency_code,status,selected_simulation_key,selected_simulation_name,term_months,monthly_payment_amount,total_payable_amount,first_due_date,due_date) VALUES (?,'SALE-TEST','Test','SALES','2026-09-01',300,300,'MXN','ACTIVE','TEST','Test',3,100,300,'2026-10-17','2026-12-17')",root.companyId());long credit=id();db.update("INSERT INTO finance_receivable_accounts(company_id,credit_sale_id,sale_number,customer_name,original_amount,total_payable_amount,balance_amount,currency_code,due_date,next_payment_date,installment_amount,term_months,status) VALUES (?,?,'SALE-TEST','Test',300,300,300,'MXN','2026-12-17','2026-10-17',100,3,'ON_TIME')",root.companyId(),credit);return id();}
    private long installment(long account,int number,String due){long credit=db.queryForObject("SELECT credit_sale_id FROM finance_receivable_accounts WHERE id=?",Long.class,account);db.update("INSERT INTO finance_receivable_installments(company_id,receivable_id,credit_sale_id,installment_number,due_date,amount,balance_amount,currency_code,status) VALUES (?,?,?,?,?,100,100,'MXN','ON_TIME')",root.companyId(),account,credit,number,due);return id();}
    private long shift(){db.update("INSERT INTO sales_inventory_warehouses(company_id,warehouse_code,name,type,status) VALUES (?,?,'Test warehouse','main','active')",root.companyId(),UUID.randomUUID().toString());long warehouse=id();db.update("INSERT INTO pos_cash_registers(company_id,warehouse_id,code,name,status,created_by_user_id) VALUES (?,?,'TEST','Test register','ACTIVE',?)",root.companyId(),warehouse,root.userId());long register=id();db.update("INSERT INTO pos_shifts(company_id,warehouse_id,cash_register_id,opened_by_user_id,created_by_user_id,status,currency_code) VALUES (?,?,?,?,?,'OPEN','MXN')",root.companyId(),warehouse,register,root.userId(),root.userId());return id();}
    private long rule(){db.update("INSERT INTO kpi_automated_report_rules(company_id,created_by_user_id,title,report_type,cadence,status,preferred_currency) VALUES (?,?,'Test report','EXECUTIVE','DAILY','ready','MXN')",root.companyId(),root.userId());return id();}
    private long run(long rule){db.update("INSERT INTO kpi_automated_report_runs(company_id,rule_id,requested_by_user_id,run_key,report_type,from_date,to_date,currency_code,snapshot_json) VALUES (?,?,?,'test','EXECUTIVE','2026-10-17','2026-10-17','MXN','{}')",root.companyId(),rule,root.userId());return id();}
}
