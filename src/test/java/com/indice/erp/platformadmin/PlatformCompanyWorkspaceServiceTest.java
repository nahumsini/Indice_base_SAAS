package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class PlatformCompanyWorkspaceServiceTest {
    @Mock JdbcTemplate jdbc;
    @Mock PlatformAdminAccessService access;
    PlatformCompanyWorkspaceService service;

    @BeforeEach void setUp() { service = new PlatformCompanyWorkspaceService(jdbc, access); }

    @Test void deniesReadsBeforeInspectingAnyCompanyData() {
        when(access.require(9L, "PLATFORM_VIEW")).thenThrow(new PlatformAdminForbiddenException("Denied"));
        assertThatThrownBy(() -> service.invoices(9, 41, 1, 25)).isInstanceOf(PlatformAdminForbiddenException.class);
        assertThatThrownBy(() -> service.history(9, 41, 1, 25)).isInstanceOf(PlatformAdminForbiddenException.class);
        verifyNoInteractions(jdbc);
    }

    @Test void unknownCompanyDoesNotReturnAnApparentlyEmptyHistory() {
        when(jdbc.queryForObject("SELECT COUNT(*) FROM companies WHERE id = ?", Long.class, 41L)).thenReturn(0L);
        assertThatThrownBy(() -> service.history(9, 41, 1, 25)).isInstanceOf(NoSuchElementException.class);
        verify(access).require(9L, "PLATFORM_VIEW");
        verify(jdbc).queryForObject("SELECT COUNT(*) FROM companies WHERE id = ?", Long.class, 41L);
        verifyNoMoreInteractions(jdbc);
    }

    @Test @SuppressWarnings({ "rawtypes", "unchecked" })
    void invoicesBeyondTheOldFiftyRecordLimitRemainScopedAndPreserveZeroPayments() throws Exception {
        when(jdbc.queryForObject("SELECT COUNT(*) FROM companies WHERE id = ?", Long.class, 41L)).thenReturn(1L);
        when(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice_snapshots WHERE company_id = ?", Long.class, 41L)).thenReturn(76L);
        var rs = mock(ResultSet.class);
        when(rs.getString("stripe_invoice_id")).thenReturn("invoice-76");
        when(rs.getObject("amount_due_cents", Long.class)).thenReturn(37900L);
        when(rs.getObject("amount_paid_cents", Long.class)).thenReturn(0L);
        when(jdbc.query(anyString(), any(RowMapper.class), eq(41L), eq(25), eq(75L)))
            .thenAnswer(call -> List.of(((RowMapper) call.getArgument(1)).mapRow(rs, 0)));

        var result = service.invoices(9, 41, 4, 25);
        assertThat(result.company_id()).isEqualTo(41);
        assertThat(result.pagination().total_pages()).isEqualTo(4);
        assertThat(result.invoices().getFirst().amount_paid_cents()).isZero();
        assertThat(result.invoices().getFirst().amount_due_cents()).isEqualTo(37900L);
        verify(jdbc).query(argThat(sql -> sql.contains("WHERE company_id = ?") && sql.contains("LIMIT ? OFFSET ?")), any(RowMapper.class), eq(41L), eq(25), eq(75L));
    }

    @Test @SuppressWarnings({ "rawtypes", "unchecked" })
    void everyHistorySourceIsScopedBeforeUnionAndRawPayloadsAreExcluded() throws Exception {
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(41L))).thenReturn(30L);
        var rs = mock(ResultSet.class);
        when(rs.getLong("id")).thenReturn(5L);
        when(rs.getString("source")).thenReturn("PLATFORM");
        when(rs.getString("action")).thenReturn("BENEFIT_GRANTED");
        when(rs.getString("reason")).thenReturn("Approved courtesy");
        when(rs.getString("outcome")).thenReturn("SUCCESS");
        when(rs.getString("actor_name")).thenReturn("Operator");
        when(rs.getTimestamp("occurred_at")).thenReturn(Timestamp.from(Instant.parse("2026-09-13T12:00:00Z")));
        when(jdbc.query(anyString(), any(RowMapper.class), eq(41L), eq(41L), eq(41L), eq(25), eq(50L)))
            .thenAnswer(call -> List.of(((RowMapper) call.getArgument(1)).mapRow(rs, 0)));

        var result = service.history(9, 41, 3, 25);
        assertThat(result.pagination().total_items()).isEqualTo(90);
        assertThat(result.events().getFirst().id()).isEqualTo("PLATFORM:5");
        assertThat(result.events().getFirst().reason()).isEqualTo("Approved courtesy");
        verify(jdbc).query(argThat(sql ->
            sql.contains("FROM platform_audit_events WHERE company_id = ?")
            && sql.contains("FROM billing_audit_events WHERE company_id = ?")
            && sql.contains("FROM user_login_audit WHERE company_id = ?")
            && !sql.contains("detail_json AS") && !sql.contains("ip_address") && !sql.contains("email_normalized")
        ), any(RowMapper.class), eq(41L), eq(41L), eq(41L), eq(25), eq(50L));
    }

    @Test void paginationHandlesEmptyAccountsAndBoundsUntrustedSizes() {
        assertThat(PlatformCompanyWorkspaceService.pagination(0, -1, 0))
            .isEqualTo(new PlatformCompanyWorkspaceService.Pagination(1, 1, 0, 1));
        assertThat(PlatformCompanyWorkspaceService.pagination(76, 99, 25))
            .isEqualTo(new PlatformCompanyWorkspaceService.Pagination(4, 25, 76, 4));
        assertThat(PlatformCompanyWorkspaceService.pagination(201, 2, Integer.MAX_VALUE).page_size()).isEqualTo(100);
    }
}
