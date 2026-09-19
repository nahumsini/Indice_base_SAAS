package com.indice.erp.hr.payroll.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.indice.erp.hr.payroll.provider.br.BrazilPayrollProvider;
import com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProvider;
import com.indice.erp.hr.payroll.provider.co.ColombiaPayrollProvider;
import com.indice.erp.hr.payroll.provider.generic.GenericPayrollProvider;
import com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProvider;
import com.indice.erp.hr.payroll.provider.us.UnitedStatesPayrollProvider;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class PayrollCalculationEngineProviderTest {

    @Test
    void supportedCountriesProduceCompliantProviderResults() {
        var resolver = new FakePayrollRuleResolver();
        var engine = engine(resolver);

        assertProviderResult(engine.calculateLine(context("MX", "MX", "MXN", "semimonthly", "10000.00")), "payroll_calculation_engine:mx", "IMSS_EMP");
        assertProviderResult(engine.calculateLine(context("CA", "ON", "CAD", "biweekly", "1800.00")), "payroll_calculation_engine:ca", "CPP");
        assertProviderResult(engine.calculateLine(context("US", "CA", "USD", "biweekly", "1000.00")), "payroll_calculation_engine:us", "US_SS_EMP");
        assertProviderResult(engine.calculateLine(context("BR", "BR", "BRL", "semimonthly", "5000.00")), "payroll_calculation_engine:br", "BR_INSS_EMP");
        assertProviderResult(
            engine.calculateLine(context(
                "CO",
                "CO",
                "COP",
                "semimonthly",
                "4000000.00",
                colombiaProfile(false, BigDecimal.ONE, true, false, false, true, "procedure_1", BigDecimal.ZERO)
            )),
            "payroll_calculation_engine:co",
            "CO_EPS_EMPLOYEE"
        );
    }

    @Test
    void unsupportedCountryUsesGenericProviderWithExplicitWarning() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("AR", "AR", "ARS", "semimonthly", "2500.00")
        );

        assertEquals("GENERIC_UNSUPPORTED_COUNTRY", result.calculationSource());
        assertFalse(result.statutoryCompliance());
        assertFalse(result.calculationWarnings().isEmpty());
        assertTrue(result.items().stream().anyMatch((item) -> item.code().startsWith("GENERIC_")));
    }

    @Test
    void operationalPayrollSkipsFiscalProviderAndFiscalMetadata() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context(
                "MX",
                "MX",
                "MXN",
                "semimonthly",
                "10000.00",
                PayrollCalculationContext.CountryPayrollProfile.empty("MX"),
                null,
                List.of(new PayrollCalculationContext.ManualAdjustment(
                    "MANUAL_BONUS",
                    "earning",
                    "Bono operativo",
                    new BigDecimal("500.00"),
                    "manual_taxable",
                    true,
                    true,
                    false,
                    "Manual earning",
                    "MXN"
                )),
                false
            )
        );

        assertEquals("OPERATIONAL_NON_FISCAL", result.calculationSource());
        assertFalse(result.statutoryCompliance());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.taxableBase()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.employerContributionsAmount()));
        assertTrue(result.items().stream().noneMatch((item) -> "ISR".equals(item.code()) || "IMSS_EMP".equals(item.code())));
        assertTrue(result.items().stream().noneMatch(PayrollCalculatedLineItem::taxable));
        assertTrue(result.items().stream().noneMatch(PayrollCalculatedLineItem::affectsSocialSecurity));
        assertTrue(result.items().stream().allMatch((item) -> !"taxable_compensation".equals(item.taxTreatment())));
    }

    @Test
    void mexicoGoldenSemimonthlySalaryCalculatesIsrImssAndEmployerCost() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("MX", "MX", "MXN", "semimonthly", "10000.00")
        );

        assertTotals(result, "10000.00", "1204.49", "2632.68", "8795.51", "12632.68");
        assertLineAmount(result, "ISR", "1000.00");
        assertLineAmount(result, "IMSS_EMP", "204.49");
        assertLineBase(result, "IMSS_EMP", "10493.15");
        assertLineAmount(result, "EMPLOYER_IMSS", "599.95");
        assertLineAmount(result, "EMPLOYER_RCV", "788.35");
        assertLineAmount(result, "EMPLOYER_ISN", "300.00");
    }

    @Test
    void manualEarningAdjustmentIncreasesGrossTaxableBaseAndSnapshotInputs() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context(
                "MX",
                "MX",
                "MXN",
                "semimonthly",
                "10000.00",
                PayrollCalculationContext.CountryPayrollProfile.empty("MX"),
                null,
                List.of(new PayrollCalculationContext.ManualAdjustment(
                    "MANUAL_BONUS",
                    "earning",
                    "Bono manual gravable",
                    new BigDecimal("500.00"),
                    "manual_taxable",
                    true,
                    true,
                    false,
                    "Manual taxable earning",
                    "MXN"
                ))
            )
        );

        var manualBonus = lineItem(result, "MANUAL_BONUS");
        assertEquals("manual", manualBonus.sourceType());
        assertEquals("earning", manualBonus.category());
        assertEquals(0, new BigDecimal("10500.00").compareTo(result.grossAmount()));
        assertEquals(0, new BigDecimal("10500.00").compareTo(result.taxableBase()));
        assertLineAmount(result, "MANUAL_BONUS", "500.00");
        assertLineAmount(result, "ISR", "1050.00");
        assertTrue(String.valueOf(result.calculationInputs().get("manualAdjustments")).contains("MANUAL_BONUS"));
    }

    @Test
    void manualDeductionReducesNetWithoutChangingTaxableBase() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context(
                "MX",
                "MX",
                "MXN",
                "semimonthly",
                "10000.00",
                PayrollCalculationContext.CountryPayrollProfile.empty("MX"),
                null,
                List.of(new PayrollCalculationContext.ManualAdjustment(
                    "MANUAL_LOAN",
                    "deduction",
                    "Descuento manual",
                    new BigDecimal("250.00"),
                    "manual_non_taxable",
                    false,
                    false,
                    false,
                    "Manual deduction",
                    "MXN"
                ))
            )
        );

        var manualDeduction = lineItem(result, "MANUAL_LOAN");
        assertEquals("manual", manualDeduction.sourceType());
        assertEquals("deduction", manualDeduction.category());
        assertEquals(0, new BigDecimal("10000.00").compareTo(result.grossAmount()));
        assertEquals(0, new BigDecimal("10000.00").compareTo(result.taxableBase()));
        assertEquals(0, new BigDecimal("1454.49").compareTo(result.deductionsAmount()));
        assertEquals(0, new BigDecimal("8545.51").compareTo(result.netAmount()));
        assertLineAmount(result, "MANUAL_LOAN", "250.00");
    }

    @Test
    void automaticAbsenceDeductionCannotMakeFixedSalaryNetNegative() {
        var baseContext = context("MX", "MX", "MXN", "semimonthly", "3000.00");
        var attendance = new PayrollCalculationContext.PayrollAttendanceInput(
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            new BigDecimal("6"),
            new BigDecimal("2"),
            BigDecimal.ZERO,
            new BigDecimal("4"),
            new BigDecimal("2"),
            0,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            List.of(),
            List.of()
        );
        var result = engine(new FakePayrollRuleResolver()).calculateLine(withAttendance(baseContext, attendance));

        assertTotals(result, "3000.00", "3000.00", "0.00", "0.00", "3000.00");
        assertLineAmount(result, "ABSENCE_DEDUCTION", "3000.00");
        assertTrue(result.calculationWarnings().stream().anyMatch((warning) -> warning.contains("neto negativo")));
    }

    @Test
    void manualEmployerContributionIncreasesEmployerCostOnly() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context(
                "MX",
                "MX",
                "MXN",
                "semimonthly",
                "10000.00",
                PayrollCalculationContext.CountryPayrollProfile.empty("MX"),
                null,
                List.of(new PayrollCalculationContext.ManualAdjustment(
                    "MANUAL_EMPLOYER_COST",
                    "employer_contribution",
                    "Costo patronal manual",
                    new BigDecimal("750.00"),
                    "manual_employer_cost",
                    false,
                    false,
                    true,
                    "Manual employer cost",
                    "MXN"
                ))
            )
        );

        var manualEmployerCost = lineItem(result, "MANUAL_EMPLOYER_COST");
        assertEquals("manual", manualEmployerCost.sourceType());
        assertEquals("employer_contribution", manualEmployerCost.category());
        assertEquals(0, new BigDecimal("10000.00").compareTo(result.grossAmount()));
        assertEquals(0, new BigDecimal("1204.49").compareTo(result.deductionsAmount()));
        assertEquals(0, new BigDecimal("8795.51").compareTo(result.netAmount()));
        assertEquals(0, new BigDecimal("3382.68").compareTo(result.employerContributionsAmount()));
        assertEquals(0, new BigDecimal("13382.68").compareTo(result.totalPayrollCost()));
        assertLineAmount(result, "MANUAL_EMPLOYER_COST", "750.00");
    }

    @Test
    void canadaGoldenOntarioBiweeklySalaryCalculatesCppEiTaxAndVacationAccrual() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CA", "ON", "CAD", "biweekly", "1800.00")
        );

        assertTotals(result, "1800.00", "398.43", "212.17", "1401.57", "2012.17");
        assertLineAmount(result, "CAN_FED_TAX", "180.00");
        assertLineAmount(result, "CAN_PROV_TAX", "90.00");
        assertLineAmount(result, "CPP", "99.09");
        assertLineBase(result, "CPP", "1665.38");
        assertLineAmount(result, "EI", "29.34");
        assertLineAmount(result, "EMPLOYER_EI", "41.08");
        assertLineAmount(result, "EMPLOYER_VACATION_ACCRUAL", "72.00");
    }

    @Test
    void unitedStatesGoldenCaliforniaBiweeklySalaryCalculatesFicaFutaAndSdi() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("US", "CA", "USD", "biweekly", "1000.00")
        );

        assertTotals(result, "1000.00", "189.50", "82.50", "810.50", "1082.50");
        assertLineAmount(result, "US_FED_TAX", "100.00");
        assertLineAmount(result, "US_SS_EMP", "62.00");
        assertLineBase(result, "US_SS_EMP", "1000.00");
        assertLineAmount(result, "US_MEDICARE_EMP", "14.50");
        assertLineAmount(result, "US_CA_SDI", "13.00");
        assertLineAmount(result, "EMPLOYER_US_SS", "62.00");
        assertLineAmount(result, "EMPLOYER_FUTA", "6.00");
    }

    @Test
    void brazilGoldenSemimonthlySalaryCalculatesInssIrrfFgtsAndLaborProvisions() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("BR", "BR", "BRL", "semimonthly", "5000.00")
        );

        assertTotals(result, "5000.00", "718.15", "2922.23", "4281.85", "7922.23");
        assertLineAmount(result, "BR_INSS_EMP", "494.05");
        assertLineAmount(result, "BR_IRRF", "224.10");
        assertLineAmount(result, "EMPLOYER_BR_INSS", "1000.00");
        assertLineAmount(result, "EMPLOYER_FGTS", "400.00");
        assertLineAmount(result, "EMPLOYER_RAT", "100.00");
        assertLineAmount(result, "EMPLOYER_BR_13TH_SALARY_PROVISION", "416.67");
        assertLineAmount(result, "EMPLOYER_BR_FGTS_FINE_PROVISION", "160.00");
    }

    @Test
    void colombiaGoldenSemimonthlySalaryCalculatesIbcExonerationWithholdingAndProvisions() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "4000000.00")
        );

        assertTotals(result, "4000000.00", "423174.65", "1534213.32", "3576825.35", "5534213.32");
        assertLineAmount(result, "CO_EPS_EMPLOYEE", "160000.00");
        assertLineAmount(result, "CO_AFP_EMPLOYEE", "160000.00");
        assertLineAmount(result, "CO_SOLIDARITY_FUND", "20000.00");
        assertLineAmount(result, "CO_SUBSISTENCE_FUND", "40000.00");
        assertLineAmount(result, "CO_WITHHOLDING_TAX", "43174.65");
        assertLineAmount(result, "CO_AFP_EMPLOYER", "480000.00");
        assertLineAmount(result, "CO_ARL", "20880.00");
        assertLineAmount(result, "CO_CCF", "160000.00");
        assertLineAmount(result, "CO_SEVERANCE_CESANTIAS", "333333.32");
        assertLineAmount(result, "CO_VACATION_PROVISION", "166666.68");
        assertNoLineItem(result, "CO_EPS_EMPLOYER");
        assertNoLineItem(result, "CO_ICBF");
        assertNoLineItem(result, "CO_SENA");
    }

    @Test
    void unitedStatesSocialSecurityUsesCurrentPeriodBaseWhenNoYtdAccumulatorExists() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("US", "CA", "USD", "biweekly", "1000.00")
        );

        var socialSecurity = result.items().stream()
            .filter((item) -> "US_SS_EMP".equals(item.code()))
            .findFirst()
            .orElseThrow();

        assertEquals(0, new BigDecimal("1000.00").compareTo(socialSecurity.calculationBase()));
    }

    @Test
    void unitedStatesSocialSecurityStopsWhenYtdAccumulatorAlreadyReachedWageBase() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context(
                "US",
                "CA",
                "USD",
                "biweekly",
                "1000.00",
                PayrollCalculationContext.CountryPayrollProfile.empty("US"),
                fiscalAccumulator("US", "184500.00")
            )
        );

        assertFalse(result.items().stream().anyMatch((item) -> "US_SS_EMP".equals(item.code())));
        assertFalse(result.items().stream().anyMatch((item) -> "EMPLOYER_US_SS".equals(item.code())));
        assertTrue(result.items().stream().anyMatch((item) -> "US_MEDICARE_EMP".equals(item.code())));
        assertTrue(String.valueOf(result.calculationInputs().get("fiscalAccumulator")).contains("184500.00"));
    }

    @Test
    void canadaEiUsesOnlyRemainingAnnualInsurableEarningsFromYtdAccumulator() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context(
                "CA",
                "ON",
                "CAD",
                "biweekly",
                "1000.00",
                PayrollCalculationContext.CountryPayrollProfile.empty("CA"),
                fiscalAccumulator("CA", "68800.00")
            )
        );

        var ei = result.items().stream()
            .filter((item) -> "EI".equals(item.code()))
            .findFirst()
            .orElseThrow();

        assertEquals(0, new BigDecimal("100.00").compareTo(ei.calculationBase()));
        assertEquals(0, new BigDecimal("1.63").compareTo(ei.amount()));
    }

    @Test
    void colombiaProviderCalculatesIbcSolidarityAndEmployerProvisionsFromRuleSets() {
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "4000000.00")
        );

        var employeeHealth = result.items().stream()
            .filter((item) -> "CO_EPS_EMPLOYEE".equals(item.code()))
            .findFirst()
            .orElseThrow();

        assertEquals("payroll_calculation_engine:co", result.calculationSource());
        assertTrue(result.statutoryCompliance());
        assertEquals(0, new BigDecimal("4000000.00000000").compareTo(employeeHealth.calculationBase()));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_SOLIDARITY_FUND".equals(item.code())));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_SUBSISTENCE_FUND".equals(item.code())));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_WITHHOLDING_TAX".equals(item.code())));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_ARL".equals(item.code())));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_CCF".equals(item.code())));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_SEVERANCE_CESANTIAS".equals(item.code())));
        assertFalse(result.items().stream().anyMatch((item) -> "CO_EPS_EMPLOYER".equals(item.code())));
        assertFalse(result.items().stream().anyMatch((item) -> "CO_ICBF".equals(item.code())));
        assertFalse(result.items().stream().anyMatch((item) -> "CO_SENA".equals(item.code())));
    }

    @Test
    void colombiaProviderUsesProfileForArlClassAndEmployerExemptionOverrides() {
        var profile = colombiaProfile(
            false,
            new BigDecimal("5"),
            false,
            true,
            true,
            true,
            "procedure_1",
            BigDecimal.ZERO
        );
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "2000000.00", profile)
        );

        var arl = result.items().stream()
            .filter((item) -> "CO_ARL".equals(item.code()))
            .findFirst()
            .orElseThrow();

        assertEquals(0, new BigDecimal("0.06960000").compareTo(arl.rateApplied()));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_EPS_EMPLOYER".equals(item.code())));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_ICBF".equals(item.code())));
        assertTrue(result.items().stream().anyMatch((item) -> "CO_SENA".equals(item.code())));
    }

    @Test
    void colombiaIntegralSalaryUsesSeventyPercentIbcAndDisablesCesantiasAndPrima() {
        var profile = colombiaProfile(
            true,
            BigDecimal.ONE,
            null,
            null,
            null,
            null,
            "procedure_1",
            BigDecimal.ZERO
        );
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "20000000.00", profile)
        );

        var employeeHealth = result.items().stream()
            .filter((item) -> "CO_EPS_EMPLOYEE".equals(item.code()))
            .findFirst()
            .orElseThrow();
        var vacationProvision = result.items().stream()
            .filter((item) -> "CO_VACATION_PROVISION".equals(item.code()))
            .findFirst()
            .orElseThrow();

        assertEquals(0, new BigDecimal("14000000.00000000").compareTo(employeeHealth.calculationBase()));
        assertEquals(0, new BigDecimal("14000000.00000000").compareTo(vacationProvision.calculationBase()));
        assertFalse(result.items().stream().anyMatch((item) -> "CO_SEVERANCE_CESANTIAS".equals(item.code())));
        assertFalse(result.items().stream().anyMatch((item) -> "CO_SERVICE_BONUS_PRIMA".equals(item.code())));
        assertTrue(result.calculationWarnings().isEmpty());
    }

    @Test
    void colombiaProcedureTwoWithoutCertifiedRateFallsBackWithWarning() {
        var profile = colombiaProfile(
            false,
            BigDecimal.ONE,
            null,
            null,
            null,
            null,
            "procedure_2",
            BigDecimal.ZERO
        );
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "5000000.00", profile)
        );

        assertTrue(result.items().stream().anyMatch((item) -> "CO_WITHHOLDING_TAX".equals(item.code())));
        assertTrue(result.calculationWarnings().stream().anyMatch((warning) -> warning.contains("procedimiento 2")));
    }

    @Test
    void colombiaInvalidIntegralSalaryProducesWarning() {
        var profile = colombiaProfile(
            true,
            BigDecimal.ONE,
            true,
            false,
            false,
            true,
            "procedure_1",
            BigDecimal.ZERO
        );
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "5000000.00", profile)
        );

        assertTrue(result.calculationWarnings().stream().anyMatch((warning) -> warning.contains("13 SMMLV")));
    }

    @Test
    void colombiaPilaNoveltyCanAdjustIbcAndSnapshotKeepsAuditInputs() {
        var profile = colombiaProfile(
            false,
            BigDecimal.ONE,
            true,
            false,
            false,
            true,
            "procedure_1",
            BigDecimal.ZERO,
            List.of(new PayrollCalculationContext.PayrollNovelty(
                "SLN",
                "Licencia no remunerada",
                LocalDate.parse("2026-06-10"),
                LocalDate.parse("2026-06-12"),
                new BigDecimal("3"),
                BigDecimal.ZERO,
                new BigDecimal("-1000000.00"),
                false,
                true,
                "test",
                Map.of("reason", "unpaid_leave")
            ))
        );
        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "4000000.00", profile)
        );

        var employeeHealth = result.items().stream()
            .filter((item) -> "CO_EPS_EMPLOYEE".equals(item.code()))
            .findFirst()
            .orElseThrow();

        assertEquals(0, new BigDecimal("3000000.00000000").compareTo(employeeHealth.calculationBase()));
        assertTrue(String.valueOf(result.calculationInputs().get("countryProfile")).contains("SLN"));
        assertEquals(new BigDecimal("1750905.00"), result.auditBreakdown().get("smmlv"));
        assertEquals(new BigDecimal("52374.00"), result.auditBreakdown().get("uvt"));
        assertTrue(String.valueOf(result.auditBreakdown().get("withholding")).contains("procedure_1"));
        assertTrue(String.valueOf(result.auditBreakdown().get("exoneration")).contains("automaticUnderTenSmmlv"));
    }

    @Test
    void colombiaTerminationNoveltyProducesSettlementAndIndemnityLineItems() {
        var profile = colombiaProfile(
            false,
            BigDecimal.ONE,
            true,
            false,
            false,
            true,
            "procedure_1",
            BigDecimal.ZERO,
            List.of(new PayrollCalculationContext.PayrollNovelty(
                "RET",
                "Liquidación final",
                LocalDate.parse("2026-06-30"),
                LocalDate.parse("2026-06-30"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                true,
                false,
                "test",
                Map.of(
                    "settlementBase", "4000000.00",
                    "serviceDays", "540",
                    "pendingVacationDays", "7.5",
                    "terminationReason", "without_just_cause",
                    "contractType", "indefinite"
                )
            ))
        );

        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "4000000.00", profile)
        );

        assertLineAmount(result, "CO_TERMINATION_CESANTIAS", "6000000.00");
        assertLineAmount(result, "CO_TERMINATION_CESANTIAS_INTEREST", "1080000.00");
        assertLineAmount(result, "CO_TERMINATION_PRIMA", "6000000.00");
        assertLineAmount(result, "CO_TERMINATION_VACATION_COMPENSATION", "1000000.00");
        assertLineAmount(result, "CO_TERMINATION_INDEMNITY", "5333333.33");
        assertTrue(result.grossAmount().compareTo(new BigDecimal("23000000.00")) > 0);
    }

    @Test
    void colombiaRetroactiveNoveltyIncreasesIbcAndGrossPay() {
        var profile = colombiaProfile(
            false,
            BigDecimal.ONE,
            true,
            false,
            false,
            true,
            "procedure_1",
            BigDecimal.ZERO,
            List.of(new PayrollCalculationContext.PayrollNovelty(
                "RETRO",
                "Retroactivo salarial",
                LocalDate.parse("2026-06-01"),
                LocalDate.parse("2026-06-30"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("1000000.00"),
                true,
                true,
                "test",
                Map.of("amount", "1000000.00")
            ))
        );

        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "4000000.00", profile)
        );

        assertLineAmount(result, "CO_RETROACTIVE_EARNING", "1000000.00");
        var employeeHealth = result.items().stream()
            .filter((item) -> "CO_EPS_EMPLOYEE".equals(item.code()))
            .findFirst()
            .orElseThrow();
        assertEquals(0, new BigDecimal("5000000.00000000").compareTo(employeeHealth.calculationBase()));
        assertEquals(0, new BigDecimal("5000000.00").compareTo(result.grossAmount()));
    }

    @Test
    void colombiaCorrectionDeductionDoesNotIncreaseSocialSecurityBaseByDefault() {
        var profile = colombiaProfile(
            false,
            BigDecimal.ONE,
            true,
            false,
            false,
            true,
            "procedure_1",
            BigDecimal.ZERO,
            List.of(new PayrollCalculationContext.PayrollNovelty(
                "CORR",
                "Corrección descuento",
                LocalDate.parse("2026-06-01"),
                LocalDate.parse("2026-06-30"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                false,
                false,
                "test",
                Map.of("amount", "-250000.00")
            ))
        );

        var result = engine(new FakePayrollRuleResolver()).calculateLine(
            context("CO", "CO", "COP", "semimonthly", "4000000.00", profile)
        );

        assertLineAmount(result, "CO_CORRECTION_DEDUCTION", "250000.00");
        var employeeHealth = result.items().stream()
            .filter((item) -> "CO_EPS_EMPLOYEE".equals(item.code()))
            .findFirst()
            .orElseThrow();
        assertEquals(0, new BigDecimal("4000000.00000000").compareTo(employeeHealth.calculationBase()));
    }

    @Test
    void ruleReferenceSnapshotMaterializesRulesParametersBracketsAndLineItems() {
        var resolver = new FakePayrollRuleResolver();
        var ruleSet = resolver.ruleSet(1001L);
        var item = new PayrollCalculatedLineItem(
            "TEST_TAX",
            "deduction",
            "Test tax",
            new BigDecimal("123.45"),
            "computed_tax",
            10,
            "MX",
            "MX",
            "income_tax",
            true,
            false,
            false,
            false,
            "Impuesto de prueba",
            ruleSet.ruleCode(),
            ruleSet.id(),
            "base * rate",
            new BigDecimal("1234.50"),
            new BigDecimal("0.10000000"),
            "MXN"
        );

        var snapshot = resolver.ruleReferenceSnapshot(List.of(item), LocalDate.parse("2026-06-30"));

        @SuppressWarnings("unchecked")
        var rules = (List<Map<String, Object>>) snapshot.get("rules");
        @SuppressWarnings("unchecked")
        var lineItems = (List<Map<String, Object>>) snapshot.get("lineItems");
        @SuppressWarnings("unchecked")
        var parameters = (List<Map<String, Object>>) rules.getFirst().get("parameters");
        @SuppressWarnings("unchecked")
        var brackets = (List<Map<String, Object>>) rules.getFirst().get("brackets");

        assertEquals("2026-06-30", snapshot.get("effectiveDate"));
        assertEquals("TEST_RULE", rules.getFirst().get("ruleSetCode"));
        assertEquals("official.example", rules.getFirst().get("source"));
        assertEquals("rate", parameters.getFirst().get("name"));
        assertEquals("bracket_1", brackets.getFirst().get("label"));
        assertEquals("TEST_TAX", lineItems.getFirst().get("itemCode"));
        assertEquals(new BigDecimal("123.45"), lineItems.getFirst().get("resultAmount"));
    }

    private PayrollCalculationEngine engine(FakePayrollRuleResolver resolver) {
        return new PayrollCalculationEngine(
            List.of(
                new MexicoPayrollProvider(resolver),
                new CanadaPayrollProvider(resolver),
                new ColombiaPayrollProvider(resolver),
                new UnitedStatesPayrollProvider(resolver),
                new BrazilPayrollProvider(resolver),
                new GenericPayrollProvider()
            ),
            new PayrollManualAdjustmentService(),
            resolver
        );
    }

    private void assertProviderResult(PayrollLineCalculationResult result, String source, String expectedItemCode) {
        assertEquals(source, result.calculationSource());
        assertTrue(result.statutoryCompliance());
        assertTrue(result.calculationWarnings().isEmpty());
        assertTrue(result.grossAmount().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(result.items().stream().anyMatch((item) -> expectedItemCode.equals(item.code())));
        assertEquals(0, result.grossAmount().add(result.employerContributionsAmount()).compareTo(result.totalPayrollCost()));
    }

    private void assertLineAmount(PayrollLineCalculationResult result, String code, String expectedAmount) {
        var item = lineItem(result, code);
        assertEquals(0, new BigDecimal(expectedAmount).compareTo(item.amount()));
    }

    private void assertLineBase(PayrollLineCalculationResult result, String code, String expectedBase) {
        var item = lineItem(result, code);
        assertEquals(0, new BigDecimal(expectedBase).compareTo(item.calculationBase().setScale(2, java.math.RoundingMode.HALF_UP)));
    }

    private PayrollCalculatedLineItem lineItem(PayrollLineCalculationResult result, String code) {
        return result.items().stream()
            .filter((item) -> code.equals(item.code()))
            .findFirst()
            .orElseThrow();
    }

    private void assertNoLineItem(PayrollLineCalculationResult result, String code) {
        assertFalse(result.items().stream().anyMatch((lineItem) -> code.equals(lineItem.code())));
    }

    private void assertTotals(
        PayrollLineCalculationResult result,
        String gross,
        String deductions,
        String employerContributions,
        String net,
        String totalCost
    ) {
        assertEquals(0, new BigDecimal(gross).compareTo(result.grossAmount()));
        assertEquals(0, new BigDecimal(deductions).compareTo(result.deductionsAmount()));
        assertEquals(0, new BigDecimal(employerContributions).compareTo(result.employerContributionsAmount()));
        assertEquals(0, new BigDecimal(net).compareTo(result.netAmount()));
        assertEquals(0, new BigDecimal(totalCost).compareTo(result.totalPayrollCost()));
    }

    private PayrollCalculationContext context(
        String country,
        String jurisdiction,
        String currency,
        String frequency,
        String baseSalary
    ) {
        return context(
            country,
            jurisdiction,
            currency,
            frequency,
            baseSalary,
            PayrollCalculationContext.CountryPayrollProfile.empty(country)
        );
    }

    private PayrollCalculationContext context(
        String country,
        String jurisdiction,
        String currency,
        String frequency,
        String baseSalary,
        PayrollCalculationContext.CountryPayrollProfile countryProfile
    ) {
        return context(
            country,
            jurisdiction,
            currency,
            frequency,
            baseSalary,
            countryProfile,
            null,
            List.of()
        );
    }

    private PayrollCalculationContext context(
        String country,
        String jurisdiction,
        String currency,
        String frequency,
        String baseSalary,
        PayrollCalculationContext.CountryPayrollProfile countryProfile,
        PayrollCalculationContext.FiscalAccumulatorSnapshot fiscalAccumulator
    ) {
        return context(country, jurisdiction, currency, frequency, baseSalary, countryProfile, fiscalAccumulator, List.of());
    }

    private PayrollCalculationContext context(
        String country,
        String jurisdiction,
        String currency,
        String frequency,
        String baseSalary,
        PayrollCalculationContext.CountryPayrollProfile countryProfile,
        PayrollCalculationContext.FiscalAccumulatorSnapshot fiscalAccumulator,
        List<PayrollCalculationContext.ManualAdjustment> manualAdjustments
    ) {
        return context(country, jurisdiction, currency, frequency, baseSalary, countryProfile, fiscalAccumulator, manualAdjustments, true);
    }

    private PayrollCalculationContext context(
        String country,
        String jurisdiction,
        String currency,
        String frequency,
        String baseSalary,
        PayrollCalculationContext.CountryPayrollProfile countryProfile,
        PayrollCalculationContext.FiscalAccumulatorSnapshot fiscalAccumulator,
        List<PayrollCalculationContext.ManualAdjustment> manualAdjustments,
        boolean includeInFiscal
    ) {
        var periodEnd = LocalDate.parse("2026-06-30");
        var salary = new BigDecimal(baseSalary);
        return new PayrollCalculationContext(
            1L,
            10L,
            20L,
            30L,
            country,
            jurisdiction,
            currency,
            BigDecimal.ONE,
            frequency,
            LocalDate.parse("2026-06-01"),
            periodEnd,
            includeInFiscal,
            new PayrollCalculationContext.EmployeeSalarySnapshot(
                "USR-001",
                "Ada Lovelace",
                "Engineer",
                "Payroll",
                "Corporate",
                "Operations",
                "daily",
                salary,
                BigDecimal.ZERO,
                new BigDecimal("8"),
                new BigDecimal("5")
            ),
            new PayrollCalculationContext.PayrollAttendanceInput(
                new BigDecimal("15"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("15"),
                0,
                new BigDecimal("120"),
                BigDecimal.ZERO,
                List.of(),
                List.of()
            ),
            new PayrollCalculationContext.Preferences(
                new BigDecimal("8"),
                true,
                new BigDecimal("0.10"),
                new BigDecimal("0.04"),
                new BigDecimal("0.03"),
                new BigDecimal("0.07"),
                new BigDecimal("0.05"),
                new BigDecimal("0.02")
            ),
            manualAdjustments,
            PayrollCalculationContext.CurrencySnapshot.defaultSameCurrency(currency, BigDecimal.ONE, periodEnd),
            countryProfile,
            fiscalAccumulator == null
                ? PayrollCalculationContext.FiscalAccumulatorSnapshot.empty(country, periodEnd)
                : fiscalAccumulator
        );
    }

    private PayrollCalculationContext withAttendance(
        PayrollCalculationContext context,
        PayrollCalculationContext.PayrollAttendanceInput attendance
    ) {
        return new PayrollCalculationContext(
            context.companyId(),
            context.employeeId(),
            context.userCompanyId(),
            context.runId(),
            context.country(),
            context.jurisdiction(),
            context.currency(),
            context.fxRate(),
            context.payrollFrequency(),
            context.periodStartDate(),
            context.periodEndDate(),
            context.includeInFiscal(),
            context.salary(),
            attendance,
            context.preferences(),
            context.manualAdjustments(),
            context.currencySnapshot(),
            context.countryProfile(),
            context.fiscalAccumulator()
        );
    }

    private PayrollCalculationContext.FiscalAccumulatorSnapshot fiscalAccumulator(String country, String taxableBaseYearToDate) {
        var periodEnd = LocalDate.parse("2026-06-30");
        var ytd = new BigDecimal(taxableBaseYearToDate);
        return new PayrollCalculationContext.FiscalAccumulatorSnapshot(
            country,
            periodEnd.getYear(),
            LocalDate.of(periodEnd.getYear(), 1, 1),
            LocalDate.parse("2026-06-01"),
            periodEnd,
            ytd,
            ytd,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            ytd,
            Map.of(),
            Map.of(),
            Map.of(),
            Map.of("source", "test")
        );
    }

    private PayrollCalculationContext.CountryPayrollProfile colombiaProfile(
        boolean integralSalary,
        BigDecimal arlClass,
        Boolean employerHealthExemptionApplies,
        Boolean senaApplies,
        Boolean icbfApplies,
        Boolean ccfApplies,
        String withholdingProcedure,
        BigDecimal procedure2FixedRate
    ) {
        return colombiaProfile(
            integralSalary,
            arlClass,
            employerHealthExemptionApplies,
            senaApplies,
            icbfApplies,
            ccfApplies,
            withholdingProcedure,
            procedure2FixedRate,
            List.of()
        );
    }

    private PayrollCalculationContext.CountryPayrollProfile colombiaProfile(
        boolean integralSalary,
        BigDecimal arlClass,
        Boolean employerHealthExemptionApplies,
        Boolean senaApplies,
        Boolean icbfApplies,
        Boolean ccfApplies,
        String withholdingProcedure,
        BigDecimal procedure2FixedRate,
        List<PayrollCalculationContext.PayrollNovelty> novelties
    ) {
        return new PayrollCalculationContext.CountryPayrollProfile(
            "CO",
            "01",
            "",
            integralSalary,
            arlClass,
            "EPS001",
            "EPS prueba",
            "AFP001",
            "AFP prueba",
            "CCF001",
            "Caja prueba",
            employerHealthExemptionApplies,
            senaApplies,
            icbfApplies,
            ccfApplies,
            withholdingProcedure,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            procedure2FixedRate,
            novelties,
            Map.of("test", true)
        );
    }

    private static final class FakePayrollRuleResolver extends PayrollRuleResolver {

        private final Map<String, RuleSet> ruleSets = new LinkedHashMap<>();
        private final Map<Long, Map<String, BigDecimal>> parameters = new LinkedHashMap<>();
        private final Map<Long, List<RuleParameter>> parameterDetails = new LinkedHashMap<>();
        private final Map<Long, List<RuleBracket>> brackets = new LinkedHashMap<>();

        private FakePayrollRuleResolver() {
            super(mock(JdbcTemplate.class));
            seedRule(1001L, "MX", "", "TEST_RULE", Map.of("rate", new BigDecimal("0.10")), List.of(
                bracket("0", null, "0", "0.10", "0", 1)
            ));
            seedRule(1L, "MX", "", "ISR_MONTHLY", Map.of(), List.of(
                bracket("0", null, "0", "0.10", "0", 1)
            ));
            seedRule(2L, "MX", "", "SOCIAL_SECURITY", Map.of(), List.of());
            seedRule(3L, "MX", "", "RCV_EMPLOYER", Map.of(), List.of(
                bracket("0", null, "0", "0.07513", "0", 1)
            ));
            seedRule(4L, "CA", "", "INCOME_TAX_FEDERAL", Map.of("basic_credit", BigDecimal.ZERO), List.of(
                bracket("0", null, "0", "0.10", "0", 1)
            ));
            seedRule(5L, "CA", "ON", "INCOME_TAX_PROVINCIAL", Map.of("basic_credit", BigDecimal.ZERO), List.of(
                bracket("0", null, "0", "0.05", "0", 1)
            ));
            seedRule(6L, "CA", "", "CPP", Map.of(), List.of());
            seedRule(7L, "CA", "", "EI", Map.of(), List.of());
            seedRule(8L, "CA", "", "VACATION", Map.of(), List.of());
            seedRule(9L, "US", "", "INCOME_TAX_FEDERAL_SINGLE", Map.of(), List.of(
                bracket("0", null, "0", "0.10", "0", 1)
            ));
            seedRule(10L, "US", "", "FICA", Map.of(), List.of());
            seedRule(11L, "US", "", "FUTA", Map.of(), List.of());
            seedRule(12L, "US", "CA", "STATE_PAYROLL", Map.of(
                "employee_sdi_rate", new BigDecimal("0.013"),
                "employee_sdi_wage_base", new BigDecimal("100000")
            ), List.of());
            seedRule(13L, "BR", "", "INSS_EMPLOYEE", Map.of(), List.of(
                bracket("0", "1621", "0", "0.075", "0", 1),
                bracket("1621", "2902.84", "0", "0.09", "0", 2),
                bracket("2902.84", "4354.27", "0", "0.12", "0", 3),
                bracket("4354.27", "8475.55", "0", "0.14", "0", 4)
            ));
            seedRule(14L, "BR", "", "IRRF_MONTHLY", Map.of(), List.of(
                bracket("0", "2428.80", "0", "0", "0", 1),
                bracket("2428.80", null, "182.16", "0.075", "0", 2)
            ));
            seedRule(15L, "BR", "", "EMPLOYER_SOCIAL_CONTRIBUTIONS", Map.of(), List.of());
            seedRule(16L, "BR", "", "BENEFITS", Map.of(), List.of());
            seedRule(17L, "CO", "", "SOCIAL_SECURITY", Map.ofEntries(
                Map.entry("smmlv_monthly", new BigDecimal("1750905.00")),
                Map.entry("ibc_min_smmlv", BigDecimal.ONE),
                Map.entry("ibc_max_smmlv", new BigDecimal("25")),
                Map.entry("employee_health_rate", new BigDecimal("0.04")),
                Map.entry("employee_pension_rate", new BigDecimal("0.04")),
                Map.entry("employer_health_rate", new BigDecimal("0.085")),
                Map.entry("employer_pension_rate", new BigDecimal("0.12")),
                Map.entry("employer_exemption_threshold_smmlv", new BigDecimal("10")),
                Map.entry("apply_employer_exemption_under_threshold", BigDecimal.ONE),
                Map.entry("solidarity_subaccount_rate", new BigDecimal("0.005")),
                Map.entry("integral_salary_minimum_smmlv", new BigDecimal("13")),
                Map.entry("integral_salary_ibc_factor", new BigDecimal("0.70"))
            ), List.of());
            seedRule(18L, "CO", "", "SOLIDARITY_FUND", Map.of(), List.of(
                bracket("0", "3.99999999", "0", "0", "0", 1),
                bracket("4", "6.99999999", "0", "0.015", "0", 2),
                bracket("7", "10.99999999", "0", "0.018", "0", 3),
                bracket("11", "18.99999999", "0", "0.025", "0", 4),
                bracket("19", "20", "0", "0.028", "0", 5),
                bracket("20.00000001", null, "0", "0.03", "0", 6)
            ));
            seedRule(19L, "CO", "", "ARL", Map.of(
                "default_arl_class", BigDecimal.ONE,
                "default_arl_rate", BigDecimal.ZERO
            ), List.of(
                bracket("1", "1", "0", "0.00522", "0", 1),
                bracket("2", "2", "0", "0.01044", "0", 2),
                bracket("3", "3", "0", "0.02436", "0", 3),
                bracket("4", "4", "0", "0.04350", "0", 4),
                bracket("5", "5", "0", "0.06960", "0", 5)
            ));
            seedRule(20L, "CO", "", "PARAFISCAL", Map.of(
                "ccf_rate", new BigDecimal("0.04"),
                "icbf_rate", new BigDecimal("0.03"),
                "sena_rate", new BigDecimal("0.02")
            ), List.of());
            seedRule(21L, "CO", "", "LABOR_PROVISIONS", Map.ofEntries(
                Map.entry("cesantias_rate", new BigDecimal("0.08333333")),
                Map.entry("cesantias_interest_monthly_rate", new BigDecimal("0.01")),
                Map.entry("prima_services_rate", new BigDecimal("0.08333333")),
                Map.entry("vacation_rate", new BigDecimal("0.04166667")),
                Map.entry("integral_salary_disables_cesantias", BigDecimal.ONE),
                Map.entry("integral_salary_disables_prima", BigDecimal.ONE),
                Map.entry("integral_salary_vacation_base_factor", new BigDecimal("0.70")),
                Map.entry("payroll_days_per_year", new BigDecimal("360")),
                Map.entry("payroll_days_per_month", new BigDecimal("30")),
                Map.entry("vacation_liquidation_divisor", new BigDecimal("720")),
                Map.entry("cesantias_interest_annual_rate", new BigDecimal("0.12")),
                Map.entry("termination_high_salary_threshold_smmlv", new BigDecimal("10")),
                Map.entry("termination_fixed_term_minimum_days", new BigDecimal("15")),
                Map.entry("termination_low_salary_first_year_days", new BigDecimal("30")),
                Map.entry("termination_low_salary_additional_year_days", new BigDecimal("20")),
                Map.entry("termination_high_salary_first_year_days", new BigDecimal("20")),
                Map.entry("termination_high_salary_additional_year_days", new BigDecimal("15"))
            ), List.of());
            seedRule(22L, "CO", "", "WITHHOLDING_TAX", Map.of(
                "uvt_value", new BigDecimal("52374.00"),
                "dependent_deduction_rate", new BigDecimal("0.10"),
                "dependent_deduction_max_uvt", new BigDecimal("32"),
                "prepaid_medicine_max_uvt", new BigDecimal("16"),
                "exempt_income_general_cap_rate", new BigDecimal("0.40"),
                "exempt_income_general_cap_uvt_monthly", new BigDecimal("420"),
                "labor_exempt_income_rate", new BigDecimal("0.25"),
                "labor_exempt_income_cap_uvt_monthly", new BigDecimal("65.83333333")
            ), List.of(
                bracket("0", "95", "0", "0", "0", 1),
                bracket("95", "150", "0", "0.19", "0", 2),
                bracket("150", "360", "10", "0.28", "0", 3),
                bracket("360", null, "69", "0.33", "0", 4)
            ));
        }

        @Override
        public RuleSet resolveRuleSet(String countryCode, String provinceCode, String ruleCode, LocalDate effectiveDate) {
            var exact = ruleSets.get(key(countryCode, provinceCode, ruleCode));
            if (exact != null) {
                return exact;
            }
            return ruleSets.get(key(countryCode, "", ruleCode));
        }

        @Override
        public Map<String, BigDecimal> parameters(long ruleSetId) {
            return parameters.getOrDefault(ruleSetId, Map.of());
        }

        @Override
        public List<RuleParameter> parameterDetails(long ruleSetId) {
            return parameterDetails.getOrDefault(ruleSetId, List.of());
        }

        @Override
        public List<RuleBracket> brackets(long ruleSetId) {
            return brackets.getOrDefault(ruleSetId, List.of());
        }

        @Override
        public Map<String, BigDecimal> parametersByCode(String countryCode, String provinceCode, String ruleCode, LocalDate effectiveDate) {
            var ruleSet = resolveRuleSet(countryCode, provinceCode, ruleCode, effectiveDate);
            return ruleSet == null ? Map.of() : parameters(ruleSet.id());
        }

        @Override
        public List<RuleBracket> bracketsByCode(String countryCode, String provinceCode, String ruleCode, LocalDate effectiveDate) {
            var ruleSet = resolveRuleSet(countryCode, provinceCode, ruleCode, effectiveDate);
            return ruleSet == null ? List.of() : brackets(ruleSet.id());
        }

        @Override
        public RuleSet ruleSet(long ruleSetId) {
            return ruleSets.values().stream()
                .filter((ruleSet) -> ruleSet.id() == ruleSetId)
                .findFirst()
                .orElse(null);
        }

        private void seedRule(
            long id,
            String country,
            String province,
            String code,
            Map<String, BigDecimal> params,
            List<RuleBracket> ruleBrackets
        ) {
            var normalizedCountry = normalizeCountry(country);
            var normalizedProvince = normalizeProvince(province);
            ruleSets.put(key(normalizedCountry, normalizedProvince, code), new RuleSet(
                id,
                normalizedCountry,
                normalizedProvince,
                code,
                code + " name",
                "tax",
                LocalDate.parse("2026-01-01"),
                null,
                "2026-test",
                "official.example",
                "https://official.example/" + code,
                true,
                LocalDateTime.parse("2026-01-01T00:00:00")
            ));
            parameters.put(id, params);
            parameterDetails.put(id, params.entrySet().stream()
                .map((entry) -> new RuleParameter(entry.getKey(), entry.getValue(), "rate", null, 10))
                .toList());
            brackets.put(id, ruleBrackets);
        }

        private String key(String country, String province, String code) {
            return normalizeCountry(country) + "|" + normalizeProvince(province) + "|" + code;
        }

        private RuleBracket bracket(
            String lower,
            String upper,
            String fixed,
            String rate,
            String constant,
            int displayOrder
        ) {
            return new RuleBracket(
                new BigDecimal(lower),
                upper == null ? null : new BigDecimal(upper),
                new BigDecimal(fixed),
                new BigDecimal(rate),
                new BigDecimal(constant),
                displayOrder
            );
        }
    }
}
