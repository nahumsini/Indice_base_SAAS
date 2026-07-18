package com.indice.erp.kiosk.api;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskLifecycleCoordinator;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class KioskCenterV2ControllerTest {

    private final KioskInternalRequestGuard guard = mock(KioskInternalRequestGuard.class);
    private final KioskEngineFeatureFlags flags = mock(KioskEngineFeatureFlags.class);
    private final KioskCenterService center = mock(KioskCenterService.class);
    private final KioskRegistryService registry = mock(KioskRegistryService.class);
    private final KioskLifecycleCoordinator lifecycle = mock(KioskLifecycleCoordinator.class);
    private final HttpSession session = mock(HttpSession.class);
    private final AuthSessionUser user = new AuthSessionUser(7L, 20L, "Admin", "superadmin");
    private KioskCenterV2Controller controller;

    @BeforeEach
    void setUp() {
        when(flags.registryEnabled()).thenReturn(true);
        when(flags.auditEnabled()).thenReturn(true);
        when(flags.globalCenterEnabled()).thenReturn(true);
        controller = new KioskCenterV2Controller(
            guard, flags, center, registry, lifecycle, new KioskV2ResponseFactory());
    }

    @Test
    void readsTenantBoundHistoricalAuditAfterPhysicalDeletion() {
        var historicalItems = List.<Map<String, Object>>of(Map.of(
            "event_type", "KIOSK_DELETED", "snapshot", Map.of("name", "Portal")));
        when(guard.requireCenterRead(session)).thenReturn(user);
        when(center.audit(20L, 91L)).thenThrow(new KioskUnavailableException());
        when(center.auditHistorical(20L, 91L)).thenReturn(historicalItems);

        var response = controller.audit(session, 91L);

        assertThat(items(response.getBody())).isEqualTo(historicalItems);
        verify(center).auditHistorical(20L, 91L);
        verify(center, never()).auditHistorical(21L, 91L);
    }

    @Test
    void keepsLiveAuditOnTheCurrentDefinitionPath() {
        var liveItems = List.<Map<String, Object>>of(Map.of("event_type", "KIOSK_DISABLED"));
        when(guard.requireCenterRead(session)).thenReturn(user);
        when(center.audit(20L, 91L)).thenReturn(liveItems);

        var response = controller.audit(session, 91L);

        assertThat(items(response.getBody())).isEqualTo(liveItems);
        verify(center, never()).auditHistorical(20L, 91L);
    }

    @Test
    void delegatesLifecycleWithoutARegistryOnlyFallback() {
        var definition = definition();
        when(guard.requireCenterWrite(session, "csrf")).thenReturn(user);
        when(registry.requireById(20L, 10L)).thenReturn(definition);
        when(center.detail(20L, 10L)).thenReturn(Map.of("status", "DISABLED"));

        controller.disable(session, "csrf", 10L, Map.of("reason", " maintenance "));

        verify(lifecycle).transition(
            definition, 7L, KioskDefinitionStatus.DISABLED, " maintenance ");
        verify(registry, never()).transitionById(
            20L, 10L, KioskDefinitionStatus.DISABLED, 7L, " maintenance ");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> items(Object responseBody) {
        var body = (Map<String, Object>) responseBody;
        var data = (Map<String, Object>) body.get("data");
        return (List<Map<String, Object>>) data.get("items");
    }

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            10L, 20L, "SALES", "public_catalog", 91L, "CAT-01", "Catalog",
            KioskDefinitionStatus.ACTIVE, null, null, null, KioskAccessLevel.PUBLIC,
            null, "hint", false, 1, 1);
    }
}
