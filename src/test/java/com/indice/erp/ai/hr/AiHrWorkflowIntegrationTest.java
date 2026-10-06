package com.indice.erp.ai.hr;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.hr.assistant.HrAssistantService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

/** Synthetic tenants on the isolated test database. Owner services and action SQL are real. */
@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false"})
@Transactional
class AiHrWorkflowIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired AiHrActionService actions;
    @Autowired HrAssistantService owner;
    @Autowired AiHrAccess access;
    @Autowired com.indice.erp.hr.records.HrRecordService records;
    @Autowired com.indice.erp.hr.assistant.HrAssistantRecordsService recordReads;
    @Autowired com.indice.erp.hr.assistant.HrAssistantAttendanceService attendance;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @MockitoBean AiToolAuthorizationService authorization;
    long company,unit,business;
    StoredToken token;

    @BeforeEach void fixture() {
        String unique=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies(name) VALUES(?)","Synthetic HR "+unique);
        company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,"Synthetic HR "+unique);
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES(?,'test','Synthetic HR operator')",unique+"@example.test");
        long user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,unique+"@example.test");
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES(?,?,'root','active','all')",user,company);
        long membership=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,user);
        jdbc.update("INSERT INTO units(company_id,name,status) VALUES(?,'Synthetic unit','active')",company);
        unit=jdbc.queryForObject("SELECT id FROM units WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES(?,?,'Synthetic business','active')",company,unit);
        business=jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?",Long.class,company);
        var actor=new AuthSessionUser(user,company,membership,"Synthetic HR operator","root");
        var scopes=Set.of("hr.people.manage","hr.people.terminate","hr.people.import","hr.people.details:read","hr.assets.manage","hr.assets.read","hr.announcements.manage","hr.announcements.read","hr.announcements.respond","hr.records.manage","hr.permissions.request","hr.permissions.review","hr.permissions.self:read","hr.permissions.read","hr.incentives.manage","hr.incentives.read","hr.payroll.read","hr.payroll.prepare","hr.payroll.approve","hr.payroll.pay","hr.control.read","hr.control.manage","hr.attendance.correct","hr.attendance:read");
        long id=tokens.insert(actor,"generic_mcp","Synthetic HR connection","test",unique.replace("-","")+UUID.randomUUID().toString().replace("-",""),Instant.now().plusSeconds(3600),scopes);
        token=new StoredToken(id,actor,scopes);
        when(authorization.canReadGuideTab(any(),eq("human_resources"),anyString())).thenReturn(true);
    }
    @Autowired com.indice.erp.hr.assistant.HrAssistantPayrollService payrollAssistant;
    @Test void payrollPreparationIsPureConfirmsNativeAmountsAndClosesItsLifecycle() {
        long person=apply("create_employee",employeeRequest("payroll")).employees().getFirst().userCompanyId();
        jdbc.update("UPDATE user_work_profiles SET payroll_treatment='operational_payroll' WHERE company_id=? AND user_company_id=?",company,person);
        var start=java.time.LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        var change=new com.indice.erp.hr.payroll.HrPayrollAssistantContracts.Change("weekly",start,null,"single",null,null,null,null);
        var input=payrollChange(null,change);var preview=actions.preview(token,"prepare_hr_payroll",input);
        assertThat(count("payroll_preferences")).isZero();assertThat(count("payroll_runs")).isZero();assertThat(count("payroll_run_lines")).isZero();
        assertThat(preview.after().payroll().runs()).hasSize(1);assertThat(preview.after().payroll().runs().getFirst().lines().getFirst().currency()).isEqualTo("CAD");
        var commit=new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        var saved=actions.commit(token,"prepare_hr_payroll",commit).result().payroll().runs().getFirst();
        assertThat(saved.totals()).isEqualTo(preview.after().payroll().runs().getFirst().totals());assertThat(actions.commit(token,"prepare_hr_payroll",commit).replayed()).isTrue();assertThat(count("payroll_runs")).isEqualTo(1);
        var manual=new com.indice.erp.hr.payroll.HrPayrollAssistantContracts.ManualItem("earning","Synthetic bonus",new BigDecimal("25"));
        var adjust=new com.indice.erp.hr.payroll.HrPayrollAssistantContracts.Change(null,null,null,null,saved.lines().getFirst().id(),"operational_payroll","Synthetic review",List.of(manual));
        var adjusted=apply("adjust_hr_payroll_line",payrollChange(saved.id(),adjust)).payroll().runs().getFirst();
        assertThat(adjusted.lines().getFirst().items()).anySatisfy(item->{assertThat(item.sourceType()).isEqualTo("manual");assertThat(item.amount()).isEqualByComparingTo("25");});
        assertThat(apply("recalculate_hr_payroll",payrollChange(saved.id(),null)).payroll().runs().getFirst().status()).isEqualTo("draft");
        assertThat(apply("approve_hr_payroll",payrollChange(saved.id(),null)).payroll().runs().getFirst().status()).isEqualTo("approved");
        assertThatThrownBy(()->actions.preview(token,"register_hr_payroll_paid",payrollChange(saved.id(),null))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("pendientes de pago");
        // Synthetic settled payable fixture; payment execution is owned and tested by Expenses.
        jdbc.update("UPDATE finance_expenses expense JOIN payroll_run_lines line ON line.payable_expense_id=expense.id AND line.company_id=expense.company_id SET expense.payment_status='PAID' WHERE line.company_id=? AND line.run_id=?",company,saved.id());
        assertThat(apply("register_hr_payroll_paid",payrollChange(saved.id(),null)).payroll().runs().getFirst().status()).isEqualTo("paid");
        assertThatThrownBy(()->actions.preview(token,"cancel_hr_payroll",payrollChange(saved.id(),null))).isInstanceOf(IllegalArgumentException.class);
        assertThat(payrollAssistant.list(token.user(),null).totalCount()).isEqualTo(1);
    }
    @Test void payrollRejectsChangedSalaryAndSeparatesPreparationFromApproval() {
        long person=apply("create_employee",employeeRequest("stale-payroll")).employees().getFirst().userCompanyId();
        var start=java.time.LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        var change=new com.indice.erp.hr.payroll.HrPayrollAssistantContracts.Change("weekly",start,null,null,null,null,null,null);
        var input=payrollChange(null,change);var preview=actions.preview(token,"prepare_hr_payroll",input);
        jdbc.update("UPDATE user_work_profiles SET salary=175 WHERE company_id=? AND user_company_id=?",company,person);
        var nested=new org.springframework.transaction.support.TransactionTemplate(transactions);nested.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(()->nested.execute(status->actions.commit(token,"prepare_hr_payroll",new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString())))).isInstanceOf(HrAssistantService.Changed.class);
        assertThat(count("payroll_runs")).isZero();
        long id=apply("prepare_hr_payroll",input).payroll().runs().getFirst().id();
        assertThatThrownBy(()->actions.preview(new StoredToken(token.id(),token.user(),Set.of("hr.payroll.prepare")),"approve_hr_payroll",payrollChange(id,null))).isInstanceOf(SecurityException.class);
        var manager=new com.indice.erp.auth.AuthSessionUser(token.user().userId(),company,token.user().userCompanyId(),"Synthetic manager","manager");
        assertThatThrownBy(()->actions.preview(new StoredToken(token.id(),manager,Set.of("hr.payroll.approve")),"approve_hr_payroll",payrollChange(id,null))).isInstanceOf(SecurityException.class);
        assertThat(apply("cancel_hr_payroll",payrollChange(id,null)).payroll().runs().getFirst().status()).isEqualTo("cancelled");
        assertThat(count("payroll_run_lines")).isEqualTo(1);
    }
    private static Change payrollChange(Long id,com.indice.erp.hr.payroll.HrPayrollAssistantContracts.Change change) {
        return new Change(id,null,null,null,null,null,null,null,null,null,null,change);
    }
    @Test void scheduleCycleIsReadOnlyUntilConfirmationAndRejectsChangedRules() {
        long person=apply("create_employee",employeeRequest("attendance")).employees().getFirst().userCompanyId();
        var day=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.DayRule(1,"08:00","16:00",0,0,10,false);
        var schedule=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.ScheduleChange("Synthetic schedule","active","strict",false,null,List.of(day));
        var input=attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(schedule,null,null,null,null,null));
        var preview=actions.preview(token,"create_hr_schedule",input);
        assertThat(count("attendance_schedule_templates")).isZero();
        assertThat(preview.after().attendance().schedules().getFirst().days()).containsExactly(day);
        long id=apply("create_hr_schedule",input).attendance().schedules().getFirst().id();
        var start=java.time.LocalDate.now().plusDays(7);
        assertThat(attendance.candidates(token.user(),start,start.plusDays(6),true,new PageRequest("attendance",null,unit,business,1,5)).items())
            .extracting(com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Candidate::userCompanyId).contains(person);
        var assignment=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.AssignmentChange(id,null,List.of(person),start,start.plusDays(6));
        var assign=attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,assignment,null,null,null));
        var stale=actions.preview(token,"assign_hr_schedule",assign);
        jdbc.update("UPDATE attendance_schedule_template_days SET start_time='09:00:00' WHERE template_id=?",id);
        var nested=new org.springframework.transaction.support.TransactionTemplate(transactions);nested.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(()->nested.execute(status->actions.commit(token,"assign_hr_schedule",new AiHrContracts.CommitRequest(stale.confirmationToken(),UUID.randomUUID().toString())))).isInstanceOf(HrAssistantService.Changed.class);
        assertThat(count("user_schedule_assignments")).isZero();
        assertThat(apply("assign_hr_schedule",assign).attendance().members().getFirst().assignments()).hasSize(1);
        var clear=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.AssignmentChange(null,null,List.of(person),start.plusDays(1),null);
        apply("clear_hr_work_assignments",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,clear,null,null,null)));
        assertThat(attendance.calendar(token.user(),person,java.time.YearMonth.from(start)).items()).hasSize(java.time.YearMonth.from(start).lengthOfMonth());
        assertThatThrownBy(()->actions.preview(new StoredToken(token.id(),token.user(),Set.of("hr.attendance:read")),"assign_hr_schedule",assign)).isInstanceOf(SecurityException.class);
    }
    @Test void attendanceCorrectionsRetainEventsRejectFutureMarksAndReplayWithoutDuplication() {
        long person=apply("create_employee",employeeRequest("correction")).employees().getFirst().userCompanyId();
        var date=java.time.LocalDate.now().minusDays(1);
        var event=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.ManualEventChange(person,date,"check_in",date.atTime(8,0),"Synthetic administrative event");
        apply("record_hr_attendance_event",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,null,null,event)));
        var correction=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.CorrectionChange(person,List.of(date),"rest","Synthetic correction");
        var input=attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,correction,null,null));
        var preview=actions.preview(token,"correct_hr_attendance",input);
        assertThat(count("user_attendance_events")).isEqualTo(1);
        var commit=new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        var saved=actions.commit(token,"correct_hr_attendance",commit);
        assertThat(saved.result().attendance().days().getFirst().effectiveStatus()).isEqualTo("rest");
        assertThat(actions.commit(token,"correct_hr_attendance",commit).replayed()).isTrue();
        assertThat(count("user_attendance_events")).isEqualTo(2);
        var future=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.CorrectionChange(person,List.of(date.plusDays(3)),"on_time",null);
        assertThatThrownBy(()->actions.preview(token,"correct_hr_attendance",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,future,null,null)))).isInstanceOf(IllegalArgumentException.class);
        var clear=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.CorrectionChange(person,List.of(date),null,null);
        assertThat(apply("correct_hr_attendance",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,clear,null,null))).attendance().days().getFirst().correctedStatus()).isEmpty();
    }
    @Test void workSiteAndAllowedLocationCycleUsesContractOwnershipAndRetainsHistory() {
        long person=apply("create_employee",employeeRequest("work-site")).employees().getFirst().userCompanyId();
        var start=java.time.LocalDate.now().plusDays(7);
        var location=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.LocationChange("Synthetic site",new BigDecimal("45.4"),new BigDecimal("-75.7"),150,start,start.plusDays(30),"08:00","16:00",new BigDecimal("8"),5,unit,business,"active");
        long id=apply("create_hr_location",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,location,null,null,null,null))).attendance().locations().getFirst().id();
        var allowed=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.AllowedLocationsChange(person,List.of(id));
        apply("set_hr_allowed_locations",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,null,allowed,null)));
        var assignment=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.AssignmentChange(null,id,List.of(person),start,start.plusDays(5));
        apply("assign_hr_work_site",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,assignment,null,null,null)));
        assertThat(count("user_work_site_assignments")).isEqualTo(1);
        var remove=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.AllowedLocationsChange(person,List.of());
        apply("set_hr_allowed_locations",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,null,remove,null)));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_allowed_locations WHERE company_id=? AND status='active'",Long.class,company)).isZero();
        assertThat(count("user_allowed_locations")).isEqualTo(1);
        var foreign=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.AllowedLocationsChange(person,List.of(Long.MAX_VALUE));
        assertThatThrownBy(()->actions.preview(token,"set_hr_allowed_locations",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,null,foreign,null)))).isInstanceOf(NoSuchElementException.class);
    }
    private static Change attendanceChange(Long id,com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change change) {
        return new Change(id,null,null,null,null,null,null,null,null,null,change);
    }
    @Test void restPlanIsFullyReviewedAtomicAndReplayDoesNotDuplicateEvents() {
        long first=apply("create_employee",employeeRequest("rest-first")).employees().getFirst().userCompanyId();
        long second=apply("create_employee",employeeRequest("rest-second")).employees().getFirst().userCompanyId();
        var date=java.time.LocalDate.now().minusDays(1);
        var plan=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.RestPlan(List.of(
            new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.RestAssignment(first,List.of(date,date.minusDays(1))),
            new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.RestAssignment(second,List.of(date))),"Synthetic rest plan");
        var input=attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,null,null,null,plan));
        var preview=actions.preview(token,"assign_hr_rest_days",input);
        assertThat(preview.after().attendance().days()).hasSize(3);
        assertThat(count("user_attendance_events")).isZero();
        var invalid=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.RestPlan(List.of(
            plan.assignments().getFirst(),new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.RestAssignment(Long.MAX_VALUE,List.of(date))),null);
        assertThatThrownBy(()->actions.preview(token,"assign_hr_rest_days",attendanceChange(null,
            new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,null,null,null,invalid)))).isInstanceOf(NoSuchElementException.class);
        assertThat(count("user_attendance_events")).isZero();
        var commit=new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        var saved=actions.commit(token,"assign_hr_rest_days",commit);
        assertThat(saved.result().attendance().days()).hasSize(3).allSatisfy(d->assertThat(d.effectiveStatus()).isEqualTo("rest"));
        assertThat(actions.commit(token,"assign_hr_rest_days",commit).replayed()).isTrue();
        assertThat(count("user_attendance_events")).isEqualTo(3);
    }
    @Test void personalAttendanceUsesTheCurrentAccountAndDoesNotExposePrivateMedia() {
        long person=apply("create_employee",employeeRequest("self-attendance")).employees().getFirst().userCompanyId();
        var date=java.time.LocalDate.now().minusDays(1);
        var event=new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.ManualEventChange(person,date,"check_in",date.atTime(8,0),"Synthetic self event");
        apply("record_hr_attendance_event",attendanceChange(null,new com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Change(null,null,null,null,null,event)));
        long user=jdbc.queryForObject("SELECT user_id FROM user_companies WHERE company_id=? AND id=?",Long.class,company,person);
        var actor=new AuthSessionUser(user,company,person,"Synthetic employee","user");
        jdbc.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role,skill_level) VALUES(?,'human_resources','user',1)",person);
        jdbc.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view) VALUES(?,'human_resources','attendance',1)",person);
        var own=attendance.events(actor,null,date,null);
        assertThat(own.items()).hasSize(1);assertThat(own.items().getFirst().kind()).isEqualTo("check_in");
        assertThat(attendance.events(token.user(),null,date,null).items()).isEmpty();
        assertThat(attendance.selfCalendar(actor,java.time.YearMonth.from(date)).items()).hasSize(java.time.YearMonth.from(date).lengthOfMonth());
        assertThat(access.allowed(new StoredToken(token.id(),actor,Set.of("hr.attendance:read")),"get_my_attendance_events")).isTrue();
        assertThat(access.allowed(new StoredToken(token.id(),actor,Set.of("hr.attendance:read")),"get_hr_attendance_events")).isFalse();
    }
    @Test void incentiveCycleConfirmsNativeAmountsAndPreservesAppliedPayrollRecords() {
        long person=apply("create_employee",employeeRequest("incentive")).employees().getFirst().userCompanyId();
        var input=new IncentiveChange("Synthetic incentive","Synthetic earning","manual",new BigDecimal("100"),"CAD","active",java.time.LocalDate.of(2026,10,1),null,"next_payroll","employees",List.of(person),null,null,null,null);
        var preview=actions.preview(token,"create_hr_incentive",new Change(null,null,null,null,null,null,null,null,null,input));
        assertThat(count("hr_incentives")).isZero();
        assertThat(preview.after().incentive().applications()).hasSize(1);
        assertThat(preview.after().incentive().applications().getFirst().currency()).isEqualTo("CAD");
        assertThat(preview.after().incentive().applications().getFirst().amount()).isEqualByComparingTo("100");
        long id=apply("create_hr_incentive",new Change(null,null,null,null,null,null,null,null,null,input)).incentive().id();
        jdbc.update("UPDATE hr_incentive_applications SET status='applied' WHERE company_id=? AND incentive_id=?",company,id);
        var result=apply("cancel_hr_incentive",new Change(id,null,null,null,null)).incentive();
        assertThat(result.status()).isEqualTo("paused");
        assertThat(result.applications().getFirst().status()).isEqualTo("applied");
        var foreign=new IncentiveChange(input.name(),null,"manual",input.amount(),"CAD","paused",input.startDate(),null,"next_payroll","employees",List.of(Long.MAX_VALUE),null,null,null,null);
        assertThatThrownBy(()->actions.preview(token,"create_hr_incentive",new Change(null,null,null,null,null,null,null,null,null,foreign))).isInstanceOfAny(com.indice.erp.hr.HrAccessDeniedException.class,NoSuchElementException.class);
    }
    @Test void incentiveCurrencyChangesRequireAReplacementApproval() {
        long person=apply("create_employee",employeeRequest("changed-incentive")).employees().getFirst().userCompanyId();
        var input=new IncentiveChange("Synthetic incentive",null,"manual",new BigDecimal("100"),"CAD","active",java.time.LocalDate.of(2026,10,1),null,"next_payroll","employees",List.of(person),null,null,null,null);
        var preview=actions.preview(token,"create_hr_incentive",new Change(null,null,null,null,null,null,null,null,null,input));
        jdbc.update("UPDATE user_work_profiles SET registration_country='MX' WHERE company_id=? AND user_company_id=?",company,person);
        var nested=new org.springframework.transaction.support.TransactionTemplate(transactions);nested.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(()->nested.execute(status->actions.commit(token,"create_hr_incentive",new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString())))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("changed after preview");
        assertThat(count("hr_incentives")).isZero();
    }
    @Test void ownPermissionCycleSeparatesReviewAndSyncsApprovedLeave() {
        jdbc.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,user_code,position,department,unit_id,business_id,status) VALUES(?,?,?,'SYNTHETIC-OPERATOR','Operator','Operations',?,?,'active')",company,token.user().userCompanyId(),token.user().userId(),unit,business);
        var request=new PermissionChange("vacation","paid",java.time.LocalDate.of(2026,10,12),java.time.LocalDate.of(2026,10,13),false,"Synthetic leave",null);
        var preview=actions.preview(token,"create_my_hr_permission",new Change(null,null,null,null,null,null,null,null,request));
        assertThat(count("user_permission_requests")).isZero();
        assertThat(preview.after().permission().days()).isEqualByComparingTo("2");
        long id=apply("create_my_hr_permission",new Change(null,null,null,null,null,null,null,null,request)).permission().id();
        var notes=new PermissionChange(null,null,null,null,null,null,"Synthetic approval");
        var limited=new StoredToken(token.id(),token.user(),Set.of("hr.permissions.request"));
        assertThatThrownBy(()->actions.preview(limited,"approve_hr_permission",new Change(id,null,null,null,null,null,null,null,notes))).isInstanceOf(SecurityException.class);
        assertThat(apply("approve_hr_permission",new Change(id,null,null,null,null,null,null,null,notes)).permission().status()).isEqualTo("approved");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_attendance_daily_records WHERE company_id=? AND permission_request_id=?",Long.class,company,id)).isEqualTo(2);
        assertThatThrownBy(()->actions.preview(token,"withdraw_my_hr_permission",new Change(id,null,null,null,null))).isInstanceOf(IllegalArgumentException.class);
        long pending=apply("create_my_hr_permission",new Change(null,null,null,null,null,null,null,null,request)).permission().id();
        assertThat(apply("withdraw_my_hr_permission",new Change(pending,null,null,null,null)).withdrawn()).isTrue();
        assertThat(count("user_permission_requests")).isEqualTo(1);
    }
    @Test void employeeDatesAndScheduledAnnouncementSurviveTheOwnerBoundary() {
        var input=employeeRequest("dates").employee();
        var hire=java.time.LocalDate.of(2026,1,1);
        var employee=new EmployeeChange(input.firstName(),input.lastName(),input.email(),input.phone(),input.position(),input.department(),unit,business,hire,input.salary(),input.payPeriod(),input.salaryType(),input.hourlyRate(),"temporary",hire,hire.plusYears(1),"CA");
        var result=apply("create_employee",new Change(null,employee,null,null,null)).employees().getFirst();
        assertThat(result.hireDate()).isEqualTo(hire);
        assertThat(result.contractStartDate()).isEqualTo(hire);
        var schedule=java.time.LocalDateTime.of(2027,1,1,9,0);
        var announcement=new AnnouncementChange("Synthetic scheduled notice","general","Scheduled content","all","scheduled",schedule,null,null,null);
        var saved=apply("create_announcement",new Change(null,null,null,null,announcement)).announcement();
        assertThat(saved.status()).isEqualTo("scheduled");
        assertThat(saved.scheduledFor()).startsWith("2027-01-01");
    }
    private Result apply(String action,Change request) {
        var preview=actions.preview(token,action,request);
        var commit=new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        var result=actions.commit(token,action,commit);
        assertThat(actions.commit(token,action,commit).replayed()).isTrue();
        return result.result();
    }
    @Test void employmentTerminationRequiresSeparateConsentAndRetainsTheProfile() {
        long id=apply("create_employee",employeeRequest("termination")).employees().getFirst().userCompanyId();
        var change=new Change(id,null,null,null,null,new TerminationChange(java.time.LocalDate.of(2026,10,1),null,"resignation",null,"Synthetic resignation"),null,null);
        var withoutConsent=new StoredToken(token.id(),token.user(),Set.of("hr.people.manage"));
        assertThatThrownBy(()->actions.preview(withoutConsent,"terminate_employee",change)).isInstanceOf(SecurityException.class);
        var preview=actions.preview(token,"terminate_employee",change);
        assertThat(owner.employee(token.user(),id).status()).isEqualTo("active");
        assertThat(preview.changes().termination().lastWorkingDay()).isEqualTo(java.time.LocalDate.of(2026,10,1));
        assertThat(apply("terminate_employee",change).employees().getFirst().status()).isEqualTo("terminated");
        assertThat(count("user_work_profiles")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT termination_summary FROM user_work_profiles WHERE company_id=? AND user_company_id=?",String.class,company,id)).isEqualTo("Synthetic resignation");
        assertThatThrownBy(()->actions.preview(token,"terminate_employee",change)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void assetAssignmentAndStatusRetainHistoryAndRejectStaleApproval() {
        long person=apply("create_employee",employeeRequest("responsible")).employees().getFirst().userCompanyId();
        var asset=new AssetChange(null,"equipment","Synthetic equipment",null,null,null,unit,"available",null,new BigDecimal("900"),"CAD",null);
        long id=apply("create_hr_asset",new Change(null,null,null,asset,null)).asset().id();
        var patch=new Change(id,null,null,new AssetChange(null,null,"Updated equipment",null,null,null,null,null,null,null,null,null),null);
        assertThat(apply("update_hr_asset",patch).asset().name()).isEqualTo("Updated equipment");
        var assign=new Change(id,null,null,null,null,null,new AssetAssignment(person,unit,"custody",java.time.LocalDateTime.of(2026,10,1,9,0),"Synthetic delivery","custody"),null);
        assertThat(apply("reassign_hr_asset",assign).asset().responsibleUserCompanyId()).isEqualTo(person);
        assertThat(owner.assetHistory(token.user(),id,null).items()).anyMatch(row->row.responsibleUserCompanyId()!=null&&row.responsibleUserCompanyId()==person);
        var maintenance=new Change(id,null,null,null,null,null,new AssetAssignment(null,unit,"maintenance",java.time.LocalDateTime.of(2026,10,2,9,0),null,"maintenance"),null);
        var preview=actions.preview(token,"change_hr_asset_status",maintenance);
        assertThat(owner.asset(token.user(),id).status()).isEqualTo("custody");
        assertThat(apply("change_hr_asset_status",maintenance).asset().responsibleUserCompanyId()).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_asset_assignments WHERE company_id=? AND asset_id=? AND ended_at IS NOT NULL",Long.class,company,id)).isEqualTo(1);
        var nested=new org.springframework.transaction.support.TransactionTemplate(transactions);
        nested.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(()->nested.execute(status->actions.commit(token,"change_hr_asset_status",new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString())))).isInstanceOf(HrAssistantService.Changed.class);
    }
    @Test void announcementEditPublishesOwnerDeliveriesAndOwnReadStateOnly() {
        apply("create_employee",employeeRequest("recipient"));
        long id=apply("create_announcement",new Change(null,null,null,null,new AnnouncementChange("Synthetic draft","general","Draft content","all","draft",null,null,null,null))).announcement().id();
        var edit=new Change(id,null,null,null,new AnnouncementChange("Synthetic publication","urgent","Published content","all","published",null,null,null,null));
        var preview=actions.preview(token,"update_announcement",edit);
        assertThat(owner.announcement(token.user(),id).status()).isEqualTo("draft");
        assertThat(apply("update_announcement",edit).announcement().status()).isEqualTo("published");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hr_announcement_deliveries WHERE company_id=? AND announcement_id=?",Long.class,company,id)).isPositive();
        assertThat(apply("mark_announcement_read",new Change(id,null,null,null,null)).announcement().read()).isTrue();
        assertThat(owner.announcementReceipts(token.user(),id,new PageRequest(null,"read",null,null,1,1)).totalCount()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hr_announcement_reads WHERE company_id=? AND announcement_id=?",Long.class,company,id)).isEqualTo(1);
        assertThat(apply("mark_announcement_unread",new Change(id,null,null,null,null)).announcement().read()).isFalse();
    }
    @Test void recordLifecycleRetainsAgreementsWitnessesAndStatusHistory() {
        long person=apply("create_employee",employeeRequest("record-lifecycle")).employees().getFirst().userCompanyId();
        var input=new RecordChange(person,"warning","medium","pending","Synthetic warning","Synthetic description","Initial agreement",java.time.LocalDateTime.of(2026,1,1,9,0),List.of(new Witness(null,"Synthetic witness")));
        var preview=actions.preview(token,"create_hr_record",new Change(null,null,null,null,null,null,null,input));
        assertThat(count("user_records")).isZero();
        long id=apply("create_hr_record",new Change(null,null,null,null,null,null,null,input)).record().id();
        var update=new RecordChange(person,"warning","medium","resolved",input.title(),input.description(),"Resolved agreement",input.eventDate(),input.witnesses());
        var result=apply("update_hr_record",new Change(id,null,null,null,null,null,null,update)).record();
        assertThat(result.status()).isEqualTo("resolved");
        assertThat(result.actionsTaken()).isEqualTo("Resolved agreement");
        assertThat(result.history()).anyMatch(row->"status_changed".equals(row.type())&&"resolved".equals(row.toStatus()));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_record_witnesses WHERE company_id=? AND record_id=?",Long.class,company,id)).isEqualTo(1);
    }
    @Test void createsAndEditsEmployeeWithoutChangingAuthorityAndReplaysSafely() {
        var preview=actions.preview(token,"create_employee",employeeRequest("create"));
        assertThat(count("user_work_profiles")).isZero();
        assertThat(preview.after().employees().getFirst().salaryType()).isEqualTo("daily");
        assertThat(preview.after().employees().getFirst().unitName()).isEqualTo("Synthetic unit");
        assertThat(preview.after().employees().getFirst().salaryCurrency()).isEqualTo("CAD");
        var commit=new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        var result=actions.commit(token,"create_employee",commit);
        var employee=result.result().employees().getFirst();
        assertThat(employee.userCompanyId()).isPositive();
        assertThat(employee.unitId()).isEqualTo(unit);
        assertThat(employee.salaryCurrency()).isEqualTo("CAD");
        assertThat(actions.commit(token,"create_employee",commit).replayed()).isTrue();
        assertThat(count("user_work_profiles")).isEqualTo(1);
        jdbc.update("UPDATE user_companies SET role='manager' WHERE company_id=? AND id=?",company,employee.userCompanyId());
        var edit=new Change(employee.userCompanyId(),new EmployeeChange(null,null,null,null,"Updated position",null,null,null,null,null,null,null,null,null,null,null),null,null,null);
        var change=actions.preview(token,"update_employee",edit);
        assertThat(change.before().employees().getFirst().position()).isEqualTo("Operator");
        actions.commit(token,"update_employee",new AiHrContracts.CommitRequest(change.confirmationToken(),UUID.randomUUID().toString()));
        assertThat(owner.employee(token.user(),employee.userCompanyId()).position()).isEqualTo("Updated position");
        assertThat(jdbc.queryForObject("SELECT role FROM user_companies WHERE company_id=? AND id=?",String.class,company,employee.userCompanyId())).isEqualTo("manager");
        assertThat(owner.employee(token.user(),employee.userCompanyId()).salary()).isEqualByComparingTo("150");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_audit_events WHERE company_id=? AND (normalized_args_json LIKE '%@example.test%' OR result_json LIKE '%@example.test%')",Long.class,company)).isZero();
    }
    @Test void importsWholeBatchAndRejectsDuplicateForeignAndOldConsentBeforeMutation() {
        var person=employeeRequest("batch").employee();
        var duplicate=new Change(null,null,List.of(person,person),null,null);
        assertThatThrownBy(()->actions.preview(token,"import_employees",duplicate)).isInstanceOf(IllegalArgumentException.class);
        assertThat(count("user_work_profiles")).isZero();
        var prepared=actions.preview(token,"import_employees",new Change(null,null,List.of(person,employeeRequest("batch2").employee()),null,null));
        assertThat(prepared.after().employees()).hasSize(2);
        var commit=new AiHrContracts.CommitRequest(prepared.confirmationToken(),UUID.randomUUID().toString());
        assertThat(actions.commit(token,"import_employees",commit).result().employees()).hasSize(2);
        assertThat(actions.commit(token,"import_employees",commit).replayed()).isTrue();
        assertThat(count("user_work_profiles")).isEqualTo(2);
        assertThatThrownBy(()->actions.preview(new StoredToken(token.id(),token.user(),Set.of("hr.people:read")),"create_employee",employeeRequest("old"))).isInstanceOf(SecurityException.class);
        var invalid=new EmployeeChange("Foreign","Person","foreign@example.test",null,"Operator","Operations",Long.MAX_VALUE,business,null,new BigDecimal("150"),"weekly","daily",null,"permanent",null,null,"CA");
        assertThatThrownBy(()->actions.preview(token,"create_employee",new Change(null,invalid,null,null,null))).isInstanceOf(IllegalArgumentException.class);
        when(authorization.canReadGuideTab(token.user(),"human_resources","collaborators")).thenReturn(false);
        assertThat(access.allowed(token,"create_employee")).isFalse();
    }
    @Test void createsAssetAndDraftAnnouncementWithoutPublishingDuringReadOrPreview() {
        var asset=new AssetChange(null,"equipment","Synthetic laptop",null,"TEST-"+UUID.randomUUID(),null,unit,"available",null,new BigDecimal("1000"),"CAD","Test");
        var preview=actions.preview(token,"create_hr_asset",new Change(null,null,null,asset,null));
        assertThat(count("user_assets")).isZero();
        var result=actions.commit(token,"create_hr_asset",new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString()));
        assertThat(result.result().asset().valueCurrency()).isEqualTo("CAD");
        assertThat(owner.assets(token.user(),new PageRequest(null,null,unit,null,1,1)).totalCount()).isEqualTo(1);
        var announcement=new AnnouncementChange("Synthetic announcement","general","Synthetic content","all",null,null,null,null,null);
        var prepared=actions.preview(token,"create_announcement",new Change(null,null,null,null,announcement));
        assertThat(prepared.after().announcement().status()).isEqualTo("draft");
        assertThat(count("hr_announcements")).isZero();
        var created=actions.commit(token,"create_announcement",new AiHrContracts.CommitRequest(prepared.confirmationToken(),UUID.randomUUID().toString()));
        assertThat(created.result().announcement().status()).isEqualTo("draft");
        assertThat(owner.announcements(token.user(),null).totalCount()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hr_announcements WHERE company_id=? AND published_at IS NOT NULL",Long.class,company)).isZero();
        assertThat(owner.announcementAudience(token.user(),null).items()).anyMatch(item->"UNIT".equals(item.referenceType()) && item.id().equals(unit));
        var directed=new AnnouncementChange("Synthetic directed notice","general","Synthetic content","units","draft",null,List.of(unit),null,null);
        var reviewed=actions.preview(token,"create_announcement",new Change(null,null,null,null,directed));
        assertThat(reviewed.after().announcement().audienceSummary()).contains("Synthetic unit");
    }
    @Test void staleEditsRequireNewApprovalAndInactivationPreservesTheEmployee() {
        var create=actions.preview(token,"create_employee",employeeRequest("stale"));
        long id=actions.commit(token,"create_employee",new AiHrContracts.CommitRequest(create.confirmationToken(),UUID.randomUUID().toString())).result().employees().getFirst().userCompanyId();
        var edit=new Change(id,new EmployeeChange(null,null,null,null,"Approved position",null,null,null,null,null,null,null,null,null,null,null),null,null,null);
        var preview=actions.preview(token,"update_employee",edit);
        jdbc.update("UPDATE user_work_profiles SET position='Concurrent position' WHERE company_id=? AND user_company_id=?",company,id);
        var nested=new org.springframework.transaction.support.TransactionTemplate(transactions);
        nested.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(()->nested.execute(status->actions.commit(token,"update_employee",new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString())))).isInstanceOf(HrAssistantService.Changed.class);
        assertThat(owner.employee(token.user(),id).position()).isEqualTo("Concurrent position");
        var inactive=actions.preview(token,"inactivate_employee",new Change(id,null,null,null,null));
        var commit=new AiHrContracts.CommitRequest(inactive.confirmationToken(),UUID.randomUUID().toString());
        assertThat(actions.commit(token,"inactivate_employee",commit).result().employees().getFirst().status()).isEqualTo("inactive");
        assertThat(actions.commit(token,"inactivate_employee",commit).replayed()).isTrue();
        assertThat(count("user_work_profiles")).isEqualTo(1);
        assertThatThrownBy(()->actions.commit(token,"create_employee",commit)).isInstanceOf(AiHrContracts.Conflict.class);
    }
    @Test void recordsUseTheirRealOwnerAndCannotBeReadByAnotherCompany() {
        var create=actions.preview(token,"create_employee",employeeRequest("record"));
        long employee=actions.commit(token,"create_employee",new AiHrContracts.CommitRequest(create.confirmationToken(),UUID.randomUUID().toString())).result().employees().getFirst().userCompanyId();
        var result=records.createRecord(token.user(),Map.of("user_company_id",employee,"record_type","observation","title","Synthetic record","description","Synthetic agreement","event_date","2026-01-01"));
        long id=((Number)result.get("record_id")).longValue();
        assertThat(recordReads.detail(token.user(),id).history()).hasSize(1);
        assertThat(recordReads.list(token.user(),new PageRequest("Synthetic record",null,unit,business,1,1)).totalCount()).isEqualTo(1);
        var foreign=new AuthSessionUser(token.user().userId(),company+100000,token.user().userCompanyId(),"Other company","root");
        assertThatThrownBy(()->recordReads.detail(foreign,id)).isInstanceOf(java.util.NoSuchElementException.class);
    }
    @Test void employeeCountryIsExplicitAndUsesTheExistingPayrollCurrencyRules() {
        var person=employeeRequest("mexico").employee();
        var mexico=new EmployeeChange(person.firstName(),person.lastName(),person.email(),person.phone(),person.position(),person.department(),person.unitId(),person.businessId(),person.hireDate(),person.salary(),person.payPeriod(),person.salaryType(),person.hourlyRate(),person.contractType(),person.contractStartDate(),person.contractEndDate(),"MX");
        var prepared=actions.preview(token,"create_employee",new Change(null,mexico,null,null,null));
        assertThat(prepared.after().employees().getFirst().salaryCurrency()).isEqualTo("MXN");
        var withoutCountry=new EmployeeChange(person.firstName(),person.lastName(),person.email(),null,person.position(),person.department(),unit,business,null,person.salary(),"weekly","daily",null,"permanent",null,null);
        assertThatThrownBy(()->actions.preview(token,"create_employee",new Change(null,withoutCountry,null,null,null))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("registrationCountry");
        assertThat(count("user_work_profiles")).isZero();
    }
    @Test void capacityChangeRejectsTheWholeImportAndRollsBackConfirmationConsumption() {
        jdbc.update("INSERT INTO company_seat_states(company_id,included_seats,purchased_extra_seats) VALUES(?,3,0)",company);
        var request=new Change(null,null,List.of(employeeRequest("capacity1").employee(),employeeRequest("capacity2").employee()),null,null);
        var prepared=actions.preview(token,"import_employees",request);
        String email=UUID.randomUUID()+"@example.test";
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES(?,'test','Synthetic competing employee')",email);
        long user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,email);
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'user','active')",user,company);
        var commit=new AiHrContracts.CommitRequest(prepared.confirmationToken(),UUID.randomUUID().toString());
        var nested=new org.springframework.transaction.support.TransactionTemplate(transactions);
        nested.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(()->nested.execute(status->actions.commit(token,"import_employees",commit))).isInstanceOf(com.indice.erp.billing.seats.SeatCapacityExceededException.class);
        assertThat(count("user_work_profiles")).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_confirmations WHERE company_id=? AND consumed_at IS NOT NULL",Long.class,company)).isZero();
        jdbc.update("UPDATE company_seat_states SET included_seats=4 WHERE company_id=?",company);
        assertThat(actions.commit(token,"import_employees",commit).result().employees()).hasSize(2);
        assertThat(count("user_work_profiles")).isEqualTo(2);
    }
    private Change employeeRequest(String marker) {
        return new Change(null,new EmployeeChange("Synthetic",marker,marker+UUID.randomUUID()+"@example.test",null,"Operator","Operations",unit,business,null,new BigDecimal("150"),"weekly","daily",null,"permanent",null,null,"CA"),null,null,null);
    }
    private long count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Long.class,company); }
}
