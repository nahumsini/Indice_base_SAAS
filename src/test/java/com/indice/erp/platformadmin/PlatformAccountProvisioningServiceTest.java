package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.signup.BillingSignupService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class PlatformAccountProvisioningServiceTest {

    @Mock
    private JdbcTemplate jdbc;
    @Mock
    private PlatformAdminAccessService access;
    @Mock
    private PlatformAuditService audit;
    @Mock
    private CourtesyCodeService courtesyCodes;
    @Mock
    private BillingSignupService signup;

    private PlatformAccountProvisioningService service;

    @BeforeEach
    void setUp() {
        service = new PlatformAccountProvisioningService(jdbc, access, audit, courtesyCodes, signup);
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void createsTheOwnerThroughTheAuditedCourtesyProvisioningFlow() {
        when(signup.provisioningEnabled()).thenReturn(true);
        var createdRow = new LinkedHashMap<String, Object>();
        createdRow.put("company_id", 44L);
        createdRow.put("company_name", "Demo Norte");
        createdRow.put("owner_user_id", 88L);
        createdRow.put("owner_email", "demo.norte@example.com");
        createdRow.put("owner_membership_id", 99L);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .thenReturn(List.of(), List.of(createdRow));
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class))).thenReturn(0L);
        when(courtesyCodes.create(eq(9L), eq("account-request-1:access"), any()))
            .thenReturn(Map.of("code", "IND-DEMO-SAFE-CODE"));
        when(signup.createCheckout(any(), eq("account-request-1:signup")))
            .thenReturn(new BillingSignupService.SignupCheckoutResponse(
                "signup-ref", "COURTESY_COMPLETED", null, null, null, false, true
            ));

        var result = service.create(9L, "account-request-1", request("DemoSegura2026!"));

        assertThat(result).containsEntry("company_id", 44L).containsEntry("replayed", false);
        verify(access).require(9L, "PLATFORM_ACCOUNTS_WRITE");
        verify(courtesyCodes).create(eq(9L), eq("account-request-1:access"), any());
        verify(signup).createCheckout(any(), eq("account-request-1:signup"));

        var detail = ArgumentCaptor.forClass(Map.class);
        verify(audit).record(eq(9L), eq("COMPANY_ACCOUNT_CREATED"), eq("COMPANY"), eq("44"), eq(44L), eq("SUCCESS"), detail.capture());
        assertThat(detail.getValue()).doesNotContainKeys("temporary_password", "password");
        assertThat(detail.getValue().toString()).doesNotContain("DemoSegura2026!");
    }

    @Test
    void rejectsWeakTemporaryPasswordsBeforeCreatingCommercialAccess() {
        when(signup.provisioningEnabled()).thenReturn(true);

        assertThatThrownBy(() -> service.create(9L, "account-request-2", request("weak")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("at least 10 characters");

        verify(courtesyCodes, never()).create(anyLong(), anyString(), any());
        verify(signup, never()).createCheckout(any(), anyString());
    }

    private PlatformAccountProvisioningService.CreateAccountRequest request(String password) {
        return new PlatformAccountProvisioningService.CreateAccountRequest(
            "Demo Norte",
            "Dirección Demo",
            "demo.norte@example.com",
            password,
            "MX",
            "+52 81 0000 0000",
            "Servicios",
            "1-10",
            List.of("basic_hr", "basic_process_tasks"),
            2,
            30,
            false
        );
    }
}
