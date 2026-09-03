package com.indice.erp.kiosk.engine;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class KioskEmployeeAccessServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void effectiveEligibilityKeepsTheOperationalAllowlistForLegacyDefinitions() {
        given(jdbcTemplate.queryForObject(
            any(String.class), eq(Integer.class), eq(31L), eq(7L)))
            .willReturn(1);

        var service = new KioskEmployeeAccessService(jdbcTemplate);

        assertThat(service.isEmployeeEligible(7L, 31L)).isTrue();

        var sql = ArgumentCaptor.forClass(String.class);
        then(jdbcTemplate).should().queryForObject(
            sql.capture(), eq(Integer.class), eq(31L), eq(7L));
        assertThat(sql.getValue())
            .contains("'PETTY_CASH'")
            .contains("'receipt_capture'")
            .contains("'accounts_payable'")
            .contains("'MIXED', 'EMPLOYEE'")
            .contains("'self_service', 'waiter_station'")
            .doesNotContain("'self_checkout'")
            .doesNotContain("'table_order_center'")
            .doesNotContain("'kitchen_display'");
    }
}
