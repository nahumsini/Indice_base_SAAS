package com.indice.erp.ai.business;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.access.AiToolUsageAuditService;
import com.indice.erp.auth.AuthSessionUser;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AiToolBusinessApiControllerTest {

    private static final String AUTHORIZATION = "Bearer delegated-token";
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Owner", "admin");

    private AiAccessTokenService tokenService;
    private AiToolAuthorizationService authorizationService;
    private AiBusinessSnapshotService snapshotService;
    private AiToolUsageAuditService auditService;
    private AiToolBusinessApiController controller;
    private com.indice.erp.kpis.KpiRequestAccessService kpiAccess;

    @BeforeEach
    void setUp() {
        tokenService = mock(AiAccessTokenService.class);
        authorizationService = mock(AiToolAuthorizationService.class);
        snapshotService = mock(AiBusinessSnapshotService.class);
        auditService = mock(AiToolUsageAuditService.class);
        kpiAccess = mock(com.indice.erp.kpis.KpiRequestAccessService.class);
        when(kpiAccess.central(USER, "kpis", null, null)).thenReturn(new com.indice.erp.kpis.KpiRequestAccessService.Selection(null, null));
        controller = new AiToolBusinessApiController(tokenService, authorizationService, snapshotService, auditService, kpiAccess);
    }

    @Test
    void derivesCompanyAndUserOnlyFromTheDelegatedToken() {
        authenticate();
        when(authorizationService.canReadBusinessSnapshot(USER)).thenReturn(true);
        var params = Map.of("period", "monthly", "preferredCurrency", "MXN");
        var snapshot = snapshot();
        when(snapshotService.get(23L, 3L, params)).thenReturn(snapshot);

        var response = controller.snapshot(AUTHORIZATION, "monthly", null, null, "MXN");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isSameAs(snapshot);
        verify(snapshotService).get(23L, 3L, params);
        verify(auditService).recordRead(
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq("get_business_snapshot"),
            org.mockito.ArgumentMatchers.eq("SUCCESS"),
            org.mockito.ArgumentMatchers.eq(200)
        );
    }

    @Test
    void delegatedSnapshotForcesTheCurrentOrganizationalScope() {
        authenticate();
        when(authorizationService.canReadBusinessSnapshot(USER)).thenReturn(true);
        when(kpiAccess.central(USER, "kpis", null, null)).thenReturn(new com.indice.erp.kpis.KpiRequestAccessService.Selection(11L, 12L));
        var scoped = Map.of("period", "monthly", "unitId", "11", "businessId", "12");
        when(snapshotService.get(23L, 3L, scoped)).thenReturn(snapshot());
        assertThat(controller.snapshot(AUTHORIZATION, "monthly", null, null, null).getStatusCode().value()).isEqualTo(200);
        verify(snapshotService).get(23L, 3L, scoped);
    }

    @Test
    void deniesTheRequestBeforeReadingDataWhenCurrentPermissionsAreMissing() {
        authenticate();
        when(authorizationService.canReadBusinessSnapshot(USER)).thenReturn(false);

        var response = controller.snapshot(AUTHORIZATION, "monthly", null, null, "MXN");

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(snapshotService, never()).get(org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyMap());
    }

    private void authenticate() {
        var stored = new AiAccessTokenRepository.StoredToken(
            91L,
            USER,
            Set.of(AiAccessTokenService.BUSINESS_SNAPSHOT_READ)
        );
        when(tokenService.authenticate(AUTHORIZATION, AiAccessTokenService.BUSINESS_SNAPSHOT_READ))
            .thenReturn(Optional.of(stored));
    }

    private AiBusinessSnapshotResponse snapshot() {
        return new AiBusinessSnapshotResponse(
            new AiBusinessSnapshotResponse.Range(
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-31"),
                "monthly"
            ),
            new AiBusinessSnapshotResponse.Context(
                "MXN",
                Instant.parse("2026-08-31T18:00:00Z"),
                "Empresa completa"
            ),
            new AiBusinessSnapshotResponse.Summary(
                1234.56,
                0,
                140,
                0,
                0,
                0,
                0,
                1094.56,
                88.66,
                0,
                0,
                0,
                100,
                0,
                40,
                true,
                false
            ),
            List.of()
        );
    }
}
