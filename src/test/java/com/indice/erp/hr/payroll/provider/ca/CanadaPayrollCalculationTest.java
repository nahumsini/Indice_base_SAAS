package com.indice.erp.hr.payroll.provider.ca;

import static com.indice.erp.hr.payroll.provider.ca.CanadaPayrollFixture.*;
import static org.junit.jupiter.api.Assertions.*;
import com.indice.erp.hr.payroll.engine.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** Uses the migrated official tables, never the functional database. */
@SpringBootTest
class CanadaPayrollCalculationTest {
    @Autowired PayrollRuleResolver rules;
    @Autowired PayrollCalculationEngine engine;
    @Autowired CanadaPayrollProvider provider;
    void amount(String expected,BigDecimal actual){assertEquals(0,d(expected).compareTo(actual.setScale(2,java.math.RoundingMode.HALF_UP)),()->"Expected "+expected+", got "+actual);}
    BigDecimal item(List<PayrollCalculatedLineItem> items,String code){return items.stream().filter(i->i.code().equals(code)).map(PayrollCalculatedLineItem::amount).findFirst().orElse(BigDecimal.ZERO);}

    @Test void craAppendixOneScenarioOnePeriod18MatchesPublishedCppCpp2AndEnhancedDeduction() {
        var p=patch(profile("ON"),Map.of("payPeriodsPerYear",24));
        var c=CanadaContributions.calculate(context(p,"4200",LocalDate.of(2026,9,30),Map.of("CPP",d("4100.74")),d("71400")),p,d("4200"));
        amount("129.71",c.pension()); amount("40",c.pension2()); amount("61.80",c.enhancedDeduction());
    }
    @Test void craAppendixOneScenarioOnePeriod21And22RespectSecondCeilingAndPreserveCredits() {
        var p=patch(profile("ON"),Map.of("payPeriodsPerYear",24));
        var end=LocalDate.of(2026,11,15);
        var a=CanadaContributions.calculate(context(p,"4200",end,Map.of("CPP",d("4230.45"),"CPP2",d("376"),"EI",d("1123.07")),d("84000")),p,d("4200"));
        amount("0",a.pension());amount("40",a.pension2());amount("40",a.enhancedDeduction());amount("0",a.ei());amount("4642.52",a.annualCreditBase());
        var b=CanadaContributions.calculate(context(p,"4200",end,Map.of("CPP",d("4230.45"),"CPP2",d("416"),"EI",d("1123.07")),d("88200")),p,d("4200"));
        amount("0",b.pension2());amount("0",b.enhancedDeduction());amount("4642.52",b.annualCreditBase());
    }
    @Test void insuranceCapsUseActualWithheldAmountsInsteadOfPretendingAllGrossWasInsurable() {
        var p=profile("ON");
        var c=CanadaContributions.calculate(context(p,"1000",LocalDate.of(2026,10,24),Map.of("EI",d("1120")),d("100000")),p,d("1000"));
        amount("3.07",c.ei());amount("4.30",c.employerEi());
        var hired=CanadaContributions.calculate(context(p,"1800"),p,d("1800"));
        amount("99.09",hired.pension());amount("29.34",hired.ei());amount("1665.39",hired.pensionBase());
    }
    @Test void quebecUsesSeparatePlansAndIndependentEmployerRounding() {
        var p=profile("QC");var c=CanadaContributions.calculate(context(p,"1000"),p,d("1000"));
        amount("54.52",c.pension());amount("13",c.ei());amount("4.30",c.qpip());amount("6.02",c.employerQpip());
        var opening=new CanadaPayrollProfile.OpeningBalances(LocalDate.of(2026,10,1),d("102999"),d("0"),d("4479.30"),d("0"),d("416"),d("895.70"),d("442.80"),d("620"));
        p=patch(p,Map.of("openingBalances",opening));c=CanadaContributions.calculate(context(p,"1000"),p,d("1000"));
        amount("0.10",c.qpip());amount("0.06",c.employerQpip());amount("0",c.pension());amount("0",c.ei());
    }
    @Test void quebecPublishedAppendixOneExampleWithoutLabourFundCredits() {
        // TP-1015.F-V 2026 appendix 1: $444.51 with $975 annual fund credit; without it, $482.01.
        var p=patch(profile("QC"),Map.of("registeredPlanDeduction",d("200"),"provincialClaimMode","DECLARED","provincialClaimAmount",d("21830")));
        var c=CanadaContributions.calculate(context(p,"4000"),p,d("4000"));amount("38.65",c.enhancedDeduction());
        var tax=CanadaIncomeTax.calculate(rules,p,d("4000"),c,LocalDate.of(2026,1,15));
        amount("482.01",tax.provincial());
    }
    @ParameterizedTest @ValueSource(strings={"AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"})
    void allThirteenJurisdictionsHaveReviewedTablesAndNoApprovalIssueForOrdinaryCadSalary(String province) {
        var p=profile(province);var c=context(p,"3000");
        assertEquals(List.of(),provider.approvalIssues(c,d("3000")));
        var items=provider.calculateLine(c,d("3000"));
        assertTrue(item(items,"CAN_FED_TAX").signum()>0);assertTrue(item(items,province.equals("QC")?"QC_PROV_TAX":"CAN_PROV_TAX").signum()>0);
        assertTrue(item(items,province.equals("QC")?"QPP":"CPP").signum()>0);
        assertEquals(0,item(items,province.equals("QC")?"CPP":"QPP").signum());
    }
    @Test void julyChangesUsePaymentDateNotWorkPeriodDate() {
        for(var province:List.of("BC","NL","PE")) {
            var p=profile(province);var june=LocalDate.of(2026,6,30);
            var before=provider.calculateLine(context(p,"10000",june,Map.of(),d("0")),d("10000"));
            p=patch(p,Map.of("paymentLagDays",1));
            var after=provider.calculateLine(context(p,"10000",june,Map.of(),d("0")),d("10000"));
            assertNotEquals(item(before,"CAN_PROV_TAX"),item(after,"CAN_PROV_TAX"),province);
            assertTrue(after.stream().filter(i->i.code().equals("CAN_PROV_TAX")).allMatch(i->i.calculationFormula().contains("2026-07-01")));
        }
    }
    @Test void td1ClaimsAdditionalWithholdingAndOntarioHealthAreIndependent() {
        var p=profile("ON");var c=CanadaContributions.calculate(context(p,"3000"),p,d("3000"));var date=LocalDate.of(2026,10,24);
        var basic=CanadaIncomeTax.calculate(rules,p,d("3000"),c,date);
        p=patch(p,Map.of("federalClaimMode","NONE"));var none=CanadaIncomeTax.calculate(rules,p,d("3000"),c,date);
        assertTrue(none.federal().compareTo(basic.federal())>0);
        p=patch(p,Map.of("additionalTax",d("25")));var extra=CanadaIncomeTax.calculate(rules,p,d("3000"),c,date);
        amount("25",extra.federal().subtract(none.federal()));
        p=patch(p,Map.of("federalClaimMode","EXEMPT","provincialClaimMode","EXEMPT","additionalTax",d("0")));
        var exempt=CanadaIncomeTax.calculate(rules,p,d("3000"),c,date);
        amount("0",exempt.federal());amount("28.85",exempt.provincial());
    }
    @Test void missingProfileOrUnreviewedYearCannotPassAsCompliantAndOperationalPayStaysUntaxed() {
        var base=context(profile("ON"),"1800");
        var missing=new PayrollCalculationContext(base.companyId(),base.employeeId(),base.userCompanyId(),base.runId(),"CA","","CAD",BigDecimal.ONE,base.payrollFrequency(),base.periodStartDate(),base.periodEndDate(),true,base.salary(),base.attendance(),base.preferences(),List.of(),base.currencySnapshot());
        var result=engine.calculateLine(missing);assertFalse(result.statutoryCompliance());assertEquals("CA_REVIEW_REQUIRED",result.calculationSource());
        var future=patch(profile("ON"),Map.of("paymentLagDays",31));
        assertFalse(provider.approvalIssues(context(future,"1800",LocalDate.of(2026,12,31),Map.of(),d("0")),d("1800")).isEmpty());
        var op=new PayrollCalculationContext(base.companyId(),base.employeeId(),base.userCompanyId(),base.runId(),"CA","ON","CAD",BigDecimal.ONE,base.payrollFrequency(),base.periodStartDate(),base.periodEndDate(),false,base.salary(),base.attendance(),base.preferences(),List.of(),base.currencySnapshot(),base.countryProfile(),base.fiscalAccumulator());
        result=engine.calculateLine(op);amount("1800",result.netAmount());assertTrue(result.items().stream().noneMatch(i->Set.of("CPP","QPP","CAN_FED_TAX","EI").contains(i.code())));
    }
    @Test void ontarioOrdinaryBiweeklyGoldenIncludesEnhancedPensionDeductionAndCredits() {
        var p=profile("ON"); var items=provider.calculateLine(context(p,"1800"),d("1800"));
        amount("137.35",item(items,"CAN_FED_TAX")); amount("76.49",item(items,"CAN_PROV_TAX"));
        amount("99.09",item(items,"CPP"));amount("29.34",item(items,"EI"));
        amount("41.08",item(items,"EMPLOYER_EI"));amount("72",item(items,"EMPLOYER_VACATION_ACCRUAL"));
        var result=engine.calculateLine(context(p,"1800"));
        amount("1457.73",result.netAmount());assertTrue(result.statutoryCompliance());
    }

    @Test void rejectsInvalidProfilesAndFlagsTransfersAndUnsupportedExtras() {
        assertThrows(IllegalArgumentException.class,()->patch(profile("ON"),Map.of("provinceOfEmployment","XX")).validate());
        assertThrows(IllegalArgumentException.class,()->patch(profile("ON"),Map.of("additionalQuebecTax",d("1"))).validate());
        assertThrows(IllegalArgumentException.class,()->patch(profile("ON"),Map.of("employerEiMultiplier",d("0.9"))).validate());
        var p=profile("QC");assertTrue(provider.approvalIssues(context(p,"3000",LocalDate.of(2026,10,24),Map.of("CPP",d("100")),d("0")),d("3000")).stream().anyMatch(s->s.contains("traslado")));
        assertTrue(provider.approvalIssues(context(profile("ON"),"3000",LocalDate.of(2026,10,24),Map.of("QPIP",d("100")),d("0")),d("3000")).stream().anyMatch(s->s.contains("traslado")));
    }

    @Test void decemberWorkPaidInJanuaryUsesNewYearProfileAndOpeningDate() {
        var p=patch(profile("ON"),Map.of("effectiveFrom","2025-12-01","paymentLagDays",7));
        assertDoesNotThrow(p::validate);
        var context=context(p,"1800",LocalDate.of(2025,12,31),Map.of(),d("0"));
        assertTrue(provider.approvalIssues(context,d("1800")).isEmpty());
        amount("1457.73",engine.calculateLine(context).netAmount());
        assertThrows(IllegalArgumentException.class,()->patch(p,Map.of("effectiveFrom","2025-11-30")).validate());
    }
}
