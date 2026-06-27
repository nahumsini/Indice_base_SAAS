package com.indice.erp.hr.payroll.reporting.co;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.payroll.engine.PayrollCalculatedLineItem;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import com.indice.erp.hr.payroll.engine.PayrollLineCalculationResult;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

class ColombiaPayrollReportingServiceTest {

    @Test
    void buildsPilaAndDianDraftPayloadsFromCalculatedLineItems() {
        var service = new ColombiaPayrollReportingService(mock(JdbcTemplate.class), new ObjectMapper());

        var bundle = service.build(context(profile(true)), result(List.of()));

        assertTrue(bundle.pilaResponse().readyForTransmission());
        assertTrue(bundle.dianResponse().readyForTransmission());
        assertEquals("900123456", bundle.pilaPayload().header().employerNit());
        assertEquals("CC", bundle.pilaPayload().contributor().documentType());
        assertEquals(new BigDecimal("4000000.00"), bundle.pilaPayload().contributor().ibcHealth());
        assertEquals(new BigDecimal("160000.00"), bundle.dianPayload().deductions().eps());
        assertEquals(new BigDecimal("3630000.00"), bundle.dianPayload().totals().netAmount());
        assertEquals("SLN", bundle.pilaPayload().novelties().getFirst().code());
        assertEquals("CO_CORRECTION_EARNING", bundle.dianPayload().adjustmentNotes().getFirst().noteType());
    }

    @Test
    void blocksTransmissionWhenRequiredPilaAndDianIdentityDataIsMissing() {
        var service = new ColombiaPayrollReportingService(mock(JdbcTemplate.class), new ObjectMapper());

        var bundle = service.build(context(PayrollCalculationContext.CountryPayrollProfile.empty("CO")), result(List.of()));

        assertFalse(bundle.pilaResponse().readyForTransmission());
        assertFalse(bundle.dianResponse().readyForTransmission());
        assertTrue(bundle.pilaIssues().stream().anyMatch((issue) -> "CO_PILA_EMPLOYER_NIT_MISSING".equals(issue.code())));
        assertTrue(bundle.dianIssues().stream().anyMatch((issue) -> "CO_DIAN_WORKER_DOCUMENT_MISSING".equals(issue.code())));
    }

    @Test
    void persistDraftSnapshotsWritesPilaAndDianRows() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var service = new ColombiaPayrollReportingService(jdbcTemplate, new ObjectMapper());

        service.persistDraftSnapshots(77L, context(profile(true)), result(List.of()));

        @SuppressWarnings("unchecked")
        var argsCaptor = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate, times(2)).update(
            contains("INSERT INTO payroll_government_reporting_snapshots"),
            argsCaptor.capture(),
            any(int[].class)
        );
        var firstArgs = argsCaptor.getAllValues().getFirst();
        var secondArgs = argsCaptor.getAllValues().get(1);
        assertEquals(77L, firstArgs[1]);
        assertTrue(List.of(firstArgs[5], secondArgs[5]).contains("PILA"));
        assertTrue(List.of(firstArgs[5], secondArgs[5]).contains("DIAN_PAYROLL"));
    }

    private PayrollCalculationContext context(PayrollCalculationContext.CountryPayrollProfile profile) {
        var periodEnd = LocalDate.parse("2026-06-30");
        return new PayrollCalculationContext(
            1L,
            10L,
            20L,
            30L,
            "CO",
            "CO",
            "COP",
            BigDecimal.ONE,
            "semimonthly",
            LocalDate.parse("2026-06-01"),
            periodEnd,
            true,
            new PayrollCalculationContext.EmployeeSalarySnapshot(
                "USR-CO-001",
                "Ana Perez",
                "Analista",
                "People",
                "Bogota",
                "Operacion",
                "daily",
                new BigDecimal("4000000.00"),
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
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
            ),
            List.of(),
            PayrollCalculationContext.CurrencySnapshot.defaultSameCurrency("COP", BigDecimal.ONE, periodEnd),
            profile
        );
    }

    private PayrollCalculationContext.CountryPayrollProfile profile(boolean completeMetadata) {
        var metadata = new LinkedHashMap<String, Object>();
        if (completeMetadata) {
            metadata.put("companyConfig", Map.of(
                "employerNit", "900123456",
                "employerName", "Indice Colombia SAS",
                "pilaPlanillaType", "E"
            ));
            metadata.put("employeeProfile", Map.of(
                "documentType", "CC",
                "documentNumber", "100200300",
                "municipalityCode", "11001",
                "workerType", "dependiente",
                "contractType", "termino_indefinido"
            ));
        }
        return new PayrollCalculationContext.CountryPayrollProfile(
            "CO",
            "01",
            "",
            false,
            BigDecimal.ONE,
            "EPS001",
            "EPS prueba",
            "AFP001",
            "AFP prueba",
            "CCF001",
            "Caja prueba",
            true,
            false,
            false,
            true,
            "procedure_1",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            List.of(new PayrollCalculationContext.PayrollNovelty(
                "SLN",
                "Licencia no remunerada",
                LocalDate.parse("2026-06-10"),
                LocalDate.parse("2026-06-12"),
                new BigDecimal("3"),
                BigDecimal.ZERO,
                new BigDecimal("-500000.00"),
                false,
                true,
                "test",
                Map.of()
            )),
            metadata
        );
    }

    private PayrollLineCalculationResult result(List<String> warnings) {
        var items = List.of(
            item("BASE_DAILY", "earning", "Fixed period salary", "4000000.00", 10, "4000000.00", null),
            item("CO_EPS_EMPLOYEE", "deduction", "EPS trabajador", "160000.00", 90, "4000000.00", "0.04"),
            item("CO_AFP_EMPLOYEE", "deduction", "AFP trabajador", "160000.00", 92, "4000000.00", "0.04"),
            item("CO_WITHHOLDING_TAX", "deduction", "Retencion en la fuente", "300000.00", 98, "6500000.00", "0.04615385"),
            item("CO_CORRECTION_EARNING", "earning", "Correccion positiva", "250000.00", 99, "250000.00", null),
            item("CO_AFP_EMPLOYER", "employer_contribution", "AFP empleador", "480000.00", 112, "4000000.00", "0.12"),
            item("CO_ARL", "employer_contribution", "ARL", "20880.00", 114, "4000000.00", "0.00522"),
            item("CO_CCF", "employer_contribution", "Caja de compensacion familiar", "160000.00", 116, "4000000.00", "0.04")
        );
        return new PayrollLineCalculationResult(
            new BigDecimal("4000000.00"),
            BigDecimal.ZERO,
            new BigDecimal("15"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            0,
            new BigDecimal("120"),
            BigDecimal.ZERO,
            new BigDecimal("4000000.00"),
            new BigDecimal("4250000.00"),
            new BigDecimal("620000.00"),
            new BigDecimal("660880.00"),
            new BigDecimal("3630000.00"),
            new BigDecimal("4910880.00"),
            "payroll_calculation_engine:co",
            LocalDateTime.parse("2026-06-30T12:00:00"),
            items,
            List.of(),
            true,
            warnings,
            Map.of(),
            Map.of(),
            Map.of(),
            Map.of()
        );
    }

    private PayrollCalculatedLineItem item(
        String code,
        String category,
        String label,
        String amount,
        int order,
        String base,
        String rate
    ) {
        return new PayrollCalculatedLineItem(
            code,
            category,
            label,
            new BigDecimal(amount),
            "computed_tax",
            order,
            "CO",
            "CO",
            "statutory",
            "earning".equals(category),
            false,
            true,
            "employer_contribution".equals(category),
            "Colombia payroll",
            "TEST",
            1L,
            code + " formula",
            base == null ? null : new BigDecimal(base),
            rate == null ? null : new BigDecimal(rate),
            "COP"
        );
    }
}
