package com.indice.erp.hr.incentives;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class HrPayrollExternalDeductionServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void queuesFundShortageAsExplicitPendingPayrollDeduction() {
        var service = new HrPayrollExternalDeductionService(jdbcTemplate);
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(Map.of(
            "user_company_id", 91L,
            "registration_country", "MX"
        )));
        when(jdbcTemplate.queryForObject(contains("FROM hr_incentives"), eq(Long.class), any(Object[].class)))
            .thenReturn(701L);
        when(jdbcTemplate.queryForObject(contains("FROM hr_incentive_applications"), eq(Integer.class), any(Object[].class)))
            .thenReturn(0);
        service.queueFundShortageDeduction(
            7L,
            81L,
            31L,
            "Fondo operativo",
            501L,
            "PC-ST-2026-06-31",
            new BigDecimal("100.00"),
            "MXN",
            LocalDate.of(2026, 6, 30),
            1L
        );

        var applicationInvocation = mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .filter(invocation -> invocation.getArgument(0, String.class).contains("INSERT INTO hr_incentive_applications"))
            .findFirst()
            .orElseThrow();
        var values = applicationInvocation.getArguments();
        assertEquals(7L, values[1]);
        assertEquals(701L, values[2]);
        assertEquals(91L, values[3]);
        assertEquals(LocalDate.of(2026, 6, 30), values[4]);
        assertEquals(LocalDate.of(9999, 12, 31), values[5]);
        assertEquals(new BigDecimal("100.00"), values[6]);
        assertEquals("MXN", values[7]);
        assertEquals("petty_cash_shortage", values[8]);
        assertEquals("petty_cash_statement", values[9]);
        assertEquals("501", values[10]);
    }

    @Test
    void duplicateFundStatementDoesNotQueueSecondApplication() {
        var service = new HrPayrollExternalDeductionService(jdbcTemplate);
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(Map.of(
            "user_company_id", 91L,
            "registration_country", "MX"
        )));
        when(jdbcTemplate.queryForObject(contains("FROM hr_incentives"), eq(Long.class), any(Object[].class)))
            .thenReturn(701L);
        when(jdbcTemplate.queryForObject(contains("FROM hr_incentive_applications"), eq(Integer.class), any(Object[].class)))
            .thenReturn(1);

        service.queueFundShortageDeduction(
            7L, 81L, 31L, "Fondo operativo", 501L, "PC-ST-501",
            new BigDecimal("100.00"), "MXN", LocalDate.of(2026, 6, 30), 1L
        );

        assertEquals(0L, mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .filter(invocation -> invocation.getArgument(0, String.class).contains("INSERT INTO hr_incentive_applications"))
            .count());
    }

    @Test
    void rejectsInactiveResponsibleCollaboratorBeforeCreatingDeduction() {
        var service = new HrPayrollExternalDeductionService(jdbcTemplate);
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());

        assertThrows(NoSuchElementException.class, () -> service.queueFundShortageDeduction(
            7L, 81L, 31L, "Fondo operativo", 501L, "PC-ST-501",
            new BigDecimal("100.00"), "MXN", LocalDate.of(2026, 6, 30), 1L
        ));

        assertEquals(0L, mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .count());
    }

    @Test
    void resolvesPayrollCurrencyFromCollaboratorCountry() {
        assertEquals("CAD", HrPayrollExternalDeductionService.resolvePayrollCurrency("Canada", "MXN"));
        assertEquals("MXN", HrPayrollExternalDeductionService.resolvePayrollCurrency("", "mxn"));
    }
}
