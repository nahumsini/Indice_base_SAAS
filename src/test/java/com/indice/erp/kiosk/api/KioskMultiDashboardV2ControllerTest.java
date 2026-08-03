package com.indice.erp.kiosk.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskMultiDashboardService;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class KioskMultiDashboardV2ControllerTest {

    private final KioskInternalRequestGuard guard = mock(KioskInternalRequestGuard.class);
    private final KioskEngineFeatureFlags flags = mock(KioskEngineFeatureFlags.class);
    private final KioskMultiDashboardService dashboard = mock(KioskMultiDashboardService.class);
    private final HttpSession session = mock(HttpSession.class);
    private final AuthSessionUser employee = new AuthSessionUser(8L, 20L, 42L, "Employee", "user");
    private KioskMultiDashboardV2Controller controller;

    @BeforeEach
    void setUp() {
        when(flags.registryEnabled()).thenReturn(true);
        when(flags.sessionsEnabled()).thenReturn(true);
        when(flags.employeeCenterEnabled()).thenReturn(true);
        controller = new KioskMultiDashboardV2Controller(
            guard, flags, dashboard, new KioskV2ResponseFactory());
    }

    @Test
    void listsOnlyTheEffectiveEmployeeCatalogForTheAuthenticatedUser() {
        var items = List.<Map<String, Object>>of(Map.of(
            "id", 11L, "module", "PROCESS_TASKS", "availability", "AVAILABLE"));
        when(guard.requireAuthenticated(session)).thenReturn(employee);
        when(dashboard.list(employee)).thenReturn(items);

        var response = controller.list(session);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(dashboard).list(employee);
    }

    @Test
    void opensAWorkspaceWithTheBrowserBoundEngineSession() {
        when(session.getId()).thenReturn("browser-session");
        when(guard.requireAuthenticated(session)).thenReturn(employee);
        when(dashboard.workspace(employee, 11L, "engine-token", "browser-session"))
            .thenReturn(Map.of(
                "experience_status", "READY",
                "session", Map.of("id", "session-id")));

        var response = controller.workspace(session, "engine-token", 11L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(dashboard).workspace(employee, 11L, "engine-token", "browser-session");
    }
}
