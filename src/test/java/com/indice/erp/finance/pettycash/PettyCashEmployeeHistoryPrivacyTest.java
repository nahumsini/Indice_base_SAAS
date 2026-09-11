package com.indice.erp.finance.pettycash;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PettyCashEmployeeHistoryPrivacyTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AttendanceKioskTokenService tokenService;
    @Mock private PettyCashMapper mapper;
    @Mock private PettyCashService pettyCashService;
    @Mock private PettyCashAttachmentService attachmentService;
    @Mock private FinanceBusinessTimeZoneResolver timeZoneResolver;

    private PettyCashPublicKioskService service;

    @BeforeEach
    void setUp() {
        service = new PettyCashPublicKioskService(
            jdbcTemplate, new ObjectMapper(), tokenService, new BCryptPasswordEncoder(),
            mapper, pettyCashService, attachmentService, timeZoneResolver, 900, 14_400);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void sharedFundHistoryUsesBothAuthoritativeEmployeeIdentifiers() throws Exception {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                var rowMapper = (RowMapper) invocation.getArgument(1);
                var parameters = Arrays.copyOfRange(
                    invocation.getArguments(), 2, invocation.getArguments().length);
                if (sql.contains("FROM finance_petty_cash_funds fund")) {
                    return List.of(sharedFund());
                }
                if (sql.contains("FROM hr_users e")) {
                    return List.of(rowMapper.mapRow(employeeRow(((Number) parameters[2]).longValue()), 0));
                }
                if (sql.contains("FROM finance_petty_cash_settlement_lines")) {
                    assertThat(sql)
                        .contains("created_by_user_id = ?")
                        .contains("JSON_VALID")
                        .contains("$.source")
                        .contains("$.identifiedUserCompanyId");
                    var userId = ((Number) parameters[2]).longValue();
                    var userCompanyId = ((Number) parameters[3]).longValue();
                    assertThat(userCompanyId).isEqualTo(userId == 501L ? 81L : 82L);
                    return List.of(Map.of(
                        "id", userId == 501L ? 301L : 302L,
                        "owner", userId));
                }
                return List.of();
            });

        var first = service.employeeMovements("shared-fund-token", 7L, 501L);
        var second = service.employeeMovements("shared-fund-token", 7L, 502L);

        assertThat(first.get("recent_receipts").toString()).contains("301").doesNotContain("302");
        assertThat(first.get("expenses").toString()).contains("301").doesNotContain("302");
        assertThat(second.get("recent_receipts").toString()).contains("302").doesNotContain("301");
        assertThat(second.get("expenses").toString()).contains("302").doesNotContain("301");
        assertThat(first.get("income_movements")).isEqualTo(List.of());
        assertThat(second.get("income_movements")).isEqualTo(List.of());
        assertThat(org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations())
            .noneMatch(invocation -> String.valueOf((Object) invocation.getArgument(0))
                .contains("FROM finance_petty_cash_movements"));
    }

    private ResultSet employeeRow(long userId) throws Exception {
        var row = mock(ResultSet.class);
        when(row.getLong("user_company_id")).thenReturn(userId == 501L ? 81L : 82L);
        when(row.getLong("user_id")).thenReturn(userId);
        when(row.getString("user_code")).thenReturn("EMP-" + userId);
        when(row.getString("full_name")).thenReturn("Employee " + userId);
        when(row.getString("position_title")).thenReturn("Operator");
        when(row.getString("department")).thenReturn("Operations");
        when(row.getString("status")).thenReturn("active");
        return row;
    }

    private PettyCashFundRecord sharedFund() {
        var now = Instant.now();
        return new PettyCashFundRecord(
            31L, 7L, null, null, null, null, null, null, null,
            PettyCashFundType.EXTERNAL_MANAGED,
            "Shared fund", "MXN", new BigDecimal("1000.00"), new BigDecimal("750.00"),
            25, "Cash", null, null, null, null, null, null, null, null, true,
            "[]", "[]", true, false,
            null, "shared-fund-token", PettyCashFundStatus.OPEN,
            1L, 1L, now, now, null, 1L, "{}", "{}",
            null, null, null, null);
    }
}
