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
import com.indice.erp.billing.signup.BillingSignupRequest;
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
            .thenReturn(
                List.of(),
                List.of(createdRow),
                List.of(
                    new PlatformAccountProvisioningService.AppliedProduct("basic_hr", "Recursos Humanos"),
                    new PlatformAccountProvisioningService.AppliedProduct("basic_process_tasks", "Tareas y Procesos")
                )
            );
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class))).thenReturn(0L);
        when(courtesyCodes.create(eq(9L), eq("account-request-1:access"), any()))
            .thenReturn(Map.of("code", "IND-DEMO-SAFE-CODE"));
        when(signup.createCheckout(any(), eq("account-request-1:signup")))
            .thenReturn(new BillingSignupService.SignupCheckoutResponse(
                "signup-ref", "COURTESY_COMPLETED", null, null, null, false, true
            ));

        var result = service.create(9L, "account-request-1", request("DemoSegura2026!", "DISTRIBUTOR"));

        assertThat(result)
            .containsEntry("company_id", 44L)
            .containsEntry("user_type", "DISTRIBUTOR")
            .containsEntry("replayed", false)
            .containsEntry("modules_applied", true)
            .containsEntry("employee_count", 7)
            .containsEntry("included_seats", 5)
            .containsEntry("extra_seats", 2)
            .containsEntry("product_codes", List.of("basic_hr", "basic_process_tasks"));
        verify(access).require(9L, "PLATFORM_ACCOUNTS_WRITE");
        verify(courtesyCodes).create(eq(9L), eq("account-request-1:access"), any());
        verify(signup).createCheckout(any(), eq("account-request-1:signup"));
        verify(jdbc).update(
            anyString(),
            eq("DISTRIBUTOR"),
            eq(9L),
            eq(44L)
        );
        assertThat(result)
            .containsEntry("creation_origin", "PLATFORM_ADMIN")
            .containsEntry("created_by_user_id", 9L);

        var detail = ArgumentCaptor.forClass(Map.class);
        verify(audit).record(eq(9L), eq("COMPANY_ACCOUNT_CREATED"), eq("COMPANY"), eq("44"), eq(44L), eq("SUCCESS"), detail.capture());
        assertThat(detail.getValue()).doesNotContainKeys("temporary_password", "password");
        assertThat(detail.getValue().toString()).doesNotContain("DemoSegura2026!");

        var signupRequest = ArgumentCaptor.forClass(BillingSignupRequest.class);
        verify(signup).createCheckout(signupRequest.capture(), eq("account-request-1:signup"));
        assertThat(signupRequest.getValue().companySize()).isEqualTo("7");
        assertThat(signupRequest.getValue().extraSeats()).isEqualTo(2);
    }

    @Test
    void rejectsWeakTemporaryPasswordsBeforeCreatingCommercialAccess() {
        when(signup.provisioningEnabled()).thenReturn(true);

        assertThatThrownBy(() -> service.create(9L, "account-request-2", request("weak", "SUPER_ADMIN")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("at least 10 characters");

        verify(courtesyCodes, never()).create(anyLong(), anyString(), any());
        verify(signup, never()).createCheckout(any(), anyString());
    }

    @Test
    void refusesToGrantRootThroughTheCommercialAccountFlow() {
        when(signup.provisioningEnabled()).thenReturn(true);

        assertThatThrownBy(() -> service.create(9L, "account-request-root", request("DemoSegura2026!", "ROOT")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("SUPER_ADMIN or DISTRIBUTOR");

        verify(courtesyCodes, never()).create(anyLong(), anyString(), any());
        verify(signup, never()).createCheckout(any(), anyString());
    }

    @Test
    void restrictsNewAccountTrialsToSevenFifteenOrThirtyDays() {
        when(signup.provisioningEnabled()).thenReturn(true);

        assertThatThrownBy(() -> service.create(
            9L,
            "account-request-60-days",
            request("DemoSegura2026!", "SUPER_ADMIN", 60)
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("7, 15 or 30");

        verify(courtesyCodes, never()).create(anyLong(), anyString(), any());
        verify(signup, never()).createCheckout(any(), anyString());
    }

    @Test
    void rejectsASeatQuantityThatDoesNotMatchTheExactEmployeeCount() {
        when(signup.provisioningEnabled()).thenReturn(true);
        var request = request("DemoSegura2026!", "SUPER_ADMIN");
        var inconsistent = new PlatformAccountProvisioningService.CreateAccountRequest(
            request.company_name(), request.owner_name(), request.owner_email(),
            request.temporary_password(), request.country_code(), request.phone(),
            request.industry(), request.company_size(), 20, request.account_type(),
            request.product_codes(), 2, request.access_days(), request.permanent()
        );

        assertThatThrownBy(() -> service.create(9L, "account-seat-mismatch", inconsistent))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("must match the exact employee count");

        verify(courtesyCodes, never()).create(anyLong(), anyString(), any());
        verify(signup, never()).createCheckout(any(), anyString());
    }

    private PlatformAccountProvisioningService.CreateAccountRequest request(String password, String accountType) {
        return request(password, accountType, 30);
    }

    private PlatformAccountProvisioningService.CreateAccountRequest request(
        String password,
        String accountType,
        int accessDays
    ) {
        return new PlatformAccountProvisioningService.CreateAccountRequest(
            "Demo Norte",
            "Dirección Demo",
            "demo.norte@example.com",
            password,
            "MX",
            "+52 81 0000 0000",
            "Servicios",
            "7",
            7,
            accountType,
            List.of("basic_hr", "basic_process_tasks"),
            2,
            accessDays,
            false
        );
    }
}
