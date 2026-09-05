package com.indice.erp.hr.incentives;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mockingDetails;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class HrIncentivePayrollSupplyServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void automaticPayrollApplicationExcludesExternalFundShortages() {
        var service = new HrIncentivePayrollSupplyService(jdbcTemplate);

        service.markApplicationsApplied(
            7L,
            91L,
            101L,
            102L,
            LocalDate.of(2026, 9, 1),
            LocalDate.of(2026, 9, 15),
            "MXN"
        );

        var automaticUpdateSql = mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .map(invocation -> invocation.getArgument(0, String.class))
            .filter(sql -> sql.contains("UPDATE hr_incentive_applications"))
            .findFirst()
            .orElseThrow();

        assertThat(automaticUpdateSql)
            .contains("i.incentive_type = 'manual'")
            .contains("COALESCE(a.source_type, 'incentive') <> 'petty_cash_shortage'");
    }
}
