package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.indice.erp.billing.lifecycle.CommercialAccessRestrictedException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class PublicTrialAccessServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final Instant now = Instant.parse("2026-10-08T12:00:00Z");
    private final PublicTrialAccessService service = new PublicTrialAccessService(jdbc, Clock.fixed(now, ZoneOffset.UTC));

    @Test @SuppressWarnings("unchecked")
    void deadlineIsExclusiveAndCannotBeExtendedByLegacyPaymentSetup() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(9L))).thenReturn(List.of(now));
        assertThatThrownBy(() -> service.requireActive(9)).isInstanceOf(CommercialAccessRestrictedException.class);
        assertThatThrownBy(() -> service.requireLegacyPaidFlowAllowed(9)).isInstanceOf(IllegalStateException.class);
    }

    @Test @SuppressWarnings("unchecked")
    void unexpiredTrialAllowsOperationsButNotAnUnapprovedFinancialConversion() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(9L))).thenReturn(List.of(now.plusSeconds(1)));
        assertThatCode(() -> service.requireActive(9)).doesNotThrowAnyException();
        assertThatThrownBy(() -> service.requireLegacyPaidFlowAllowed(9)).isInstanceOf(IllegalStateException.class);
    }

    @Test @SuppressWarnings("unchecked")
    void nonCohortCompaniesKeepTheirExistingAccessAndPaymentContracts() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(9L))).thenReturn(List.of());
        assertThatCode(() -> service.requireActive(9)).doesNotThrowAnyException();
        assertThatCode(() -> service.requireLegacyPaidFlowAllowed(9)).doesNotThrowAnyException();
    }
}
