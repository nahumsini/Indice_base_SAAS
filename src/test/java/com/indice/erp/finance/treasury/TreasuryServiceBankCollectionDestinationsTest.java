package com.indice.erp.finance.treasury;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class TreasuryServiceBankCollectionDestinationsTest {

    @Mock
    private JdbcTemplate jdbc;

    private TreasuryService service;

    @BeforeEach
    void setUp() {
        service = new TreasuryService(jdbc);
    }

    @Test
    @SuppressWarnings("unchecked")
    void publishesOnlyRealActiveBankDestinationsInsideTheCompany() throws Exception {
        var capturedSql = new AtomicReference<String>();
        var capturedCompany = new AtomicReference<Object>();
        given(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                capturedSql.set(invocation.getArgument(0, String.class));
                capturedCompany.set(invocation.getArgument(2));
                var mapper = (RowMapper<TreasuryAccount>) invocation.getArgument(1, RowMapper.class);
                var row = mock(ResultSet.class);
                given(row.getLong("id")).willReturn(88L);
                given(row.getLong("company_id")).willReturn(2L);
                given(row.getString("name")).willReturn("Banco operativo");
                given(row.getString("type")).willReturn("BANK");
                given(row.getString("currency_code")).willReturn("MXN");
                given(row.getBigDecimal("current_balance")).willReturn(BigDecimal.ZERO);
                given(row.getBigDecimal("pending_balance")).willReturn(BigDecimal.ZERO);
                given(row.getString("status")).willReturn("ACTIVE");
                return List.of(mapper.mapRow(row, 0));
            });

        var accounts = service.listBankCollectionDestinations(2L);

        assertThat(accounts).singleElement().satisfies(account -> {
            assertThat(account.id()).isEqualTo(88L);
            assertThat(account.name()).isEqualTo("Banco operativo");
            assertThat(account.currencyCode()).isEqualTo("MXN");
        });
        assertThat(capturedCompany.get()).isEqualTo(2L);
        assertThat(capturedSql.get())
            .contains("company_id = ?", "type = 'BANK'", "status = 'ACTIVE'", "deleted_at IS NULL")
            .contains("system_key NOT LIKE 'POS_UNASSIGNED_%'");
    }
}
