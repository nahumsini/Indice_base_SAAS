package com.indice.erp.maintenance;

import com.indice.erp.auth.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.maintenance.MaintenanceDtos.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.email.enabled=false","app.maintenance.worker-initial-delay-ms=86400000","app.scheduling.reminder-initial-delay-ms=86400000","app.meetings.reminder-initial-delay-ms=86400000"})
@AutoConfigureMockMvc
@Transactional
class MaintenanceIntegrationTest {
    @Autowired MaintenanceRepository repository;
    @Autowired MaintenanceService service;
    @Autowired MaintenancePreventionService prevention;
    @Autowired MaintenanceCostService costs;
    @Autowired MaintenanceCostSummaryService costSummary;
    @Autowired MaintenanceTaskService taskLinks;
    @Autowired MaintenanceAccess access;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired com.indice.erp.scheduling.SchedulingResourceAvailabilityService availability;
    @Autowired MaintenanceTeamService team;
    @Autowired MaintenanceNotificationService notifications;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @Autowired com.indice.erp.finance.expenses.ExpenseService expenseOwner;
    private long company,other,user,technician,stranger;
    private AuthSessionUser actor,tech,outsider;
    private Asset asset;
    @BeforeEach void setup(){
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        company=repository.insert("INSERT INTO companies(name) VALUES(?)","Maintenance synthetic "+UUID.randomUUID());other=repository.insert("INSERT INTO companies(name) VALUES(?)","Maintenance other "+UUID.randomUUID());
        user=user("superadmin");technician=user("user");stranger=user("user");
        actor=new AuthSessionUser(user,company,"Synthetic manager","superadmin");tech=new AuthSessionUser(technician,company,"Synthetic technician","user");outsider=new AuthSessionUser(stranger,company,"Synthetic outsider","user");
        jdbc.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'maintenance','active','test')",company);
        asset=service.asset(actor,null,new AssetInput("Synthetic pump","EQUIPMENT",null,null,null,"Plant","HIGH","",true,null),key());
    }
    private String key(){return UUID.randomUUID().toString();}
    private long user(String role){long id=repository.insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-only','Synthetic maintenance user')","maintenance-"+UUID.randomUUID()+"@example.com");long uc=repository.insert("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,?,'active','all')",company,id,role);jdbc.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'maintenance',?)",uc,role);for(String tab:List.of("requests","orders","assets"))jdbc.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'maintenance',?,1)",uc,tab);return id;}
    private OrderInput input(boolean blocking,boolean evidence){return new OrderInput(asset.id(),"Synthetic repair","Fault diagnosis","CORRECTIVE","HIGH","",technician,Instant.now().plusSeconds(86400),null,null,"UTC",List.of(new Step("Inspect seal",true,false)),evidence,blocking,"MXN",BigDecimal.TEN,"",null);}
    private Order create(boolean blocking,boolean evidence){return service.create(actor,input(blocking,evidence),key()).order();}
    private OrderInput edit(Order o,Instant deadline,String reason){return new OrderInput(o.assetId(),o.title(),o.description(),o.orderType(),o.priority(),o.category(),o.assigneeId(),deadline,o.scheduledStart(),o.scheduledEnd(),o.timezone(),o.checklist().stream().map(s->new Step(s.label(),s.required(),false)).toList(),o.evidenceRequired(),o.blocking(),o.currency(),o.estimatedAmount(),reason,o.version());}
    private MockHttpSession session(long id){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,id);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,company);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    @Test void retryKeysDoNotDuplicateAndRejectDifferentPayload(){var body=input(false,false);String key=key();var order=service.create(actor,body,key).order();assertThat(service.create(actor,body,key).order().id()).isEqualTo(order.id());assertThatThrownBy(()->service.create(actor,input(true,false),key)).isInstanceOf(RuntimeException.class);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM maintenance_orders WHERE company_id=?",Long.class,company)).isEqualTo(1);}
    @Test void requestTriageCreatesExactlyOneOrderAndKeepsHistory(){var request=service.report(tech,new RequestInput(null,"Leak","Water near entrance","Entrance","CRITICAL",""),key()).request();var reviewed=service.triage(actor,request.id(),new Triage(1,true,"Confirmed leak"));assertThat(reviewed.request().orderId()).isNotNull();assertThat(service.triage(actor,request.id(),new Triage(1,true,"Confirmed leak")).request().orderId()).isEqualTo(reviewed.request().orderId());assertThat(repository.requestDetail(tech,request.id()).history()).hasSize(2);assertThatThrownBy(()->repository.request(outsider,request.id())).isInstanceOf(RuntimeException.class);}
    @Test void companyAndAssigneeBoundariesAreEnforced(){var order=create(false,false);assertThat(repository.order(tech,order.id()).id()).isEqualTo(order.id());assertThatThrownBy(()->repository.order(outsider,order.id())).isInstanceOf(RuntimeException.class);assertThatThrownBy(()->repository.order(new AuthSessionUser(user,other,"Other","superadmin"),order.id())).isInstanceOf(RuntimeException.class);assertThat(repository.orders(outsider,"","","",0,1,25,null,null).total()).isZero();assertThatThrownBy(()->service.create(tech,input(false,false),key())).isInstanceOf(RuntimeException.class);}
    @Test void currentMembershipOverridesForgedOrStaleRole(){var order=create(false,false);assertThatThrownBy(()->service.transition(new AuthSessionUser(technician,company,"Forged","superadmin"),order.id(),new Transition(1,"CANCELLED","Unauthorized"))).isInstanceOf(RuntimeException.class);jdbc.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND user_id=?",company,technician);assertThatThrownBy(()->service.progress(tech,order.id(),new Progress(1,"x","x",List.of(true)))).isInstanceOf(RuntimeException.class);}
    @Test void closureRequiresExecutionChecklistDiagnosisAndManagerValidation(){var order=create(false,false);long id=order.id();assertThatThrownBy(()->service.transition(actor,id,new Transition(1,"CLOSED",""))).isInstanceOf(RuntimeException.class);service.transition(tech,id,new Transition(1,"IN_PROGRESS",""));assertThatThrownBy(()->service.transition(tech,id,new Transition(2,"PENDING_VALIDATION",""))).isInstanceOf(RuntimeException.class);service.progress(tech,id,new Progress(2,"Worn seal","Replaced and tested",List.of(true)));service.transition(tech,id,new Transition(3,"PENDING_VALIDATION",""));assertThatThrownBy(()->service.transition(tech,id,new Transition(4,"CLOSED",""))).isInstanceOf(RuntimeException.class);var closed=service.transition(actor,id,new Transition(4,"CLOSED","Validated pressure")).order();assertThat(closed.closedAt()).isNotNull();assertThat(closed.status()).isEqualTo("CLOSED");assertThatThrownBy(()->service.progress(tech,id,new Progress(5,"x","x",List.of(true)))).isInstanceOf(RuntimeException.class);}
    @Test void missingEvidenceBlocksSubmission(){long id=create(false,true).id();service.transition(tech,id,new Transition(1,"IN_PROGRESS",""));service.progress(tech,id,new Progress(2,"Diagnosed","Fixed",List.of(true)));assertThatThrownBy(()->service.transition(tech,id,new Transition(3,"PENDING_VALIDATION",""))).hasMessageContaining("maintenance_evidence_required");}
    @Test void reschedulingPreservesOriginalDeadlineAndRequiresReason(){var order=create(false,false);assertThatThrownBy(()->service.edit(actor,order.id(),edit(order,order.dueAt().plusSeconds(3600),""))).hasMessageContaining("reason_required");var updated=service.edit(actor,order.id(),edit(order,order.dueAt().plusSeconds(3600),"Parts delayed")).order();assertThat(updated.originalDueAt()).isEqualTo(order.originalDueAt());assertThat(updated.dueAt()).isAfter(order.dueAt());assertThatThrownBy(()->service.edit(actor,order.id(),edit(order,order.dueAt(),"Stale"))).hasMessageContaining("version_conflict");}
    @Test void overlappingFaultsUseOneOutageAndRequireExplicitRestoration(){var first=create(true,false);var second=create(true,false);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM maintenance_outages WHERE company_id=? AND asset_id=?",Long.class,company,asset.id())).isEqualTo(1);service.transition(actor,first.id(),new Transition(1,"CANCELLED","Duplicate fault"));assertThatThrownBy(()->service.restore(actor,asset.id(),new VersionReason(1,"Restored"))).hasMessageContaining("other_fault_open");service.transition(actor,second.id(),new Transition(1,"CANCELLED","Inspected, no fault"));assertThat(repository.asset(actor,asset.id()).unavailable()).isTrue();assertThat(service.restore(actor,asset.id(),new VersionReason(1,"Tested operation")).unavailable()).isFalse();}
    @Test void preventionWorkerGeneratesOnceAndDoesNotReserveTechnician(){var day=LocalDate.now(ZoneOffset.UTC).plusDays(1);var plan=prevention.create(actor,new PlanInput(asset.id(),"Synthetic preventive","Inspect","NORMAL",day,"MONTHLY",1,"UTC",7,List.of(new Step("Check",true,false)),true,"MXN",BigDecimal.ZERO),key());assertThat(prevention.generate(company,plan.id(),Instant.now())).isEqualTo(1);assertThat(prevention.generate(company,plan.id(),Instant.now())).isZero();var order=repository.orders(actor,"","","preventive",0,1,25,null,null).items().getFirst();assertThat(order.scheduledStart()).isNull();assertThat(order.assigneeId()).isNull();assertThat(order.planId()).isEqualTo(plan.id());}
    @Test void revokedEntitlementStopsWorkerAndUserWrites(){var plan=prevention.create(actor,new PlanInput(asset.id(),"Plan","","NORMAL",LocalDate.now(),"DAILY",1,"UTC",0,List.of(new Step("Check",true,false)),true,"MXN",BigDecimal.ZERO),key());jdbc.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='maintenance'",company);assertThatThrownBy(()->prevention.generate(company,plan.id(),Instant.now())).isInstanceOf(RuntimeException.class);assertThatThrownBy(()->service.report(tech,new RequestInput(null,"Leak","Water","Entrance","HIGH",""),key())).isInstanceOf(RuntimeException.class);}
    @Test void laborUsesServerRateAndRetryDoesNotDuplicate(){service.settings(actor,new Settings("UTC","MXN",new BigDecimal("120"),2,8,24,72,List.of(),List.of(),List.of(),false,0));long id=create(false,false).id();service.transition(tech,id,new Transition(1,"IN_PROGRESS",""));String key=key();var body=new LaborInput(2,30,"Repair time");costs.labor(tech,id,body,key);costs.labor(tech,id,body,key);var total=costs.costs(actor,id);assertThat(total.labor()).isEqualByComparingTo("60");assertThat(total.laborEntries()).hasSize(1);costs.reverseLabor(actor,id,total.laborEntries().getFirst().id(),new VersionReason(3,"Entered twice elsewhere"));assertThat(costs.costs(actor,id).labor()).isZero();}
    @Test void apiRequiresSessionCsrfAndMatchingTab()throws Exception{mvc.perform(get("/api/v1/maintenance/context")).andExpect(status().isUnauthorized());mvc.perform(post("/api/v1/maintenance/requests").session(session(technician)).header("Idempotency-Key",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new RequestInput(null,"Fault","Details","Entrance","NORMAL","")))).andExpect(status().isForbidden());mvc.perform(get("/api/v1/maintenance/settings").session(session(technician))).andExpect(status().isForbidden());mvc.perform(get("/api/v1/maintenance/orders").session(session(technician))).andExpect(status().isOk());}
    @Test void metricsDoNotInventSamplesAndIncludeOldBacklog(){var empty=prevention.metrics(actor,Instant.now().minusSeconds(86400),Instant.now().plusSeconds(1));assertThat(empty.responseHours()).isNull();assertThat(empty.repairHours()).isNull();assertThat(empty.downtimeHours()).isNull();var order=create(false,false);jdbc.update("UPDATE maintenance_orders SET due_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 100 DAY) WHERE company_id=? AND id=?",company,order.id());var metrics=prevention.metrics(actor,Instant.now().minusSeconds(86400),Instant.now().plusSeconds(1));assertThat(metrics.overdue()).isEqualTo(1);}
    @Test void organizationalScopeExcludesAnotherUnitAndAssignees(){
        long unit=repository.insert("INSERT INTO units(company_id,name,status) VALUES(?,'Synthetic unit','active')",company),outside=repository.insert("INSERT INTO units(company_id,name,status) VALUES(?,'Outside unit','active')",company);
        long manager=user("admin"),membership=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,manager);
        jdbc.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id) VALUES(?,?,?,?)",company,membership,manager,unit);
        var limited=access.current(new AuthSessionUser(manager,company,"Unit manager","admin"));
        var local=service.asset(actor,null,new AssetInput("In scope","LOCATION",null,unit,null,"","NORMAL","",true,null),key());
        var foreign=service.asset(actor,null,new AssetInput("Outside","LOCATION",null,outside,null,"","NORMAL","",true,null),key());
        assertThat(repository.assets(limited,"",false,1,25).items()).extracting(Asset::id).containsExactly(local.id());
        assertThatThrownBy(()->repository.asset(limited,foreign.id())).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->service.asset(limited,null,new AssetInput("Forbidden","LOCATION",null,outside,null,"","NORMAL","",true,null),key())).isInstanceOf(RuntimeException.class);
        assertThat(access.organization(limited,false,null,"",1,25).items()).extracting(Choice::id).containsExactly(unit);
    }
    @Test void technicianCalendarOccupancyBlocksSchedulingAndExcludesTheSameOrder(){
        var body=input(false,false);Instant from=Instant.now().plusSeconds(7200),to=from.plusSeconds(3600);
        var planned=new OrderInput(body.assetId(),body.title(),body.description(),body.orderType(),body.priority(),body.category(),technician,body.dueAt(),from,to,"UTC",body.checklist(),false,false,"MXN",BigDecimal.ZERO,"",null);
        var order=service.create(actor,planned,key()).order();String email=jdbc.queryForObject("SELECT email FROM users WHERE id=?",String.class,technician);
        assertThat(availability.busy(email,from,to,null,null,null)).isTrue();
        assertThatThrownBy(()->service.create(actor,planned,key())).hasMessageContaining("schedule_conflict");
        assertThat(service.edit(actor,order.id(),edit(order,order.dueAt(),"Keep same slot")).order().scheduledStart()).isEqualTo(order.scheduledStart());
    }
    @Test void inactiveTechnicianCannotReceiveNewWork(){team.update(actor,technician,new MaintenanceTeamService.Update(List.of(),false,0));assertThatThrownBy(()->create(false,false)).hasMessageContaining("assignee_inactive");}
    @Test void inventoryOwnerIssuesOnceAndReversalRestoresNativeStock(){
        jdbc.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'inventory','active','test')",company);
        long unit=repository.insert("INSERT INTO units(company_id,name,status) VALUES(?,'Stock unit','active')",company),business=repository.insert("INSERT INTO businesses(company_id,unit_id,name,status) VALUES(?,?,'Stock business','active')",company,unit);
        long warehouse=repository.insert("INSERT INTO sales_inventory_warehouses(company_id,warehouse_code,name,type,status,business_unit_id,business_id) VALUES(?,?,'Synthetic warehouse','main','active',?,?)",company,key(),unit,business);
        long product=repository.insert("INSERT INTO sales_products(company_id,product_code,sku,name,type,currency,cost,inventory_ready,status) VALUES(?,?,?,'Synthetic seal','PRODUCT','MXN',25,1,'active')",company,key(),key());
        jdbc.update("INSERT INTO sales_inventory_balances(company_id,balance_code,product_id,warehouse_id,warehouse_name,available_quantity,unit_cost,uses_inventory) VALUES(?,?,?,?,'Synthetic warehouse',10,25,1)",company,key(),product,warehouse);
        var order=create(false,false);var body=new PartInput(1,product,warehouse,new BigDecimal("2"));String key=key();costs.part(actor,order.id(),body,key);costs.part(actor,order.id(),body,key);
        assertThat(jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id=? AND product_id=? AND warehouse_id=?",BigDecimal.class,company,product,warehouse)).isEqualByComparingTo("8");
        var actual=costs.costs(access.current(actor),order.id());assertThat(actual.actual()).isEqualByComparingTo("50");assertThat(actual.partEntries()).hasSize(1);
        costs.reversePart(actor,order.id(),actual.partEntries().getFirst().id(),new VersionReason(2,"Unused parts returned"));
        assertThat(jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id=? AND product_id=? AND warehouse_id=?",BigDecimal.class,company,product,warehouse)).isEqualByComparingTo("10");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_inventory_movements WHERE company_id=?",Long.class,company)).isEqualTo(2);
        assertThat(costs.costs(access.current(actor),order.id()).actual()).isZero();
    }
    @Test void currencyMismatchFailsBeforeInventoryWrites(){
        jdbc.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'inventory','active','test')",company);
        long unit=repository.insert("INSERT INTO units(company_id,name,status) VALUES(?,'Stock unit','active')",company),business=repository.insert("INSERT INTO businesses(company_id,unit_id,name,status) VALUES(?,?,'Stock business','active')",company,unit);
        long warehouse=repository.insert("INSERT INTO sales_inventory_warehouses(company_id,warehouse_code,name,type,status,business_unit_id,business_id) VALUES(?,?,'Warehouse','main','active',?,?)",company,key(),unit,business);
        long product=repository.insert("INSERT INTO sales_products(company_id,product_code,sku,name,type,currency,cost,inventory_ready,status) VALUES(?,?,?,'Seal','PRODUCT','CAD',25,1,'active')",company,key(),key());
        jdbc.update("INSERT INTO sales_inventory_balances(company_id,balance_code,product_id,warehouse_id,warehouse_name,available_quantity,unit_cost,uses_inventory) VALUES(?,?,?,?,'Warehouse',10,25,1)",company,key(),product,warehouse);
        var order=create(false,false);assertThatThrownBy(()->costs.part(actor,order.id(),new PartInput(1,product,warehouse,BigDecimal.ONE),key())).hasMessageContaining("currency_mismatch");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_inventory_movements WHERE company_id=?",Long.class,company)).isZero();
    }
    @Test void remindersDoNotReviveDismissedNotifications(){var order=create(false,false);notifications.dispatch(company,order.id(),true);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND source_module='maintenance'",Long.class,company)).isEqualTo(1);jdbc.update("UPDATE app_notifications SET dismissed_at=UTC_TIMESTAMP() WHERE company_id=?",company);notifications.dispatch(company,order.id(),true);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND dismissed_at IS NOT NULL",Long.class,company)).isEqualTo(1);}
    @Test void financeLinksUseLiveOwnerAmountsWithoutCreatingPaymentAndCannotDuplicateExpense(){
        jdbc.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'expenses','active','test')",company);
        var context=new com.indice.erp.finance.shared.FinanceContext(user,company,"Synthetic","superadmin",true,com.indice.erp.finance.shared.FinanceScope.corporateOffice());
        var input=mapper.convertValue(Map.ofEntries(Map.entry("folio","MAINT-"+key()),Map.entry("concept","Synthetic contractor"),Map.entry("expenseType","VARIABLE"),Map.entry("subtotalAmount",new BigDecimal("100")),Map.entry("taxAmount",BigDecimal.ZERO),Map.entry("totalAmount",new BigDecimal("100")),Map.entry("currencyCode","MXN"),Map.entry("expenseDate",LocalDate.now().toString())),com.indice.erp.finance.expenses.dto.CreateExpenseRequest.class);
        var expense=expenseOwner.createDraft(context,input);var order=create(false,false);
        costs.linkExpense(actor,order.id(),new ExpenseInput(1,expense.id(),"SERVICE"));assertThat(costs.costs(actor,order.id()).services()).isZero();
        jdbc.update("UPDATE finance_expenses SET status='APPROVED',paid_amount=0 WHERE company_id=? AND id=?",company,expense.id());
        assertThat(costs.costs(actor,order.id()).services()).isEqualByComparingTo("100");assertThat(costs.costs(actor,order.id()).paidServices()).isZero();
        var otherOrder=create(false,false);assertThatThrownBy(()->costs.linkExpense(actor,otherOrder.id(),new ExpenseInput(1,expense.id(),"SERVICE"))).hasMessageContaining("already_linked");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_expense_payments WHERE company_id=?",Long.class,company)).isZero();
        jdbc.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='expenses'",company);
        var unavailable=costs.costs(actor,order.id());assertThat(unavailable.complete()).isFalse();assertThat(unavailable.actual()).isNull();assertThat(unavailable.expenses().getFirst().available()).isFalse();
    }
    @Test void taskLinkUsesNativeOwnerAndRetriesPreserveIndependentStatus(){
        var order=create(false,false);
        assertThatThrownBy(()->taskLinks.create(actor,order.id(),1)).isInstanceOf(SecurityException.class);
        jdbc.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'processes','active','test')",company);
        var linked=taskLinks.create(actor,order.id(),1);assertThat(linked.taskId()).isNotNull();
        assertThat(taskLinks.create(actor,order.id(),1).taskId()).isEqualTo(linked.taskId());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM process_tasks WHERE company_id=?",Long.class,company)).isEqualTo(1);
        service.transition(actor,order.id(),new Transition(linked.order().version(),"CANCELLED","No repair needed"));
        assertThat(jdbc.queryForObject("SELECT status FROM process_tasks WHERE company_id=? AND id=?",String.class,company,linked.taskId())).isEqualTo("pending");
    }
    @Test void costSummaryKeepsCurrenciesSeparateAndExcludesOpenWork(){
        var first=create(false,false);var second=create(false,false);create(false,false);
        jdbc.update("UPDATE maintenance_orders SET status='CLOSED',closed_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id IN (?,?)",company,first.id(),second.id());
        jdbc.update("UPDATE maintenance_orders SET currency='CAD',estimated_amount=25 WHERE company_id=? AND id=?",company,second.id());
        var summary=costSummary.summary(access.current(actor),Instant.now().minusSeconds(3600),Instant.now().plusSeconds(1));
        assertThat(summary.orders()).isEqualTo(2);assertThat(summary.currencies()).extracting(MaintenanceCostSummaryService.CurrencyTotal::currency).containsExactly("CAD","MXN");
        assertThat(summary.currencies().getFirst().estimated()).isEqualByComparingTo("25");assertThat(summary.currencies().getLast().estimated()).isEqualByComparingTo("10");
        assertThat(summary.currencies()).allMatch(c->c.complete()&&c.actual().signum()==0);
    }
    @Test void preventiveDrilldownUsesOriginalDeadlinesAndExcludesCancelledCycles(){
        var first=create(false,false);var cancelled=create(false,false);Instant from=Instant.now().minusSeconds(60),to=Instant.now().plusSeconds(3600);
        jdbc.update("UPDATE maintenance_orders SET order_type='PREVENTIVE',original_due_at=UTC_TIMESTAMP(6),due_at=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 100 DAY) WHERE company_id=?",company);
        jdbc.update("UPDATE maintenance_orders SET status='CANCELLED' WHERE company_id=? AND id=?",company,cancelled.id());
        assertThat(prevention.metrics(actor,from,to).preventiveDue()).isEqualTo(1);
        assertThat(repository.orders(actor,"","","preventive",0,1,25,from,to).items()).extracting(Order::id).containsExactly(first.id());
    }
    @Test void serverSortingIsStableAcrossPagesAndRejectsSqlIdentifiers(){
        var first=create(false,false);var second=create(false,false);
        jdbc.update("UPDATE maintenance_orders SET title='Zulu' WHERE company_id=? AND id=?",company,first.id());
        jdbc.update("UPDATE maintenance_orders SET title='Alpha' WHERE company_id=? AND id=?",company,second.id());
        assertThat(repository.orders(actor,"","","",0,1,1,null,null,"title","asc").items()).extracting(Order::id).containsExactly(second.id());
        assertThat(repository.orders(actor,"","","",0,2,1,null,null,"title","asc").items()).extracting(Order::id).containsExactly(first.id());
        assertThat(repository.orders(actor,"","","",0,1,25,null,null,"title","desc").items()).extracting(Order::id).containsExactly(first.id(),second.id());
        assertThatThrownBy(()->repository.orders(actor,"","","",0,1,25,null,null,"o.id;SELECT 1","asc")).hasMessageContaining("sort_invalid");
    }
    @Test void parallelCreateRetriesCommitOnlyOneOrder()throws Exception{
        var tx=new org.springframework.transaction.support.TransactionTemplate(transactions);tx.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        long[] fixture=tx.execute(status->{long c=repository.insert("INSERT INTO companies(name) VALUES(?)","Concurrent maintenance "+key());long u=repository.insert("INSERT INTO users(email,password_hash) VALUES(?,'synthetic-only')",key()+"@example.com");jdbc.update("INSERT INTO user_companies(company_id,user_id,role,status) VALUES(?,?,'superadmin','active')",c,u);jdbc.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'maintenance','active','test')",c);return new long[]{c,u};});
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);var barrier=new java.util.concurrent.CyclicBarrier(2);String key=key();var user=new AuthSessionUser(fixture[1],fixture[0],"Synthetic","superadmin");var body=new OrderInput(null,"Concurrent","","INSPECTION","NORMAL","",null,Instant.now().plusSeconds(3600),null,null,"UTC",List.of(),false,false,"MXN",BigDecimal.ZERO,"",null);
        try{java.util.concurrent.Callable<Long> call=()->{barrier.await(10,java.util.concurrent.TimeUnit.SECONDS);return service.create(user,body,key).order().id();};var first=pool.submit(call);var second=pool.submit(call);assertThat(first.get(20,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(second.get(20,java.util.concurrent.TimeUnit.SECONDS));}
        finally{pool.shutdownNow();tx.execute(status->{for(String table:List.of("maintenance_replays","maintenance_events","maintenance_orders"))jdbc.update("DELETE FROM "+table+" WHERE company_id=?",fixture[0]);jdbc.update("DELETE FROM companies WHERE id=?",fixture[0]);jdbc.update("DELETE FROM users WHERE id=?",fixture[1]);return null;});}
    }
}
