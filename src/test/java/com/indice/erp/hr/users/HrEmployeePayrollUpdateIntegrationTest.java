package com.indice.erp.hr.users;

import static org.junit.jupiter.api.Assertions.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfile;
import com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/** No enclosing test transaction: assertions observe actual commits/rollbacks in the isolated DB. */
@SpringBootTest
class HrEmployeePayrollUpdateIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired HrEmployeePayrollUpdateService updates;
    @Autowired MexicoPayrollProfileService profiles;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    private long company, employee, unit, business;
    private AuthSessionUser actor;
    private String email;

    @BeforeEach void setup() {
        var name = "Embedded fiscal fixture " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, name);
        email = UUID.randomUUID() + "@example.invalid";
        jdbc.update("INSERT INTO users (email,password_hash,full_name) VALUES (?,'unused-synthetic','Synthetic employee')", email);
        long user = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, email);
        jdbc.update("INSERT INTO user_companies (company_id,user_id,role,status,visibility) VALUES (?,?,'root','active','all')", company,user);
        employee = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?", Long.class,company,user);
        jdbc.update("INSERT INTO units (company_id,name,status) VALUES (?,'Fixture unit','active')",company);
        unit = jdbc.queryForObject("SELECT id FROM units WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO businesses (company_id,unit_id,name,status,created_by,updated_by) VALUES (?,?,'Fixture business','active',?,?)",company,unit,user,user);
        business = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?",Long.class,company);
        jdbc.update("""
            INSERT INTO user_work_profiles (company_id,user_company_id,user_id,salary,pay_period,salary_type,
              workday_hours,workdays_per_week,payroll_treatment,registration_country,status,unit_id,business_id)
            VALUES (?,?,?,6000,'weekly','daily',8,6,'fiscal_payroll','MX','active',?,?)
            """,company,employee,user,unit,business);
        actor = new AuthSessionUser(user,company,"Synthetic reviewer","root");
    }

    private MexicoPayrollProfile profile() {
        return new MexicoPayrollProfile(LocalDate.of(2026,10,1),new BigDecimal("857.14"),new BigDecimal("900"),
            MexicoPayrollProfile.SalaryBasis.FIXED,MexicoPayrollProfile.MinimumWageZone.GENERAL,
            "A1234567890",new BigDecimal("0.5"),"NLE",new BigDecimal("3"),"Synthetic documented rate",
            new MexicoPayrollProfile.InfonavitCredit(false,"","",null,null,null,null,null,false));
    }
    private Map<String,Object> payload() {
        var result = new LinkedHashMap<String,Object>();
        result.putAll(Map.of("first_name","Synthetic","last_name","Employee","email",email,"unit_id",unit,
            "business_id",business,"department","Fixture","position","Fixture","salary","6500","salary_type","daily","pay_period","weekly"));
        result.put("registration_country","MX"); result.put("payroll_treatment","fiscal_payroll");
        result.put("mexicoPayrollProfile",new MexicoPayrollProfileService.SaveRequest(0,UUID.randomUUID(),profile()));
        return result;
    }
    private BigDecimal salary() { return jdbc.queryForObject("SELECT salary FROM user_work_profiles WHERE company_id=? AND user_company_id=?",BigDecimal.class,company,employee); }
    private void unchanged() { assertEquals(new BigDecimal("6000.00"),salary()); assertEquals(0,profiles.get(actor,employee).revision()); }

    @Test void savesEmployeeAndFiscalProfileTogetherAndRetriesWithoutDuplicatingVersion() {
        var request = payload();
        updates.update(actor,employee,request);
        assertEquals(new BigDecimal("6500.00"),salary());
        assertEquals(1,profiles.get(actor,employee).revision());
        updates.update(actor,employee,request);
        assertEquals(1,profiles.get(actor,employee).history().size());
    }
    @Test void invalidFiscalInputsDoNotSaveEmployee() {
        var request=payload(); request.put("mexicoPayrollProfile",Map.of("expectedRevision",0,"requestId",UUID.randomUUID(),"profile",Map.of()));
        assertThrows(IllegalArgumentException.class,()->updates.update(actor,employee,request)); unchanged();
    }
    @Test void staleRevisionRollsBackEmployeeUpdate() {
        profiles.save(actor,employee,new MexicoPayrollProfileService.SaveRequest(0,UUID.randomUUID(),profile()));
        assertThrows(MexicoPayrollProfileService.ProfileConflictException.class,()->updates.update(actor,employee,payload()));
        assertEquals(new BigDecimal("6000.00"),salary()); assertEquals(1,profiles.get(actor,employee).revision());
    }
    @Test void revisionCheckSeesACommitNewerThanTheEmployeeEditSnapshot() {
        var outer=new org.springframework.transaction.support.TransactionTemplate(transactions);
        var concurrent=new org.springframework.transaction.support.TransactionTemplate(transactions);
        concurrent.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        assertThrows(MexicoPayrollProfileService.ProfileConflictException.class,()->outer.execute(status->{
            assertEquals(0,profiles.get(actor,employee).revision());
            concurrent.execute(other->profiles.save(actor,employee,new MexicoPayrollProfileService.SaveRequest(0,UUID.randomUUID(),profile())));
            return updates.update(actor,employee,payload());
        }));
        assertEquals(new BigDecimal("6000.00"),salary()); assertEquals(1,profiles.get(actor,employee).revision());
    }
    @Test void exactRetryFindsTheRequestCommittedAfterTheOriginalSnapshot() {
        var request=payload(); var fiscal=(MexicoPayrollProfileService.SaveRequest)request.get("mexicoPayrollProfile");
        var outer=new org.springframework.transaction.support.TransactionTemplate(transactions);
        var concurrent=new org.springframework.transaction.support.TransactionTemplate(transactions);
        concurrent.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        outer.execute(status->{
            assertEquals(0,profiles.get(actor,employee).revision());
            concurrent.execute(other->profiles.save(actor,employee,fiscal));
            updates.update(actor,employee,request);
            assertEquals(1,profiles.save(actor,employee,fiscal).revision());
            return null;
        });
        assertEquals(new BigDecimal("6500.00"),salary()); assertEquals(1,profiles.get(actor,employee).history().size());
    }
    @Test void wrongTreatmentOrCountryRollsBackEmployeeAndDoesNotCreateFiscalVersion() {
        for (var change : java.util.List.of(Map.of("payroll_treatment","operational_payroll"),Map.of("registration_country","CA"))) {
            var request=payload(); request.putAll(change);
            assertThrows(IllegalArgumentException.class,()->updates.update(actor,employee,request)); unchanged();
            assertEquals("fiscal_payroll",jdbc.queryForObject("SELECT payroll_treatment FROM user_work_profiles WHERE user_company_id=?",String.class,employee));
            assertEquals("MX",jdbc.queryForObject("SELECT registration_country FROM user_work_profiles WHERE user_company_id=?",String.class,employee));
        }
    }
    @Test void ordinaryOperationalEditDoesNotCreateOrEraseFiscalProfile() {
        profiles.save(actor,employee,new MexicoPayrollProfileService.SaveRequest(0,UUID.randomUUID(),profile()));
        var request=payload(); request.remove("mexicoPayrollProfile"); request.put("payroll_treatment","operational_payroll");
        updates.update(actor,employee,request);
        assertEquals(new BigDecimal("6500.00"),salary()); assertEquals(1,profiles.get(actor,employee).revision());
    }
    @Test void otherCompanyAndUnprivilegedActorCannotUpdateEitherRecord() {
        var name="Other fixture "+UUID.randomUUID(); jdbc.update("INSERT INTO companies (name) VALUES (?)",name);
        long other=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,name);
        assertThrows(NoSuchElementException.class,()->updates.update(new AuthSessionUser(actor.userId(),other,"Other","root"),employee,payload()));
        assertThrows(HrAccessDeniedException.class,()->updates.update(new AuthSessionUser(actor.userId(),company,"Manager","manager"),employee,payload()));
        unchanged();
    }
    @Test void collaboratorAndPayrollTabAccessDoesNotGrantFiscalConfiguration() {
        jdbc.update("INSERT INTO user_company_module_roles (user_company_id,module_slug,role,skill_level) VALUES (?,'human_resources','manager',1)",employee);
        for(var tab:java.util.List.of("collaborators","payroll"))
            jdbc.update("INSERT INTO user_company_tab_permissions (user_company_id,module_slug,tab_key,can_view) VALUES (?,'human_resources',?,1)",employee,tab);
        var manager=new AuthSessionUser(actor.userId(),company,"Manager","manager");
        assertFalse(profiles.get(manager,employee).canConfigure());
        assertThrows(HrAccessDeniedException.class,()->updates.update(manager,employee,payload())); unchanged();
    }
}
